const express = require("express");
const router = express.Router();
const accountController = require("../controller/account");
const { loginCheck, isAuth } = require("../middleware/auth");
const multer = require("multer");

// Multer config for profile images (fallback if Cloudinary not used directly)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/profiles");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// All routes are protected
router.use(loginCheck, isAuth);

// Profile
router.get("/profile", accountController.getProfile);
router.put("/profile", accountController.updateProfile);
router.post("/profile-image", upload.single("profileImage"), accountController.uploadProfileImage);

// Addresses
router.get("/addresses", accountController.getAddresses);
router.post("/addresses", accountController.addAddress);
router.put("/addresses/:id", accountController.updateAddress);
router.delete("/addresses/:id", accountController.deleteAddress);
router.put("/addresses/:id/default", accountController.setDefaultAddress);

// Security
router.put("/security/password", accountController.changePassword);

module.exports = router;
