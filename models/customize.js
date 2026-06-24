const mongoose = require("mongoose");

const customizeSchema = new mongoose.Schema(
  {
    slideImage: {
      type: String,
    },
    firstShow: {
      type: Number,
      default: 0,
    },
    phonePeEnabled: {
      type: Boolean,
      default: true,
    },
    payUEnabled: {
      type: Boolean,
      default: true,
    },
    type: {
      type: String,
      default: "slide", // Can be 'slide' or 'settings'
    },
    logoImage: {
      type: String,
    },
    shopName: {
      type: String,
      default: "Roshini's",
    },
    shopSubtitle: {
      type: String,
      default: "Home Products",
    },
    themePrimaryColor: {
      type: String,
      default: "#6B3E26",
    },
    themePrimaryColorDark: {
      type: String,
      default: "#4e2c18",
    },
    themePrimaryColorLight: {
      type: String,
      default: "#8a5438",
    },
    themeCreamColor: {
      type: String,
      default: "#F5E9DA",
    },
    themeCreamColorDark: {
      type: String,
      default: "#ede0cc",
    },
  },
  { timestamps: true }
);

const customizeModel = mongoose.model("customizes", customizeSchema);
module.exports = customizeModel;
