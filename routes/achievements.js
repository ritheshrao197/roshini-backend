const express = require("express");
const router = express.Router();
const achievementController = require("../controller/achievements");

// Public endpoints for Achievements
router.get("/achievements", achievementController.getAllActiveAchievements);

module.exports = router;
