const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

// Standard message for rate limit errors
const limitMessage = (limit, minutes) => ({
  error: `Too many requests. Please wait ${minutes} minutes before trying again.`,
  limit,
});

// Custom IP resolver — reads real client IP from Cloudflare / Render proxy headers
const getClientIp = (req) => {
  if (req.headers["cf-connecting-ip"]) {
    return req.headers["cf-connecting-ip"];
  }
  if (req.headers["x-forwarded-for"]) {
    return req.headers["x-forwarded-for"].split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
};

// Wrap with ipKeyGenerator so express-rate-limit handles IPv6 correctly (required in v7+)
const keyGen = ipKeyGenerator(getClientIp);

// Login Limiter: 10 requests per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: limitMessage(10, 15),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGen,
});

// Register Limiter: 10 requests per hour
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: limitMessage(10, 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGen,
});

// Checkout Limiter: 20 requests per 15 minutes
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: limitMessage(20, 15),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGen,
});

// Coupon Limiter: 20 requests per hour
const couponLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: limitMessage(20, 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGen,
});

module.exports = {
  loginLimiter,
  registerLimiter,
  checkoutLimiter,
  couponLimiter,
};
