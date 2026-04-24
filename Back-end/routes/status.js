const express = require("express");
const router = express.Router();
const Status = require("../models/Status");
const User = require("../models/User");
const authenticate = require("../middleware/authentication");
const upload = require("../middleware/upload");
const { getStoredUploadValue } = require("../utils/uploadPaths");

router.post(
  "/create",
  authenticate,
  upload.single("media"),
  async (req, res) => {
    try {
      console.log("📝 Create status - User ID:", req.user._id);
      console.log("📝 File received:", req.file);
      if (!req.file) {
        return res.status(400).json({ message: "No media file uploaded" });
      }
      const mediaUrl = getStoredUploadValue(req.file);
      const mediaType = req.file.mimetype.startsWith("image/")
        ? "image"
        : "video";
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      console.log("📝 Expires at:", expiresAt);

      const status = new Status({
        user: req.user._id,
        mediaUrl,
        mediaType,
        expiresAt,
      });
      await status.save();
      console.log("✅ Status saved:", status._id);
      res.status(201).json({ message: "Status posted", status });
    } catch (err) {
      console.error("❌ Error posting status:", err);
      res.status(500).json({ message: "Error posting status" });
    }
  }
);

router.get("/friends", authenticate, async (req, res) => {
  try {
    console.log("📋 Fetching statuses for user:", req.user._id);
    const user = await User.findById(req.user._id).populate("friends");
    const friendIds = user.friends.map((f) => f._id);
    friendIds.push(req.user._id);
    console.log(
      "📋 Friend IDs (including self):",
      friendIds.map((id) => id.toString())
    );
    const now = new Date();
    console.log("📋 Current time:", now);
    const statuses = await Status.find({
      user: { $in: friendIds },
      expiresAt: { $gt: now },
    })
      .populate("user", "username image")
      .sort({ createdAt: -1 });
    console.log("📋 Found statuses count:", statuses.length);
    if (statuses.length > 0) {
      console.log("📋 First status:", statuses[0]);
    }
    const grouped = {};
    statuses.forEach((status) => {
      const userId = status.user._id.toString();
      if (!grouped[userId]) {
        grouped[userId] = {
          user: status.user,
          statuses: [],
        };
      }
      grouped[userId].statuses.push(status);
    });
    res.json(Object.values(grouped));
  } catch (err) {
    console.error("❌ Error fetching statuses:", err);
    res.status(500).json({ message: "Error fetching statuses" });
  }
});

router.delete("/:statusId", authenticate, async (req, res) => {
  try {
    const status = await Status.findById(req.params.statusId);
    if (!status) return res.status(404).json({ message: "Status not found" });
    if (status.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await status.deleteOne();
    res.json({ message: "Status deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting status" });
  }
});

module.exports = router;
