const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema(
  {
    to: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Sent", "Failed", "Pending"],
      default: "Sent",
    },
    errorDetails: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const emailLogModel = mongoose.model("emailLogs", emailLogSchema);
module.exports = emailLogModel;
