const express = require("express");
const router = express.Router();
const customizeController = require("../controller/customize");
const multer = require("multer");
const { loginCheck, isAdmin } = require("../middleware/auth");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/customize");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Public endpoints
router.get("/get-slide-image", customizeController.getImages);
router.get("/get-settings", customizeController.getCustomizeSettings);
router.get("/payment-settings", customizeController.getPaymentSettings);

// Admin-only endpoints
router.post(
  "/upload-slide-image",
  loginCheck,
  isAdmin,
  upload.single("image"),
  customizeController.uploadSlideImage
);
router.post(
  "/delete-slide-image",
  loginCheck,
  isAdmin,
  customizeController.deleteSlideImage
);
router.post(
  "/dashboard-data",
  loginCheck,
  isAdmin,
  customizeController.getAllData
);
router.post(
  "/update-payment-settings",
  loginCheck,
  isAdmin,
  customizeController.updatePaymentSettings
);
router.post(
  "/update-settings",
  loginCheck,
  isAdmin,
  upload.single("logo"),
  customizeController.updateCustomizeSettings
);

module.exports = router;
