const mongoose = require('mongoose');
const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const Payee = require("../models/Payee");
const User = require("../models/User");
const { parse: json2csv } = require('json2csv');
// Helper function to calculate balance
const calculateBalance = async (userId) => {
    try {
      const result = await Transaction.aggregate([
        { 
          $match: { 
            userId: new mongoose.Types.ObjectId(userId),
            status: "completed",
            $or: [
              { type: "deposit" },
              { type: "withdrawal" },
              { type: "transfer-out" }
            ]
          } 
        },
        { 
          $group: {
            _id: null,
            total: { 
              $sum: { 
                $switch: {
                  branches: [
                    { case: { $eq: ["$type", "deposit"] }, then: "$amount" },
                    { case: { $eq: ["$type", "withdrawal"] }, then: { $multiply: ["$amount", -1] } },
                    { case: { $eq: ["$type", "transfer-out"] }, then: { $multiply: ["$amount", -1] } }
                  ],
                  default: 0
                }
              } 
            }
          }
        }
      ]);
      
      return result[0]?.total || 0;
    } catch (error) {
      console.error("Error calculating balance:", error);
      return 0;
    }
  };
// Deposit money
// In your backend deposit route (transactionRoutes.js)
router.post("/deposit", async (req, res) => {
    try {
      const { userId, amount } = req.body;
      
      if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be positive" });
      }
  
      const transaction = new Transaction({
        userId: new mongoose.Types.ObjectId(userId), // Proper ObjectId conversion
        type: "deposit",
        amount,
        status: "completed"
      });
      
      await transaction.save();
      const balance = await calculateBalance(userId);
      
      res.status(200).json({ 
        success: true,
        message: "Deposit successful",
        balance: balance // Ensure balance is included
      });
    } catch (error) {
      console.error("Deposit error:", error);
      res.status(500).json({ 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
  
  
  // Withdraw money with balance check
router.post("/withdraw", async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    
    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be positive" });
    }

    const balance = await calculateBalance(userId);
    if (balance < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    const transaction = new Transaction({
      userId,
      type: "withdrawal",
      amount,
      reason,
      status: "completed"
    });
    
    await transaction.save();
    const newBalance = await calculateBalance(userId);
    
    res.status(200).json({ 
      message: "Withdrawal successful",
      transaction,
      balance: newBalance 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Transfer money with balance and payee checks
// Transfer money with balance and payee checks
router.post("/transfer", async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      console.log("Transfer request received:", req.body);
      
      const { userId, payeeId, amount } = req.body;
      
      // Validate input
      if (!userId || !payeeId || amount === undefined) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          success: false,
          message: "Missing required fields"
        });
      }

      const transferAmount = parseFloat(amount);
      console.log("Parsed transfer amount:", transferAmount);

      if (isNaN(transferAmount) || transferAmount <= 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          success: false,
          message: "Amount must be a positive number"
        });
      }
  
      // Check payee exists and is approved
      const payee = await Payee.findOne({ 
        _id: payeeId, 
        status: "approved" 
      }).session(session);

      if (!payee) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ 
          success: false,
          message: "Payee not found or not approved"
        });
      }
  
      // Check sender's balance
      const currentBalance = await calculateBalance(userId);
      console.log("Current balance before transfer:", currentBalance);
      
      if (currentBalance < transferAmount) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          success: false,
          message: "Insufficient funds"
        });
      }
  
      // Create and save transactions
      const senderTransaction = new Transaction({
        userId,
        type: "transfer-out",
        amount: transferAmount,
        payeeId,
        status: "completed"
      });
      
      const receiverTransaction = new Transaction({
        userId: payee.userId,
        type: "transfer-in",
        amount: transferAmount,
        relatedUserId: userId,
        status: "completed"
      });
      
      await senderTransaction.save({ session });
      await receiverTransaction.save({ session });
      
      await session.commitTransaction();
      session.endSession();

      // Small delay to ensure transaction is committed
      await new Promise(resolve => setTimeout(resolve, 100));
  
      const newBalance = await calculateBalance(userId);
      console.log("New balance after transfer:", newBalance);
      
      res.status(200).json({ 
        success: true,
        message: "Transfer successful",
        amount: transferAmount,
        balance: newBalance,
        transactionId: senderTransaction._id
      });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Transfer error:", error);
      res.status(500).json({ 
        success: false,
        message: "Transfer failed",
        error: error.message
      });
    }
  });
  // Get transaction history with filters
router.get("/history/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { type, startDate, endDate } = req.query;
  
      const query = { 
        userId: new mongoose.Types.ObjectId(userId),
        status: "completed"
      };
  
      if (type) {
        query.type = type;
      }
  
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }
  
      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .populate('payeeId', 'customerName accountNumber')
        .lean();
  
      res.status(200).json(transactions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Export transactions to CSV
  router.get("/export/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { type, startDate, endDate } = req.query;
  
      const query = { 
        userId: new mongoose.Types.ObjectId(userId),
        status: "completed"
      };
  
      if (type) query.type = type;
      if (startDate) query.createdAt = { $gte: new Date(startDate) };
      if (endDate) query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };
  
      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .populate('payeeId', 'customerName accountNumber')
        .lean();
  
      // Convert to CSV
      const fields = ['createdAt', 'type', 'amount', 'payeeId.customerName', 'payeeId.accountNumber', 'reason'];
      const csv = json2csv.parse(transactions, { fields });
  
      res.header('Content-Type', 'text/csv');
      res.attachment('transactions.csv');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  
// Get user balance
router.get("/balance/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const balance = await calculateBalance(userId);
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.status(200).json({ balance });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  // Get all transactions (admin only)
router.get("/", async (req, res) => {
    try {
      const transactions = await Transaction.find()
        .sort({ createdAt: -1 })
        .populate('userId', 'name email')
        .populate('payeeId', 'customerName')
        .lean();
        
      res.status(200).json(transactions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

module.exports = router;