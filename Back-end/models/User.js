const mongoose = require("mongoose");
const { normalizeStoredUploadValue } = require("../utils/uploadPaths");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    // New fields for enhanced features
    bio: {
      type: String,
      default: "",
      maxlength: 150,
    },
    online: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    friendRequests: [
      {
        from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const serializeUser = (_doc, ret) => {
  if (!ret) return ret;

  ret.image = normalizeStoredUploadValue(ret.image);
  delete ret.password;
  return ret;
};

userSchema.set("toJSON", { transform: serializeUser });
userSchema.set("toObject", { transform: serializeUser });

const User = mongoose.model("User", userSchema);
module.exports = User;
