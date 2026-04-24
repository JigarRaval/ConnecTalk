const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true }, // e.g., "👍", "❤️", "😂"
  },
  { timestamps: true }
);

const messageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    // New fields for enhanced features
    read: { type: Boolean, default: false }, // read receipt
    readAt: { type: Date }, // when it was read
    reactions: [reactionSchema], // array of reactions
    edited: { type: Boolean, default: false }, // if message was edited
    editedAt: { type: Date }, // when edited
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    }, // reply to specific message
    fileUrl: { type: String, default: null }, // for image/file sharing
    fileType: { type: String, default: null }, // mime type (image/png, etc.)
    deleted: { type: Boolean, default: false }, // soft delete (for future)
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
