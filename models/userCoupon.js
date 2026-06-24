const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const userCouponSchema = new mongoose.Schema(
  {
    userId: {
      type: ObjectId,
      ref: "users",
      required: true,
    },
    couponCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    orderId: {
      type: ObjectId,
      ref: "orders",
      required: true,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index to quickly find all uses of a specific coupon by a specific user
userCouponSchema.index({ userId: 1, couponCode: 1 });

const userCouponModel = mongoose.model("userCoupons", userCouponSchema);
module.exports = userCouponModel;
