const express = require("express");
const router = express.Router();
const ctrl = require("../controller/userManagement");
const authorize = require("../middleware/authorize");

const SUPER_ADMIN = ["super_admin"];
const MANAGERS = ["super_admin", "order_manager"];

// ── User Management ──────────────────────────────────────────────────────────

// GET  /api/admin/users          — list all users (paginated + filterable)
router.get("/admin/users", authorize(MANAGERS), ctrl.listUsers);

// POST /api/admin/users          — create a new staff/admin user
router.post("/admin/users", authorize(SUPER_ADMIN), ctrl.createUser);

// GET  /api/admin/users/export   — CSV export (must come BEFORE /:id)
router.get("/admin/users/export", authorize(SUPER_ADMIN), ctrl.exportUsersCSV);

// POST /api/admin/users/bulk     — bulk status change
router.post("/admin/users/bulk", authorize(SUPER_ADMIN), ctrl.bulkAction);

// GET  /api/admin/users/:id      — single user detail + order stats
router.get("/admin/users/:id", authorize(MANAGERS), ctrl.getUserDetail);

// PUT  /api/admin/users/:id      — update role / status / phone
router.put("/admin/users/:id", authorize(SUPER_ADMIN), ctrl.updateUser);

// ── Customer Management ───────────────────────────────────────────────────────

// GET  /api/admin/customers      — customer list with order aggregates
router.get("/admin/customers", authorize(MANAGERS), ctrl.listCustomers);

// ── Audit Logs ────────────────────────────────────────────────────────────────

// GET  /api/admin/audit-logs     — paginated audit log viewer
router.get("/admin/audit-logs", authorize(SUPER_ADMIN), ctrl.listAuditLogs);

module.exports = router;
