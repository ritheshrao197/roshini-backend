const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin");
const { loginCheck, isAdmin } = require("../middleware/auth");

const { couponLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { createCouponSchema, applyCouponSchema } = require("../validators/coupon.validator");

router.get("/admin/analytics", loginCheck, isAdmin, adminController.getDashboardAnalytics);

// Coupon API routes
router.get("/admin/coupons", loginCheck, isAdmin, adminController.getAllCoupons);
router.post("/admin/coupon", loginCheck, isAdmin, validate(createCouponSchema), adminController.createCoupon);
router.put("/admin/coupon/:id", loginCheck, isAdmin, adminController.updateCoupon);
router.delete("/admin/coupon/:id", loginCheck, isAdmin, adminController.deleteCoupon);

router.get("/admin/orders/export", loginCheck, isAdmin, adminController.exportOrdersCSV);
router.post("/coupon/apply", loginCheck, couponLimiter, validate(applyCouponSchema), adminController.applyCoupon);

// Media & Logs (Admin only)
router.get("/admin/email-logs", loginCheck, isAdmin, adminController.getEmailLogs);
router.get("/admin/media", loginCheck, isAdmin, adminController.getCloudinaryMedia);
router.post("/admin/media/delete", loginCheck, isAdmin, adminController.deleteCloudinaryMedia);

module.exports = router;
