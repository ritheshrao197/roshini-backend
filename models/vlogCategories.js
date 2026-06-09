const mongoose = require("mongoose");

const vlogCategorySchema = new mongoose.Schema(
  {
    cName: {
      type: String,
      required: true,
      unique: true,
    },
    cDescription: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    cStatus: {
      type: String,
      default: "Active", // Active, Disabled
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

vlogCategorySchema.index({ slug: 1 });

const vlogCategoryModel = mongoose.model("vlogcategories", vlogCategorySchema);
module.exports = vlogCategoryModel;
