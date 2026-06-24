const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const orderSchema = new mongoose.Schema(
  {
    allProduct: [
      {
        id: { type: ObjectId, ref: "products" },
        quantitiy: Number,
      },
    ],
    user: {
      type: ObjectId,
      ref: "users",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    coupon: {
      code: String,
      type: { type: String, enum: ["percentage", "fixed", "shipping", "tiered"] },
      value: Number,
      discountAmount: Number,
    },
    pricing: {
      subtotal: Number,
      couponDiscount: Number,
      shippingDiscount: Number,
      shippingCharge: Number,
      tax: Number,
      total: Number,
    },
    transactionId: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: "Not processed",
      enum: [
        "Not processed",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
      ],
    },
    paymentStatus: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Paid", "Failed", "Refunded"],
    },
    shipmentTrackingId: {
      type: String,
    },
    invoiceUrl: {
      type: String,
    },
    paymentGateway: {
      type: String,
      enum: ["Braintree", "PhonePe", "PayU", "COD"],
      default: "Braintree",
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    refundStatus: {
      type: String,
      default: "None",
      enum: ["None", "Requested", "Processed"],
    },
  },
  { timestamps: true }
);

// Indexes for query optimization
orderSchema.index({ user: 1 });
orderSchema.index({ createdAt: -1 });

const orderModel = mongoose.model("orders", orderSchema);
module.exports = orderModel;
