const express = require("express");
const router = express.Router();
const achievementController = require("../controller/achievements");
const { loginCheck, isAuth, isAdmin } = require("../middleware/auth");

// Admin endpoints for Achievements
router.get("/admin/achievements", loginCheck, achievementController.getAllAdminAchievements);
router.post("/admin/achievements", loginCheck, achievementController.postAddAchievement);
router.put("/admin/achievements/:id", loginCheck, achievementController.putUpdateAchievement);
router.delete("/admin/achievements/:id", loginCheck, achievementController.deleteAchievement);

module.exports = router;
