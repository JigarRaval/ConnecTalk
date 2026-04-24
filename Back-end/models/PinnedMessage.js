const mongoose = require("mongoose");

const pinnedMessageSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "messageType",
  },
  messageType: {
    type: String,
    enum: ["Message", "GroupMessage"],
    required: true,
  },
  chatId: { type: mongoose.Schema.Types.ObjectId, required: true }, // userId for private, groupId for group
  chatType: { type: String, enum: ["private", "group"], required: true },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  pinnedAt: { type: Date, default: Date.now },
});

// Ensure only one pinned message per chat (optional: allow multiple? We'll allow multiple but order by pinnedAt)
// For simplicity, we allow multiple. But typical apps allow one. We'll keep multiple.

const PinnedMessage = mongoose.model("PinnedMessage", pinnedMessageSchema);
module.exports = PinnedMessage;
