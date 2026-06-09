const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["Percentage", "Fixed"],
      required: true,
    },
    discountAmount: {
      type: Number,
      required: true,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxUses: {
      type: Number,
      default: null, // null means unlimited uses
    },
    usesCount: {
      type: Number,
      default: 0,
    },
    userEmail: {
      type: String,
      default: null, // if set, only this email can use it
    },
  },
  { timestamps: true }
);

const couponModel = mongoose.model("coupons", couponSchema);
module.exports = couponModel;
