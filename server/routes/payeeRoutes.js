const express = require("express");
const router = express.Router();
const Payee = require("../models/Payee");

// Add payee
router.post("/", async (req, res) => {
  try {
    const { userId, customerName, bankName, accountNumber, ifscCode } = req.body;
    
    const payee = new Payee({
      userId,
      customerName,
      bankName,
      accountNumber,
      ifscCode,
      status: "pending"
    });
    
    await payee.save();
    res.status(201).json({ message: "Payee added successfully", payee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's payees
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const payees = await Payee.find({ userId });
    res.status(200).json(payees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending payees (for admin)
router.get("/pending", async (req, res) => {
  try {
    const payees = await Payee.find({ status: "pending" });
    res.status(200).json(payees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve payee (admin)
router.put("/approve/:payeeId", async (req, res) => {
  try {
    const payeeId = req.params.payeeId;
    const payee = await Payee.findByIdAndUpdate(
      payeeId,
      { status: "approved" },
      { new: true }
    );
    
    if (!payee) {
      return res.status(404).json({ message: "Payee not found" });
    }
    
    res.status(200).json({ message: "Payee approved", payee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;