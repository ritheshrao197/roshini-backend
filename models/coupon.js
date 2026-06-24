const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: String,
    type: {
      type: String,
      enum: ["percentage", "fixed", "shipping", "tiered"],
      required: true,
    },
    value: {
      type: Number,
      // Optional for shipping and tiered types
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number, // Useful for percentage coupons (e.g., 20% off up to ₹500)
    },
    usageLimit: {
      type: Number, // Total number of times this coupon can be used globally
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1, // Number of times a single user can use it
    },
    firstOrderOnly: {
      type: Boolean,
      default: false,
    },
    applicableProducts: [
      {
        type: ObjectId,
        ref: "products",
      },
    ],
    applicableCategories: [String],
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
    isStackable: {
      type: Boolean,
      default: false,
    },
    rules: [
      {
        minQuantity: Number,
        discount: Number,
      },
    ],
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, endDate: 1 });

const couponModel = mongoose.model("coupons", couponSchema);
module.exports = couponModel;
