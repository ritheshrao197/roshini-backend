const express = require("express");
const router = express.Router();
const productController = require("../controller/products");
const multer = require("multer");
const { cacheMiddleware, clearCache } = require("../middleware/cache");
const validate = require("../middleware/validate");
const { submitReviewSchema } = require("../validators/product.validator");
const { uploadMiddleware } = require("../config/cloudinary");
const imageValidator = require("../middleware/imageValidator");

// Products: 300s TTL (5 minutes)
router.get("/all-product", cacheMiddleware("products", 300), productController.getAllProduct);
router.get("/slug/:slug", cacheMiddleware("product-slug", 300), productController.getProductBySlug);
router.get("/:id/related", cacheMiddleware("product-related", 300), productController.getRelatedProducts);
router.post("/product-by-category", productController.getProductByCategory);
router.post("/product-by-price", productController.getProductByPrice);
router.post("/wish-product", productController.getWishProduct);
router.post("/cart-product", productController.getCartProduct);

const clearProductCaches = async (req, res, next) => {
  try {
    await clearCache("products");
    await clearCache("product-slug");
    await clearCache("product-related");
    await clearCache("homepage");
  } catch (e) {}
  next();
};

router.post("/add-product", uploadMiddleware.any(), imageValidator, clearProductCaches, productController.postAddProduct);
router.post("/edit-product", uploadMiddleware.any(), imageValidator, clearProductCaches, productController.postEditProduct);
router.post("/delete-product", clearProductCaches, productController.getDeleteProduct);
router.post("/restore-product", clearProductCaches, productController.postRestoreProduct);

router.post("/single-product", productController.getSingleProduct);
router.post("/add-review", validate(submitReviewSchema), clearProductCaches, productController.postAddReview);
router.post("/delete-review", clearProductCaches, productController.deleteReview);

module.exports = router;
