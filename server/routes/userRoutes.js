const express = require("express");
const router = express.Router();
const User = require("../models/User");
// Register
router.post("/register", async (req, res) => {
  const { name, email, phone, username, password, confirmPassword } = req.body;

  try {
    if (password !== confirmPassword) {
      return res.status(400).json({ msg: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ msg: "Username already exists" });

    const newUser = new User({ name, email, phone, username, password });
    await newUser.save();
    res.status(201).json({ msg: "User registered", user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ msg: "Invalid credentials" });

    res.status(200).json({ msg: "Login successful", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile
router.put("/update/:id", async (req, res) => {
  try {
    const { name, email, phone, username } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, username },
      { new: true }
    );
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Get all users (admin only)
router.get("/", async (req, res) => {
    try {
      const users = await User.find({}, { password: 0 }); // Exclude passwords
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
module.exports = router;