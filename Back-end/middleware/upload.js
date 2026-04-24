const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinaryConfig");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = "general";
    if (file.fieldname === "image") folder = "avatars";
    else if (file.fieldname === "avatar") folder = "group_avatars";
    else if (file.fieldname === "media") folder = "status";
    else if (file.fieldname === "voice") folder = "voice_messages";
    else if (file.fieldname === "file") folder = "files";

    return {
      folder: `connectalk/${folder}`,
      allowed_formats: [
        "jpg",
        "png",
        "jpeg",
        "gif",
        "webp",
        "mp4",
        "webm",
        "pdf",
        "doc",
        "docx",
        "txt",
        "mpeg",
        "wav",
        "ogg",
      ],
      resource_type: "auto",
    };
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "audio/mpeg",
      "audio/webm",
      "audio/wav",
      "audio/ogg",
    ];
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("File type not allowed"), false);
  },
});

module.exports = upload;
