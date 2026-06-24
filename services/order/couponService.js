const couponModel = require("../../models/coupon");
// Note: Currently no userCoupon model exists in the project schema, but if one did we would update it here.
// Instead we'll update the global coupon usage.

class CouponService {
  /**
   * Records the usage of a coupon, incrementing its usedCount.
   * Uses MongoDB sessions to ensure atomicity.
   * @param {Object} order The order document containing the coupon object
   * @param {Object} session The MongoDB session
   */
  async recordUsage(order, session) {
    if (!order.coupon || !order.coupon.code) {
      return;
    }

    const couponCode = order.coupon.code.toUpperCase();
    
    await couponModel.updateOne(
      { code: couponCode },
      { $inc: { usedCount: 1 } },
      { session }
    );
    
    // Future feature: await UserCoupon.create([{ userId, couponCode, orderId }], { session });
  }
}

module.exports = new CouponService();
