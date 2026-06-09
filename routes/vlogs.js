const express = require("express");
const router = express.Router();
const vlogController = require("../controller/vlogs");
const vlogCategoryController = require("../controller/vlogCategories");

// Public endpoints for Vlogs
router.get("/vlogs", vlogController.getAllVlogs);
router.get("/vlogs/featured", vlogController.getFeaturedVlogs);
router.get("/vlogs/latest", vlogController.getLatestVlogs);
router.get("/vlogs/popular", vlogController.getPopularVlogs);
router.get("/vlogs/search", vlogController.getSearchVlogs);
router.get("/vlogs/category/:categorySlug", vlogController.getVlogsByCategory);
router.get("/vlogs/:slug", vlogController.getVlogBySlug);

// Public endpoints for Vlog Categories
router.get("/vlog-categories", vlogCategoryController.getAllCategory);

module.exports = router;
