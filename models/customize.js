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
  },
  { timestamps: true }
);

const customizeModel = mongoose.model("customizes", customizeSchema);
module.exports = customizeModel;
