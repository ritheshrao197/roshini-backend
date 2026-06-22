const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 32,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      index: { unique: true },
      match: /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/,
    },
    password: {
      type: String,
      required: true,
    },
    userRole: {
      type: Number,
      required: true,
    },
    phoneNumber: {
      type: Number,
    },
    userImage: {
      publicId: { type: String, default: null },
      secureUrl: { type: String, default: null },
      alt: { type: String, default: "User Profile Image" }
    },
    verified: {
      type: String,
      default: false,
    },
    secretKey: {
      type: String,
      default: null,
    },
    history: {
      type: Array,
      default: [],
    },
    
    // profileImageUrl and profileImagePublicId are now handled as virtual getters for backward-compatibility.
    addresses: [
      {
        fullName: String,
        mobileNumber: String,
        alternateMobile: String,
        addressLine1: String,
        addressLine2: String,
        landmark: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: "India" },
        isDefault: { type: Boolean, default: false },
        type: { type: String, enum: ["Home", "Office", "Other"], default: "Home" }
      }
    ],
    preferences: {
      preferredLanguage: { type: String, default: "English" },
      theme: { type: String, default: "System Default" },
      interests: { type: [String], default: [] },
      dietaryPreferences: { type: [String], default: [] },
      marketingConsent: { type: Boolean, default: true }
    },
    notifications: {
      email: {
        orders: { type: Boolean, default: true },
        promotions: { type: Boolean, default: true },
        newsletter: { type: Boolean, default: true }
      },
      sms: {
        orders: { type: Boolean, default: true }
      },
      whatsapp: {
        orders: { type: Boolean, default: false }
      }
    },

    // ── RBAC Extension (added incrementally — userRole kept for backward compat) ──
    role: {
      type: String,
      enum: [
        "customer",
        "super_admin",
        "order_manager",
        "inventory_manager",
        "content_manager",
        "marketing_manager",
      ],
      default: "customer",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },
    lastLogin: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    permissions: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

userSchema.virtual("profileImageUrl").get(function () {
  return this.userImage ? this.userImage.secureUrl : null;
});

userSchema.virtual("profileImagePublicId").get(function () {
  return this.userImage ? this.userImage.publicId : null;
});

const userModel = mongoose.model("users", userSchema);
module.exports = userModel;
