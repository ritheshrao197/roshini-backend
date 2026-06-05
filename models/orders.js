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

const orderModel = mongoose.model("orders", orderSchema);
module.exports = orderModel;
