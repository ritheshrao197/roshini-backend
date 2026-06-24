const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      index: true,
    },
    gatewayTransactionId: {
      type: String,
      index: true,
    },
    gateway: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    request: {
      type: mongoose.Schema.Types.Mixed,
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const paymentTransactionModel = mongoose.model("paymentTransactions", paymentTransactionSchema);
module.exports = paymentTransactionModel;
