const express = require("express");
const router = express.Router();
const categoryController = require("../controller/categories");
const multer = require("multer");
const { loginCheck } = require("../middleware/auth");
const { cacheMiddleware, clearCache } = require("../middleware/cache");
const { uploadMiddleware } = require("../config/cloudinary");

// Categories: 900s TTL (15 minutes)
const validate = require("../middleware/validate");
const { createCategorySchema } = require("../validators/product.validator");

router.get("/all-category", cacheMiddleware("categories", 900), categoryController.getAllCategory);

router.post(
  "/add-category",
  loginCheck,
  uploadMiddleware.single("cImage"),
  validate(createCategorySchema),
  (req, res, next) => {
    clearCache("categories");
    next();
  },
  categoryController.postAddCategory
);

router.post("/edit-category", loginCheck, validate(createCategorySchema.partial()), (req, res, next) => {
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
