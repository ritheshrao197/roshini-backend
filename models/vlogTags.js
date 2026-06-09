const mongoose = require("mongoose");

const vlogTagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

vlogTagSchema.index({ slug: 1 });

const vlogTagModel = mongoose.model("vlogtags", vlogTagSchema);
module.exports = vlogTagModel;
