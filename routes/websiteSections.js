const express = require("express");
const router = express.Router();
const websiteSectionsController = require("../controller/websiteSections");
const { loginCheck } = require("../middleware/auth");

// Public route to fetch active sections
router.get("/sections", (req, res, next) => {
  req.isAdmin = false;
  next();
}, websiteSectionsController.getSections);

// Admin routes
router.get("/admin/sections", loginCheck, (req, res, next) => {
  req.isAdmin = true;
  next();
}, websiteSectionsController.getSections);

router.put("/admin/sections", loginCheck, websiteSectionsController.updateSections);

module.exports = router;
