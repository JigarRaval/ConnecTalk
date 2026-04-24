const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const upload = require("../middleware/upload");
const router = express.Router();
const User = require("../models/User");
const Message = require("../models/Message");
const authenticate = require("../middleware/authentication");
const {
  getStoredUploadValue,
  normalizeStoredUploadValue,
} = require("../utils/uploadPaths");
const fs = require("fs");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const backend = process.env.BACKEND;
// Upload voice message (returns file URL)
// router.post(
//   "/upload-voice",
//   authenticate,
//   upload.single("voice"),
//   async (req, res) => {
//     try {
//       if (!req.file) {
//         return res.status(400).json({ message: "No voice file uploaded" });
//       }
//       // For local storage, return the relative path (e.g., "filename.mp3")
//       const voiceUrl = req.file.filename; // just the filename
//       res.json({ voiceUrl, fileType: req.file.mimetype });
//     } catch (err) {
//       console.error("Voice upload error:", err);
//       res.status(500).json({ message: "Error uploading voice message" });
//     }
//   }
// );

// ========== AUTHENTICATION ==========
router.post("/register", upload.single("image"), async (req, res) => {
  const { username, password } = req.body;

  try {
    const imageUrl = getStoredUploadValue(req.file);

    const existingUser = await User.findOne({ username });
    // if (existingUser) {
    //   if (req.file) fs.unlinkSync(req.file.path);
    //   return res.status(400).json({ message: "Username already taken" });
    // }
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      image: imageUrl,
      bio: "",
      online: false,
      friends: [],
      friendRequests: [],
      blockedUsers: [],
    });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ message: "Error registering user" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });
    if (!JWT_SECRET) {
      console.error("JWT_SECRET is undefined");
      return res
        .status(500)
        .json({ message: "Server error: JWT secret missing" });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "24h",
    });
    res.json({
      token,
      userId: user._id,
      username: user.username,
      image: normalizeStoredUploadValue(user.image),
      bio: user.bio,
    });
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ message: "Error logging in" });
  }
});
// Upload voice message (returns file URL)
router.post(
  "/upload-voice",
  authenticate,
  upload.single("voice"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No voice file uploaded" });
      }
      // For local storage, req.file.filename is the saved filename
      const voiceUrl = req.file.filename;
      res.json({ voiceUrl, fileType: req.file.mimetype });
    } catch (err) {
      console.error("Voice upload error:", err);
      res.status(500).json({ message: "Error uploading voice message" });
    }
  }
);

// Upload general file (image, document, video)
router.post(
  "/upload-file",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      // For local storage, return the filename
      const fileUrl = req.file.filename;
      const fileType = req.file.mimetype;
      res.json({ fileUrl, fileType, originalName: req.file.originalname });
    } catch (err) {
      console.error("File upload error:", err);
      res.status(500).json({ message: "Error uploading file" });
    }
  }
);
// ========== USER PROFILE ==========
router.get("/profile/:userId", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile" });
  }
});

router.put(
  "/profile",
  authenticate,
  upload.single("image"),
  async (req, res) => {
    try {
      const { username, bio } = req.body;
      const updateData = {};
      if (username) updateData.username = username;
      if (bio !== undefined) updateData.bio = bio;
      if (req.file) updateData.image = getStoredUploadValue(req.file);

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true }
      ).select("-password");
      res.json(updatedUser);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error updating profile" });
    }
  }
);

// ========== FRIEND SYSTEM ==========
router.get("/users", authenticate, async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select(
      "username image bio online lastSeen"
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error getting users" });
  }
});

