const AuditLog = require("../models/auditLog");

async function logAudit({
  adminId,
  action,
  entityType,
  entityId = null,
  oldValue = null,
  newValue = null,
  ipAddress = null,
}) {
  try {
    const { auditQueue, queueAvailable } = require("./queue");
    if (queueAvailable && auditQueue) {
      await auditQueue.add("logAudit", {
        adminId,
        action,
        entityType,
        entityId: entityId ? entityId.toString() : null,
        oldValue,
        newValue,
        ipAddress,
      });
    } else {
      await AuditLog.create({
        adminId,
        action,
        entityType,
        entityId: entityId ? entityId.toString() : null,
        oldValue,
        newValue,
        ipAddress,
      });
    }
  } catch (err) {
    // Never let audit logging break the main request flow
    console.error("[AuditLogger] Failed to write audit log:", err.message);
  }
}

module.exports = logAudit;
