const mongoose = require("mongoose");

const websiteSectionSchema = new mongoose.Schema(
  {
    sectionId: { 
      type: String, 
      required: true,
      unique: true 
    },
    name: { 
      type: String, 
      required: true 
    },
    isVisible: { 
      type: Boolean, 
      default: true 
    },
    displayOrder: { 
      type: Number, 
      default: 0 
    }
  },
  { timestamps: true }
);

const websiteSectionModel = mongoose.model("websiteSections", websiteSectionSchema);
module.exports = websiteSectionModel;
