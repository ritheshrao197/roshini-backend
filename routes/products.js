const express = require("express");
const router = express.Router();
const productController = require("../controller/products");
const multer = require("multer");
const { cacheMiddleware, clearCache } = require("../middleware/redisCache");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/products");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const { uploadMiddleware } = require("../config/cloudinary");

router.get("/all-product", cacheMiddleware, productController.getAllProduct);
router.post("/product-by-category", productController.getProductByCategory);
router.post("/product-by-price", productController.getProductByPrice);
router.post("/wish-product", productController.getWishProduct);
router.post("/cart-product", productController.getCartProduct);

router.post("/add-product", uploadMiddleware.any(), (req, res, next) => {
  clearCache("all-product");
  next();
}, productController.postAddProduct);

router.post("/edit-product", uploadMiddleware.any(), (req, res, next) => {
  clearCache("all-product");
  next();
}, productController.postEditProduct);

router.post("/delete-product", (req, res, next) => {
  clearCache("all-product");
  next();
}, productController.getDeleteProduct);

router.post("/restore-product", (req, res, next) => {
  clearCache("all-product");
  next();
}, productController.postRestoreProduct);

router.post("/single-product", productController.getSingleProduct);

router.post("/add-review", productController.postAddReview);
router.post("/delete-review", productController.deleteReview);

module.exports = router;
