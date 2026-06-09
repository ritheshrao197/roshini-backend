const rateLimit = require("express-rate-limit");

// Standard message for rate limit errors
const limitMessage = (limit, minutes) => ({
  error: `Too many requests. Please wait ${minutes} minutes before trying again.`,
  limit,
});

// Login Limiter: 10 requests per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: limitMessage(10, 15),
  standardHeaders: true,
  legacyHeaders: false,
});

// Register Limiter: 10 requests per hour
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: limitMessage(10, 60),
  standardHeaders: true,
  legacyHeaders: false,
});

// Checkout Limiter: 20 requests per 15 minutes
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: limitMessage(20, 15),
  standardHeaders: true,
  legacyHeaders: false,
});

// Coupon Limiter: 20 requests per hour
const couponLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: limitMessage(20, 60),
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  registerLimiter,
  checkoutLimiter,
  couponLimiter,
};
