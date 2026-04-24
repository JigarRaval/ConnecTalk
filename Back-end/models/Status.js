const mongoose = require("mongoose");
const { normalizeStoredUploadValue } = require("../utils/uploadPaths");

const statusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mediaUrl: { type: String, default: null },
  mediaType: {
    type: String,
    enum: ["image", "video", "text"],
    default: "text",
  },
  text: { type: String, default: "" },
  viewers: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      viewedAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  }, // 24 hours
});

// TTL index on expiresAt (auto-delete)
statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const serializeStatus = (_doc, ret) => {
  if (!ret) return ret;

  ret.mediaUrl = normalizeStoredUploadValue(ret.mediaUrl);
  return ret;
};

statusSchema.set("toJSON", { transform: serializeStatus });
statusSchema.set("toObject", { transform: serializeStatus });

const Status = mongoose.model("Status", statusSchema);
module.exports = Status;
