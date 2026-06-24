const couponModel = require("../../models/coupon");
const userCouponModel = require("../../models/userCoupon");
const redisClient = require("../../config/redis");

class CouponUsageService {
  /**
   * Records the usage of a coupon and increments the usage counts.
   * @param {String} code - The coupon code
   * @param {ObjectId} userId - The ID of the user who used the coupon
   * @param {ObjectId} orderId - The ID of the resulting order
   */
  async recordUsage(code, userId, orderId) {
    try {
      const upperCode = code.toUpperCase();

      // 1. Increment global usage count
      await couponModel.findOneAndUpdate(
        { code: upperCode },
        { $inc: { usedCount: 1 } }
      );

      // 2. Insert into UserCoupon tracking collection
      if (userId) {
        const usage = new userCouponModel({
          userId,
          couponCode: upperCode,
          orderId,
        });
        await usage.save();
      }

      // 3. Clear/Refresh Redis Caches
      if (redisClient) {
        try {
          // Clear the global coupon cache so the next fetch gets the updated usedCount
          await redisClient.del(`coupon:code:${upperCode}`);
          
          if (userId) {
             // Clear the user's specific usage count cache
             await redisClient.del(`coupon:user:${userId}:${upperCode}`);
          }
        } catch (err) {
          console.warn("Redis delete error:", err);
        }
      }

      return { success: true };
    } catch (err) {
      console.error("CouponUsageService.recordUsage error:", err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new CouponUsageService();
