const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const vlogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    content: {
      type: String,
      required: true, // Rich text content
    },
    excerpt: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String, // URL or file path
    },
    vCategory: {
      type: ObjectId,
      ref: "vlogcategories",
      required: true,
    },
    vTags: [
      {
        type: ObjectId,
        ref: "vlogtags",
      },
    ],
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishDate: {
      type: Date,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    seoTitle: {
      type: String,
    },
    seoDescription: {
      type: String,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: ObjectId,
      ref: "users",
    },
  },
  { timestamps: true }
);

vlogSchema.index({ slug: 1 });
vlogSchema.index({ isPublished: 1, isDeleted: 1 });
vlogSchema.index({ title: "text", content: "text" });

const vlogModel = mongoose.model("vlogs", vlogSchema);
module.exports = vlogModel;
