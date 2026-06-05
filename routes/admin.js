const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin");
const { loginCheck, isAdmin } = require("../middleware/auth");

router.get("/admin/analytics", loginCheck, isAdmin, adminController.getDashboardAnalytics);
router.post("/admin/coupon", loginCheck, isAdmin, adminController.createCoupon);
router.get("/admin/orders/export", loginCheck, isAdmin, adminController.exportOrdersCSV);
router.post("/coupon/apply", loginCheck, adminController.applyCoupon);

module.exports = router;
