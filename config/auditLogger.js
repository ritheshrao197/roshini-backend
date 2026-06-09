const AuditLog = require("../models/auditLog");

/**
 * Log an admin action to the audit trail.
 * Fire-and-forget — never throws, never blocks the request.
 *
 * @param {object} params
 * @param {string} params.adminId    - ID of the admin performing the action
 * @param {string} params.action     - Action enum (see AuditLog model)
 * @param {string} params.entityType - Entity type (user / order / product / ...)
 * @param {string} [params.entityId] - ID of the affected entity
 * @param {*}      [params.oldValue] - Previous value (for diffs)
 * @param {*}      [params.newValue] - New value (for diffs)
 * @param {string} [params.ipAddress] - Request IP
 */
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
    await AuditLog.create({
      adminId,
      action,
      entityType,
      entityId: entityId ? entityId.toString() : null,
      oldValue,
      newValue,
      ipAddress,
    });
  } catch (err) {
    // Never let audit logging break the main request flow
    console.error("[AuditLogger] Failed to write audit log:", err.message);
  }
}

module.exports = logAudit;
