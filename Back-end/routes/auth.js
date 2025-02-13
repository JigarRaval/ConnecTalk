const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const upload = require("../middleware/upload");
const router = express.Router();
const User = require("../models/User");
const authenticate = require("../middleware/authentication");
const Message = require("../models/Message");
const fs = require("fs");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET;
const backend = process.env.BACKEND;

router.post("/register", upload.single("image"), async (req, res) => {
  const { username, password } = req.body;

  try {
    const imageUrl = req.file
      ? `${backend}/uploads/${req.file.filename}`
      : null;
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: "Username already taken" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      image: imageUrl,
    });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ message: "Error registering user" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }
    if (!JWT_SECRET) {
      console.error("JWT_SECRET is undefined. Check your .env file.");
      return res
        .status(500)
        .json({ message: "Server error: JWT secret is missing" });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({
      token,
      userId: user._id,
      username: user.username,
      image: user.image,
    });
  } catch (err) {
    console.error("Error logging in user:", err);
    res.status(500).json({ message: "Error logging in user" });
  }
});

router.get("/users", authenticate, async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select(
      "username image"
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error getting users" });
  }
});

router.get("/messages/:userId/:selectedUserId", async (req, res) => {
  const { userId, selectedUserId } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { from: userId, to: selectedUserId },
        { from: selectedUserId, to: userId },
      ],
    })

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error getting messages" });
  }
});

router.delete(
  "/messages/:userId/:selectedUserId",
  authenticate,
  async (req, res) => {
    const { userId, selectedUserId } = req.params;
    try {
      const result = await Message.deleteMany({
        $or: [
          { from: userId, to: selectedUserId },
          { from: selectedUserId, to: userId },
        ],
      });

      if (result.deletedCount > 0) {
        req.app.get("io").emit("messages_deleted", { userId, selectedUserId });
        res.status(200).json({ message: "All messages deleted successfully" });
      } else {
        res.status(404).json({ message: "No messages found" });
      }
    } catch (err) {
      res.status(500).json({ message: "Error deleting messages" });
    }
  }
);

module.exports = router;
