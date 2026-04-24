const express = require("express");
const router = express.Router();
const PinnedMessage = require("../models/PinnedMessage");
const Message = require("../models/Message");
const GroupMessage = require("../models/GroupMessage");
const authenticate = require("../middleware/authentication");

// Pin a message
router.post("/pin", authenticate, async (req, res) => {
  try {
    const { messageId, messageType, chatId, chatType } = req.body;
    // Verify message exists
    if (messageType === "Message") {
      const msg = await Message.findById(messageId);
      if (!msg) return res.status(404).json({ message: "Message not found" });
      if (
        msg.from.toString() !== req.user._id.toString() &&
        msg.to.toString() !== req.user._id.toString()
      ) {
        return res
          .status(403)
          .json({ message: "Not authorized to pin this message" });
      }
    } else {
      const msg = await GroupMessage.findById(messageId);
      if (!msg) return res.status(404).json({ message: "Message not found" });
      const group = await Group.findById(msg.groupId);
      if (!group.members.includes(req.user._id)) {
        return res.status(403).json({ message: "Not a member of this group" });
      }
    }
    // Check if already pinned
    const existing = await PinnedMessage.findOne({
      messageId,
      messageType,
      chatId,
      chatType,
    });
    if (existing) {
      return res.status(400).json({ message: "Message already pinned" });
    }
    const pinned = new PinnedMessage({
      messageId,
      messageType,
      chatId,
      chatType,
      pinnedBy: req.user._id,
    });
    await pinned.save();
    res.status(201).json(pinned);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error pinning message" });
  }
});

// Unpin a message
router.delete("/unpin/:pinnedId", authenticate, async (req, res) => {
  try {
    const pinned = await PinnedMessage.findById(req.params.pinnedId);
    if (!pinned)
      return res.status(404).json({ message: "Pinned message not found" });
    // Check if user is allowed to unpin (pinner or admin in group? For simplicity, only pinner can unpin)
    if (pinned.pinnedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await pinned.deleteOne();
    res.json({ message: "Unpinned" });
  } catch (err) {
    res.status(500).json({ message: "Error unpinning" });
  }
});

// Get pinned messages for a chat
router.get("/:chatId/:chatType", authenticate, async (req, res) => {
  try {
    const { chatId, chatType } = req.params;
    const pinned = await PinnedMessage.find({ chatId, chatType })
      .populate("pinnedBy", "username image")
      .sort({ pinnedAt: -1 });
    // Populate message content based on messageType
    const enriched = await Promise.all(
      pinned.map(async (p) => {
        let message = null;
        if (p.messageType === "Message") {
          message = await Message.findById(p.messageId).populate(
            "from",
            "username image"
          );
        } else {
          message = await GroupMessage.findById(p.messageId).populate(
            "from",
            "username image"
          );
        }
        return {
          ...p.toObject(),
          message,
        };
      })
    );
    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching pinned messages" });
  }
});

module.exports = router;
