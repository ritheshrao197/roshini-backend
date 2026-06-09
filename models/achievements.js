const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["Award", "Certification", "Media", "Statistic"],
      required: true,
    },
    icon: {
      type: String, // Emoji or image URL
      required: true,
    },
    value: {
      type: String, // E.g., "4.84/5", "30+" for counters
    },
    description: {
      type: String,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const achievementModel = mongoose.model("achievements", achievementSchema);
module.exports = achievementModel;
