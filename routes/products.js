const express = require("express");
const router = express.Router();
const productController = require("../controller/products");
const multer = require("multer");
const { cacheMiddleware, clearCache } = require("../middleware/cache");
const validate = require("../middleware/validate");
const { submitReviewSchema } = require("../validators/product.validator");

const { uploadMiddleware } = require("../config/cloudinary");

// Products: 300s TTL (5 minutes)
router.get("/all-product", cacheMiddleware("products", 300), productController.getAllProduct);
router.post("/product-by-category", productController.getProductByCategory);
router.post("/product-by-price", productController.getProductByPrice);
router.post("/wish-product", productController.getWishProduct);
router.post("/cart-product", productController.getCartProduct);

router.post("/add-product", uploadMiddleware.any(), (req, res, next) => {
  clearCache("products");
  next();
}, productController.postAddProduct);

router.post("/edit-product", uploadMiddleware.any(), (req, res, next) => {
  clearCache("products");
  next();
}, productController.postEditProduct);

router.post("/delete-product", (req, res, next) => {
  clearCache("products");
  next();
}, productController.getDeleteProduct);

router.post("/restore-product", (req, res, next) => {
  clearCache("products");
  next();
}, productController.postRestoreProduct);

router.post("/single-product", productController.getSingleProduct);

router.post("/add-review", validate(submitReviewSchema), productController.postAddReview);
router.post("/delete-review", productController.deleteReview);

module.exports = router;
