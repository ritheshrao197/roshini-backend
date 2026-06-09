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
      type: String,
      default: "user.png",
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

const userModel = mongoose.model("users", userSchema);
module.exports = userModel;
