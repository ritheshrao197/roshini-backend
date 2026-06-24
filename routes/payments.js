const express = require("express");
const router = express.Router();
const paymentController = require("../controller/payments");
const { loginCheck } = require("../middleware/auth");
const { checkoutLimiter } = require("../middleware/rateLimiter");

// Unified Initiate Payment Endpoint
router.post("/create", loginCheck, checkoutLimiter, paymentController.initiatePayment);

// Webhooks
router.post("/payu-webhook", paymentController.payuWebhook);
router.post("/phonepe-webhook", paymentController.phonepeWebhook);

// Polling Fallback Verification
router.get("/:transactionId/verify", paymentController.verifyPayment);

// For backwards compatibility during transition from the old logic
router.post("/phonepe", loginCheck, checkoutLimiter, (req, res, next) => {
    req.body.gateway = "PHONEPE";
    paymentController.initiatePayment(req, res, next);
});
router.post("/payu", loginCheck, checkoutLimiter, (req, res, next) => {
    req.body.gateway = "PAYU";
    paymentController.initiatePayment(req, res, next);
});

module.exports = router;
