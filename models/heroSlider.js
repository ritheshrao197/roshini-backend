const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const heroSliderSchema = new mongoose.Schema(
  {
    title: { type: String },
    subtitle: { type: String },
    description: { type: String },
    
    desktopImage: { type: String },
    mobileImage: { type: String },
    
    primaryButtonText: { type: String },
    primaryButtonLink: { type: String },
    
    secondaryButtonText: { type: String },
    secondaryButtonLink: { type: String },
    
    type: {
      type: String,
      enum: ["image", "video", "achievement", "product", "promotion"],
      default: "image",
    },
    
    referenceId: { type: ObjectId }, // Can point to a Product or Achievement depending on type
    
    videoUrl: { type: String },
    
    badgeText: { type: String },
    badgeColor: { type: String, default: "#E6A817" },
    showOverlayStats: { type: Boolean, default: false },
    animationType: { type: String, default: "fade" },
    textAlignment: { type: String, default: "left", enum: ["left", "center", "right"] },
    
    status: {
      type: String,
      enum: ["draft", "published", "scheduled", "expired"],
      default: "published",
    },
    
    startDate: { type: Date },
    endDate: { type: Date },
    
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const heroSliderModel = mongoose.model("heroSliders", heroSliderSchema);
module.exports = heroSliderModel;
