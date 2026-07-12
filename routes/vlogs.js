const express = require("express");
const router = express.Router();
const vlogController = require("../controller/vlogs");
const vlogCategoryController = require("../controller/vlogCategories");
const multer = require("multer");
const imageValidator = require("../middleware/imageValidator");

// Image Upload setting matching admin configuration
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads/vlogs");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// Public endpoints for Vlogs
router.get("/vlogs", vlogController.getAllVlogs);
router.get("/vlogs/featured", vlogController.getFeaturedVlogs);
router.get("/vlogs/latest", vlogController.getLatestVlogs);
router.get("/vlogs/popular", vlogController.getPopularVlogs);
router.get("/vlogs/search", vlogController.getSearchVlogs);
router.get("/vlogs/category/:categorySlug", vlogController.getVlogsByCategory);
router.get("/vlogs/:slug", vlogController.getVlogBySlug);

// Public submission endpoints (no authentication/authorization required)
router.post("/vlogs/submit", upload.single("thumbnail"), imageValidator, vlogController.submitPublicVlog);
router.post("/blogs/submit", upload.single("thumbnail"), imageValidator, vlogController.submitPublicVlog);

// Public interaction endpoints
router.post("/vlogs/:id/like", vlogController.likeVlog);
router.get("/vlogs/:id/related", vlogController.getRelatedVlogs);

// Public import endpoints (for external tools)
router.post("/blogs/import", vlogController.importBlog);
router.post("/blogs/import/bulk", vlogController.importBlogBulk);
router.post("/vlogs/import", vlogController.importBlog);
router.post("/vlogs/import/bulk", vlogController.importBlogBulk);

// Public endpoints for Vlog Categories
router.get("/vlog-categories", vlogCategoryController.getAllCategory);

module.exports = router;
