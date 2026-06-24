const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },
    allProduct: [
      {
        id: { type: ObjectId, ref: "products" },
        quantitiy: Number,
      },
    ],
    cartSnapshot: {
      type: mongoose.Schema.Types.Mixed,
    },
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
      default: "PENDING",
      enum: [
        "PENDING",
        "CONFIRMED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ],
    },
    paymentStatus: {
      type: String,
      default: "PENDING",
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
    },
    shipmentTrackingId: {
      type: String,
    },
    invoiceUrl: {
      type: String,
    },
    payment: {
      gateway: {
        type: String,
        enum: ["PHONEPE", "PAYU", "BRAINTREE", "COD"],
      },
      transactionId: String,
      gatewayTransactionId: String,
      amount: Number,
      paidAt: Date,
      response: mongoose.Schema.Types.Mixed,
      hashVerified: {
        type: Boolean,
        default: false,
      },
    },
    paymentEvents: [
      {
        event: String,
        gateway: String,
        transactionId: String,
        createdAt: { type: Date, default: Date.now },
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],
    expiresAt: {
      type: Date,
      index: true,
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
