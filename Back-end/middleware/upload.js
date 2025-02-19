// const multer = require('multer');

// const storage=multer.diskStorage({
//     destination:(req,file,cb)=>{
//         cb(null,'uploads/')
//     },
//     filename:(req,file,cb)=>{
//         cb(null,Date.now() + '-' + file.originalname)
//     }
// })

// const upload=multer({storage})
// module.exports=upload
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinaryConfig");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "upload", // Change folder name if needed
    allowedFormats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

module.exports = upload;
