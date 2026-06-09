const express = require("express");
const router = express.Router();
const paymentController = require("../controller/payments");
const { loginCheck } = require("../middleware/auth");

const { checkoutLimiter } = require("../middleware/rateLimiter");

// PhonePe — initiate (requires auth)
router.post("/phonepe", loginCheck, checkoutLimiter, paymentController.initiatePhonePe);

// PhonePe — server-side status verification (called from /payment-status page)
router.get("/phonepe-status", paymentController.verifyPhonePeStatus);

// PhonePe — webhook/callback from PhonePe servers (no auth, verified by signature)
router.post("/phonepe-webhook", paymentController.phonePeWebhook);

// PayU — initiate (requires auth)
router.post("/payu", loginCheck, checkoutLimiter, paymentController.initiatePayU);

module.exports = router;
