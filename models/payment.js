const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const paymentSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phonePeTransactionId: {
      type: String,
      default: null,
    },
    orderId: {
      type: ObjectId,
      ref: "orders",
      required: true,
    },
    userId: {
      type: ObjectId,
      ref: "users",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    amountInPaise: {
      type: Number,
      required: true,
    },
    gateway: {
      type: String,
      enum: ["PhonePe", "PayU", "COD"],
      default: "PhonePe",
    },
    status: {
      type: String,
      enum: ["Pending", "Success", "Failed", "Refunded"],
      default: "Pending",
    },
    webhookVerified: {
      type: Boolean,
      default: false,
    },
    statusVerified: {
      type: Boolean,
      default: false,
    },
    rawRequest: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    webhookPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const paymentModel = mongoose.model("payments", paymentSchema);
module.exports = paymentModel;
