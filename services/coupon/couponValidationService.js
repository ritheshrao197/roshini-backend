const couponModel = require("../../models/coupon");
const userCouponModel = require("../../models/userCoupon");
const redisClient = require("../../config/redis");

class CouponValidationService {
  /**
   * Fetch coupon by code (from Redis or Mongo)
   */
  async getCoupon(code) {
    const redisKey = `coupon:code:${code}`;
    
    if (redisClient) {
      try {
        const cached = await redisClient.get(redisKey);
        if (cached) return JSON.parse(cached);
      } catch (err) {
        console.warn("Redis get error:", err);
      }
    }

    const coupon = await couponModel.findOne({ code: code.toUpperCase() }).lean();
    
    if (coupon && redisClient) {
      try {
        // Cache for 1 hour
        await redisClient.set(redisKey, JSON.stringify(coupon), { ex: 3600 });
      } catch (err) {
        console.warn("Redis set error:", err);
      }
    }

    return coupon;
  }

  /**
   * Fetch user usage count for a coupon (from Redis or Mongo)
   */
  async getUserUsageCount(userId, code) {
    const redisKey = `coupon:user:${userId}:${code}`;

    if (redisClient) {
      try {
        const cached = await redisClient.get(redisKey);
        if (cached !== null) return Number(cached);
      } catch (err) {
        console.warn("Redis get error:", err);
      }
    }

    const count = await userCouponModel.countDocuments({ userId, couponCode: code.toUpperCase() });
    
    if (redisClient) {
      try {
        await redisClient.set(redisKey, count, { ex: 3600 });
      } catch (err) {
        console.warn("Redis set error:", err);
      }
    }

    return count;
  }

  /**
   * Validate a coupon against all rules
   */
  async validate(code, user, cart) {
    try {
      const coupon = await this.getCoupon(code);

      if (!coupon) {
        return { valid: false, error: "Invalid coupon code" };
      }

      if (!coupon.isActive) {
        return { valid: false, error: "This coupon is no longer active" };
      }

      const now = new Date();
      if (coupon.startDate && new Date(coupon.startDate) > now) {
        return { valid: false, error: "This coupon is not yet valid" };
      }

      if (coupon.endDate && new Date(coupon.endDate) < now) {
        return { valid: false, error: "This coupon has expired" };
      }

      // Check global usage limit
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return { valid: false, error: "This coupon has reached its usage limit" };
      }

      // Check user usage limit
      if (user && user._id) {
        const userCount = await this.getUserUsageCount(user._id, code);
        if (userCount >= coupon.perUserLimit) {
          return { valid: false, error: `You have already used this coupon the maximum allowed times (${coupon.perUserLimit})` };
        }
      } else if (!user || !user._id) {
        return { valid: false, error: "You must be logged in to use a coupon" };
      }

      return { valid: true, coupon };
    } catch (err) {
      console.error("CouponValidationService.validate error:", err);
      return { valid: false, error: "An error occurred while validating the coupon" };
    }
  }
}

module.exports = new CouponValidationService();
