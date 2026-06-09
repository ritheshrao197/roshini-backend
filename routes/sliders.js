const express = require("express");
const router = express.Router();
const sliderController = require("../controller/sliders");

// Public endpoints for Homepage Hero Slider
router.get("/sliders/active", sliderController.getActiveSliders);

// Analytics endpoints
router.post("/analytics/slider", sliderController.recordAnalytics);

module.exports = router;
