const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

let uploadMiddleware = null;

if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "roshinis_ecommerce",
      allowed_formats: ["jpg", "png", "webp", "jpeg"],
      transformation: [{ width: 800, height: 800, crop: "limit", fetch_format: "webp" }],
    },
  });

  uploadMiddleware = multer({ storage: storage });
  console.log("==============Cloudinary CDN Storage Initialized==============");
} else {
  // If no credentials, configure a dummy middleware that errors out clearly
  uploadMiddleware = (req, res, next) => {
    return res.status(500).json({
      error: "Cloudinary credentials missing. File uploads are disabled.",
    });
  };
  uploadMiddleware.any = () => uploadMiddleware;
  uploadMiddleware.single = () => uploadMiddleware;
  uploadMiddleware.array = () => uploadMiddleware;
  
  console.error(
    "[FATAL] Cloudinary keys missing in .env. Image uploads will fail."
  );
}

module.exports = {
  uploadMiddleware,
  cloudinary,
};
