const mongoose = require("mongoose");

const failedPaymentEventSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      index: true,
    },
    gateway: {
      type: String,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
    error: {
      type: String,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const failedPaymentEventModel = mongoose.model("failedPaymentEvents", failedPaymentEventSchema);
module.exports = failedPaymentEventModel;
