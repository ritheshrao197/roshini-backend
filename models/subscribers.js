const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    source: {
      type: String,
      default: "Unknown",
    },
    welcomeCoupon: {
      type: String,
      default: null,
    },
    couponUsed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Subscribed", "Unsubscribed"],
      default: "Subscribed",
    },
  },
  { timestamps: true }
);

const subscriberModel = mongoose.model("subscribers", subscriberSchema);
module.exports = subscriberModel;
