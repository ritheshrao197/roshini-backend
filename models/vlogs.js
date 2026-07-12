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
    image: {
      publicId: { type: String, default: null },
      secureUrl: { type: String, default: null },
      alt: { type: String, default: "" }
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
    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Draft"
    },
    likesCount: {
      type: Number,
      default: 0
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
    seoKeywords: [
      {
        type: String
      }
    ],
    canonicalUrl: {
      type: String
    },
    ogImage: {
      type: String
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
    relatedProducts: [
      {
        type: ObjectId,
        ref: "products"
      }
    ],
    gallery: [
      {
        publicId: { type: String, default: null },
        secureUrl: { type: String, default: null },
        alt: { type: String, default: "" }
      }
    ],
    scheduledPublishDate: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

vlogSchema.index({ slug: 1 });
vlogSchema.index({ isPublished: 1, isDeleted: 1 });
vlogSchema.index({ status: 1 });
vlogSchema.index({ title: "text", content: "text" });

vlogSchema.set("toJSON", { virtuals: true });
vlogSchema.set("toObject", { virtuals: true });

vlogSchema.virtual("thumbnail").get(function () {
  return this.image ? this.image.secureUrl : "";
});

vlogSchema.virtual("readingTime").get(function () {
  if (!this.content) return 1;
  const cleanText = this.content.replace(/<[^>]*>/g, " ");
  const wordCount = cleanText.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
});

vlogSchema.pre("save", function (next) {
  if (this.status === "Published") {
    this.isPublished = true;
    if (!this.publishDate) {
      this.publishDate = new Date();
    }
  } else {
    this.isPublished = false;
  }
  next();
});

const vlogModel = mongoose.model("vlogs", vlogSchema);
module.exports = vlogModel;
