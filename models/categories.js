const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    cName: {
      type: String,
      required: true,
    },
    cDescription: {
      type: String,
      required: true,
    },
    image: {
      publicId: { type: String, default: null },
      secureUrl: { type: String, default: null },
      alt: { type: String, default: "" }
    },
    cStatus: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

categorySchema.set("toJSON", { virtuals: true });
categorySchema.set("toObject", { virtuals: true });

categorySchema.virtual("cImage").get(function () {
  return this.image ? this.image.secureUrl : "";
});

categorySchema.virtual("cloudinaryPublicId").get(function () {
  return this.image ? this.image.publicId : null;
});

const categoryModel = mongoose.model("categories", categorySchema);
module.exports = categoryModel;
