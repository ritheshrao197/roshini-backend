const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const productSchema = new mongoose.Schema(
  {
    pName: {
      type: String,
      required: true,
    },
    pDescription: {
      type: String,
      required: true,
    },
    pPrice: {
      type: Number,
      required: true,
    },
    pSold: {
      type: Number,
      default: 0,
    },
    pQuantity: {
      type: Number,
      default: 0,
    },
    pCategory: {
      type: ObjectId,
      ref: "categories",
    },
    image: {
      publicId: { type: String, default: null },
      secureUrl: { type: String, default: null },
      alt: { type: String, default: "" }
    },
    images: [
      {
        publicId: { type: String, required: true },
        secureUrl: { type: String, required: true },
        alt: { type: String, default: "" },
        isPrimary: { type: Boolean, default: false }
      }
    ],
    pOffer: {
      type: String,
      default: null,
    },
    pRatingsReviews: [
      {
        review: String,
        user: { type: ObjectId, ref: "users" },
        rating: String,
        createdAt: {
          type: Date,
          default: Date.now(),
        },
      },
    ],
    pStatus: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
    },
    shortDescription: {
      type: String,
    },
    productType: {
      type: String,
    },
    brandName: {
      type: String,
      default: "Roshini’s Home Products",
    },
    comparePrice: {
      type: Number,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    productWeight: {
      type: String,
    },
    ingredients: [
      {
        type: String,
      },
    ],
    usageInstructions: {
      type: String,
    },
    storageInstructions: {
      type: String,
    },
    suitableFor: [
      {
        type: String,
      },
    ],
    bestseller: {
      type: Boolean,
      default: false,
    },
    trustBadges: [
      {
        type: String,
      },
    ],
    canonicalUrl: {
      type: String,
    },
    ogImage: {
      type: String,
    },
    relatedProducts: [
      {
        type: ObjectId,
        ref: "products",
      },
    ],
    crossSellProducts: [
      {
        type: ObjectId,
        ref: "products",
      },
    ],
    comboEligibility: {
      type: Boolean,
      default: false,
    },
    shippingWeight: {
      type: Number,
    },
    packageDimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    codAvailable: {
      type: Boolean,
      default: true,
    },
    freeShippingEligible: {
      type: Boolean,
      default: false,
    },
    allowCoupons: {
      type: Boolean,
      default: true,
    },
    limitedTimeOffer: {
      type: Boolean,
      default: false,
    },
    offerExpiryDate: {
      type: Date,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    purchaseCount: {
      type: Number,
      default: 0,
    },
    conversionRate: {
      type: Number,
      default: 0,
    },
    auditLog: [
      {
        action: String,
        details: String,
        timestamp: { type: Date, default: Date.now },
        performedBy: String,
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    seoTitle: {
      type: String,
    },
    seoDescription: {
      type: String,
    },
    tags: [
      {
        type: String,
      },
    ],
    nutritionalInfo: {
      type: Map,
      of: String,
    },
    benefits: [
      {
        type: String,
      },
    ],
    featured: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    pVariants: [
      {
        weight: { type: String },
        price: { type: Number, required: true },
        comparePrice: { type: Number },
        quantity: { type: Number, required: true, default: 0 },
        sku: { type: String },
      }
    ],
  },
  { timestamps: true }
);

// Indexes for query optimization
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ isDeleted: 1 });
productSchema.index({ pCategory: 1 });
productSchema.index({ pStatus: 1 });
productSchema.index({ pName: "text", pDescription: "text", tags: "text" });

// Set schema options to allow virtuals when converted to JSON or Object
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

// Virtuals for backward-compatibility
productSchema.virtual("pImages").get(function () {
  if (this.images && this.images.length > 0) {
    return this.images.map((img) => img.secureUrl);
  }
  return this.image && this.image.secureUrl ? [this.image.secureUrl] : [];
});

productSchema.virtual("pImagePublicIds").get(function () {
  if (this.images && this.images.length > 0) {
    return this.images.map((img) => img.publicId);
  }
  return this.image && this.image.publicId ? [this.image.publicId] : [];
});

const productModel = mongoose.model("products", productSchema);
module.exports = productModel;
