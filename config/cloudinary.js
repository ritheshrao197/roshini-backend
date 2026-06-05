const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

let uploadMiddleware = null;

// Configure Cloudinary only if credentials are set
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
  // Graceful fallback to local disk storage
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "public/uploads/products");
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "_" + file.originalname);
    },
  });
  uploadMiddleware = multer({ storage: storage });
  console.warn("Cloudinary keys missing in .env. Falling back to local storage uploads.");
}

module.exports = {
  uploadMiddleware,
  cloudinary,
};
