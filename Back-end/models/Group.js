const mongoose = require("mongoose");
const { normalizeStoredUploadValue } = require("../utils/uploadPaths");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: null, // URL to group image (Cloudinary or local)
    },
    description: {
      type: String,
      default: "",
      maxlength: 200,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const serializeGroup = (_doc, ret) => {
  if (!ret) return ret;

  ret.avatar = normalizeStoredUploadValue(ret.avatar);
  return ret;
};

groupSchema.set("toJSON", { transform: serializeGroup });
groupSchema.set("toObject", { transform: serializeGroup });

const Group = mongoose.model("Group", groupSchema);
module.exports = Group;
