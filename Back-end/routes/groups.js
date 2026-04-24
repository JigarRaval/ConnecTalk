const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const GroupMessage = require("../models/GroupMessage");
const User = require("../models/User");
const authenticate = require("../middleware/authentication");
const upload = require("../middleware/upload");
const { getStoredUploadValue } = require("../utils/uploadPaths");

// ========== CREATE GROUP ==========
router.post(
  "/create",
  authenticate,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const { name, description, members } = req.body;
      const createdBy = req.user._id;

      // Parse members (can be JSON string or array)
      let membersArray = members
        ? Array.isArray(members)
          ? members
          : JSON.parse(members)
        : [];
      // Add creator to members if not already
      if (!membersArray.includes(createdBy.toString())) {
        membersArray.push(createdBy.toString());
      }

      const avatarUrl = getStoredUploadValue(req.file);

      const group = new Group({
        name,
        description: description || "",
        avatar: avatarUrl,
        createdBy,
        members: membersArray,
        admins: [createdBy], // creator is admin
      });

      await group.save();

      // Populate member details for response
      const populatedGroup = await Group.findById(group._id)
        .populate("members", "username image")
        .populate("admins", "username image")
        .populate("createdBy", "username image");

      res.status(201).json(populatedGroup);
    } catch (err) {
      console.error("Error creating group:", err);
      res.status(500).json({ message: "Error creating group" });
    }
  }
);

// ========== GET USER'S GROUPS ==========
router.get("/my-groups", authenticate, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "username image")
      .populate("admins", "username image")
      .populate("createdBy", "username image")
      .sort({ updatedAt: -1 });
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching groups" });
  }
});

// ========== GET GROUP BY ID ==========
router.get("/:groupId", authenticate, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("members", "username image")
      .populate("admins", "username image")
      .populate("createdBy", "username image");

    if (!group) return res.status(404).json({ message: "Group not found" });
    if (
      !group.members.some((m) => m._id.toString() === req.user._id.toString())
    ) {
      return res.status(403).json({ message: "Not a member of this group" });
    }
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Error fetching group" });
  }
});

// ========== GET GROUP MESSAGES ==========
router.get("/:groupId/messages", authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: "Not a member" });
    }

    const messages = await GroupMessage.find({
      groupId,
      deleted: { $ne: true },
    })
      .populate("from", "username image")
      .populate("replyTo")
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages" });
  }
});

// ========== SEND GROUP MESSAGE (HTTP fallback, but will use socket) ==========
// Mainly via socket, but we keep this for API consistency
router.post("/:groupId/messages", authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content, replyTo, fileUrl, fileType } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: "Not a member" });
    }

    const message = new GroupMessage({
      groupId,
      from: req.user._id,
      content,
      replyTo: replyTo || null,
      fileUrl: fileUrl || null,
      fileType: fileType || null,
    });
    await message.save();

    const populated = await GroupMessage.findById(message._id)
      .populate("from", "username image")
      .populate("replyTo");

    // Emit via socket to all group members
    const io = req.app.get("io");
    io.to(`group_${groupId}`).emit("group_message", populated);

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending message" });
  }
});

// ========== ADD MEMBER TO GROUP ==========
router.post("/:groupId/add-member", authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Only admins can add members
    if (!group.admins.includes(req.user._id)) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    if (group.members.includes(userId)) {
      return res.status(400).json({ message: "User already in group" });
    }

    group.members.push(userId);
    await group.save();

    const io = req.app.get("io");
    io.to(`group_${groupId}`).emit("member_added", { groupId, userId });

    res.json({ message: "Member added" });
  } catch (err) {
    res.status(500).json({ message: "Error adding member" });
  }
});

// ========== REMOVE MEMBER FROM GROUP ==========
router.delete(
  "/:groupId/remove-member/:userId",
  authenticate,
  async (req, res) => {
    try {
      const { groupId, userId } = req.params;
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });

      // Only admins or the user themselves can remove
      if (
        !group.admins.includes(req.user._id) &&
        req.user._id.toString() !== userId
      ) {
        return res.status(403).json({ message: "Not authorized" });
      }

      group.members = group.members.filter((m) => m.toString() !== userId);
      if (group.admins.includes(userId)) {
        group.admins = group.admins.filter((a) => a.toString() !== userId);
      }
      await group.save();

      const io = req.app.get("io");
      io.to(`group_${groupId}`).emit("member_removed", { groupId, userId });

      res.json({ message: "Member removed" });
    } catch (err) {
      res.status(500).json({ message: "Error removing member" });
    }
  }
);

// ========== LEAVE GROUP ==========
router.post("/:groupId/leave", authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    group.members = group.members.filter(
      (m) => m.toString() !== req.user._id.toString()
    );
    group.admins = group.admins.filter(
      (a) => a.toString() !== req.user._id.toString()
    );
    await group.save();

    const io = req.app.get("io");
    io.to(`group_${groupId}`).emit("member_left", {
      groupId,
      userId: req.user._id,
    });

    res.json({ message: "Left group" });
  } catch (err) {
    res.status(500).json({ message: "Error leaving group" });
  }
});

// ========== UPDATE GROUP (name, avatar, description) ==========
router.put(
  "/:groupId",
  authenticate,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const { name, description } = req.body;
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });

      if (!group.admins.includes(req.user._id)) {
        return res.status(403).json({ message: "Only admins can edit group" });
      }

      if (name) group.name = name;
      if (description !== undefined) group.description = description;
      if (req.file) group.avatar = getStoredUploadValue(req.file);
      group.updatedAt = Date.now();
      await group.save();

      const updated = await Group.findById(groupId)
        .populate("members", "username image")
        .populate("admins", "username image");

      const io = req.app.get("io");
      io.to(`group_${groupId}`).emit("group_updated", updated);

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Error updating group" });
    }
  }
);

// ========== DELETE GROUP ==========
router.delete("/:groupId", authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Only creator can delete
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only group creator can delete" });
    }

    // Delete all group messages
    await GroupMessage.deleteMany({ groupId });
    await group.deleteOne();

    const io = req.app.get("io");
    io.to(`group_${groupId}`).emit("group_deleted", { groupId });

    res.json({ message: "Group deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting group" });
  }
});

module.exports = router;