// Send friend request
router.post("/friend-request/:toUserId", authenticate, async (req, res) => {
  try {
    const fromUserId = req.user._id;
    const toUserId = req.params.toUserId;

    if (fromUserId.toString() === toUserId) {
      return res
        .status(400)
        .json({ message: "Cannot send request to yourself" });
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) return res.status(404).json({ message: "User not found" });

    // Check if already friends
    if (toUser.friends.includes(fromUserId)) {
      return res.status(400).json({ message: "Already friends" });
    }

    // Check if request already pending
    const existingRequest = toUser.friendRequests.find(
      (req) =>
        req.from.toString() === fromUserId.toString() &&
        req.status === "pending"
    );
    if (existingRequest) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    toUser.friendRequests.push({ from: fromUserId, status: "pending" });
    await toUser.save();

    // Emit real-time notification if recipient is online
    const io = req.app.get("io");
    io.to(toUserId).emit("friend_request_received", { from: fromUserId });

    res.json({ message: "Friend request sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending friend request" });
  }
});

// Accept / reject friend request
router.put(
  "/friend-request/:requestId/:action",
  authenticate,
  async (req, res) => {
    try {
      const { requestId, action } = req.params;
      const userId = req.user._id;

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const requestIndex = user.friendRequests.findIndex(
        (r) => r._id.toString() === requestId
      );
      if (requestIndex === -1)
        return res.status(404).json({ message: "Request not found" });

      if (action === "accept") {
        const friendId = user.friendRequests[requestIndex].from;
        // Add to each other's friends list
        user.friends.push(friendId);
        user.friendRequests.splice(requestIndex, 1);
        await user.save();

        const friendUser = await User.findById(friendId);
        if (friendUser && !friendUser.friends.includes(userId)) {
          friendUser.friends.push(userId);
          await friendUser.save();
        }

        const io = req.app.get("io");
        io.to(friendId.toString()).emit("friend_request_accepted", {
          by: userId,
        });

        res.json({ message: "Friend request accepted" });
      } else if (action === "reject") {
        user.friendRequests.splice(requestIndex, 1);
        await user.save();
        res.json({ message: "Friend request rejected" });
      } else {
        res.status(400).json({ message: "Invalid action" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error processing request" });
    }
  }
);

// Get friends list
router.get("/friends", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "friends",
      "username image bio online lastSeen"
    );
    res.json(user.friends);
  } catch (err) {
    res.status(500).json({ message: "Error fetching friends" });
  }
});

// Get pending friend requests
router.get("/friend-requests", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "friendRequests.from",
      "username image"
    );
    const pending = user.friendRequests.filter((r) => r.status === "pending");
    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: "Error fetching requests" });
  }
});

// ========== MESSAGES ==========
router.get("/messages/:userId/:selectedUserId", async (req, res) => {
  const { userId, selectedUserId } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { from: userId, to: selectedUserId },
        { from: selectedUserId, to: userId },
      ],
      deleted: { $ne: true }, // exclude soft-deleted messages
    }).sort({ timestamp: 1 });
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

// Search messages (by content)
router.get(
  "/search-messages/:userId/:otherUserId",
  authenticate,
  async (req, res) => {
    const { userId, otherUserId } = req.params;
    const { query } = req.query;
    if (!query)
      return res.status(400).json({ message: "Query parameter required" });
    try {
      const messages = await Message.find({
        $or: [
          { from: userId, to: otherUserId },
          { from: otherUserId, to: userId },
        ],
        content: { $regex: query, $options: "i" },
      })
        .sort({ timestamp: -1 })
        .limit(50);
      res.json(messages);
    } catch (err) {
      res.status(500).json({ message: "Error searching messages" });
    }
  }
);

// ========== ONLINE STATUS ==========
router.get("/online-status/:userId", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "online lastSeen"
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching status" });
  }
});

// Remove friend
router.delete("/friend/:friendId", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const friendId = req.params.friendId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.friends.includes(friendId)) {
      return res.status(400).json({ message: "Not friends" });
    }

    user.friends = user.friends.filter((id) => id.toString() !== friendId);
    await user.save();

    const friend = await User.findById(friendId);
    if (friend) {
      friend.friends = friend.friends.filter(
        (id) => id.toString() !== userId.toString()
      );
      await friend.save();
    }

    const io = req.app.get("io");
    io.to(friendId.toString()).emit("friend_removed", { by: userId });

    res.json({ message: "Friend removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error removing friend" });
  }
});
module.exports = router;
