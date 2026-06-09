const express = require("express");
const router = express.Router();
const categoryController = require("../controller/categories");
const multer = require("multer");
const { loginCheck } = require("../middleware/auth");
const { cacheMiddleware, clearCache } = require("../middleware/cache");
const { uploadMiddleware } = require("../config/cloudinary");

// Categories: 1800s TTL (30 minutes)
router.get("/all-category", cacheMiddleware("categories", 1800), categoryController.getAllCategory);

router.post(
  "/add-category",
  loginCheck,
  uploadMiddleware.single("cImage"),
  (req, res, next) => {
    clearCache("categories");
    next();
  },
  categoryController.postAddCategory
);

router.post("/edit-category", loginCheck, (req, res, next) => {
  clearCache("categories");
  next();
}, categoryController.postEditCategory);

router.post(
  "/delete-category",
  loginCheck,
  (req, res, next) => {
    clearCache("categories");
    next();
  },
  categoryController.getDeleteCategory
);

module.exports = router;
