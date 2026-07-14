const express = require("express");
const router = express.Router();
const homepageController = require("../controller/homepage");
const { cacheMiddleware } = require("../middleware/cache");

router.get("/homepage", cacheMiddleware("homepage", 300), homepageController.getHomepageData);

module.exports = router;
