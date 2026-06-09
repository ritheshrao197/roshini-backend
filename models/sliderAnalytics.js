const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const sliderAnalyticsSchema = new mongoose.Schema(
  {
    sliderId: {
      type: ObjectId,
      ref: "heroSliders",
      required: true,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    addToCarts: {
      type: Number,
      default: 0,
    },
    purchases: {
      type: Number,
      default: 0,
    },
    date: {
      type: String, // Storing YYYY-MM-DD for daily aggregation
      required: true,
    }
  },
  { timestamps: true }
);

// Compound index for efficient daily analytics queries
sliderAnalyticsSchema.index({ sliderId: 1, date: 1 }, { unique: true });

const sliderAnalyticsModel = mongoose.model("sliderAnalytics", sliderAnalyticsSchema);
module.exports = sliderAnalyticsModel;
