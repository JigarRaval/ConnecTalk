const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    callType: { type: String, enum: ["audio", "video"], required: true },
    status: {
      type: String,
      enum: ["answered", "missed", "rejected", "outgoing"],
      required: true,
    },
    duration: { type: Number, default: 0 }, // in seconds
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const CallLog = mongoose.model("CallLog", callLogSchema);
module.exports = CallLog;
