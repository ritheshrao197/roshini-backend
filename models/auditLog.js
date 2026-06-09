const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: ObjectId,
      ref: "users",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "USER_CREATED",
        "USER_UPDATED",
        "USER_BLOCKED",
        "USER_ACTIVATED",
        "USER_DEACTIVATED",
        "ROLE_CHANGED",
        "PASSWORD_RESET",
        "LOGIN",
        "LOGIN_FAILED",
        "BULK_ACTION",
      ],
    },
    entityType: {
      type: String,
      required: true,
      enum: ["user", "order", "product", "category", "coupon", "system"],
    },
    entityId: {
      type: String, // String so it works for any entity — not just ObjectId
      default: null,
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // No updatedAt needed for immutable audit logs
    timestamps: { createdAt: "timestamp", updatedAt: false },
  }
);

// Index for fast admin dashboard queries
auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1 });

const AuditLog = mongoose.model("auditlogs", auditLogSchema);
module.exports = AuditLog;
