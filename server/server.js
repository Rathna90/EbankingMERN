const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const payeeRoutes = require("./routes/payeeRoutes");

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Database connection
mongoose.connect("mongodb+srv://srathnamca:admin123@cluster0.46uod3z.mongodb.net/Banking?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected successfully"))
.catch(err => console.error("MongoDB connection error:", err));

// Route mounting - THIS IS THE CRITICAL FIX
app.use("/api/users", userRoutes); // All user routes will be prefixed with /api/users
app.use("/api/transactions", transactionRoutes); // All transaction routes prefixed with /api/transactions
app.use("/api/payees", payeeRoutes); // All payee routes prefixed with /api/payees

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Server error' });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));