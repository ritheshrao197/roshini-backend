const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin");
const { loginCheck, isAdmin } = require("../middleware/auth");

const { couponLimiter } = require("../middleware/rateLimiter");

router.get("/admin/analytics", loginCheck, isAdmin, adminController.getDashboardAnalytics);
router.post("/admin/coupon", loginCheck, isAdmin, adminController.createCoupon);
router.get("/admin/orders/export", loginCheck, isAdmin, adminController.exportOrdersCSV);
router.post("/coupon/apply", loginCheck, couponLimiter, adminController.applyCoupon);

// Media & Logs (Admin only)
router.get("/admin/email-logs", loginCheck, isAdmin, adminController.getEmailLogs);
router.get("/admin/media", loginCheck, isAdmin, adminController.getCloudinaryMedia);
router.post("/admin/media/delete", loginCheck, isAdmin, adminController.deleteCloudinaryMedia);

module.exports = router;
