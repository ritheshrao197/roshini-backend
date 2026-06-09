const bcrypt = require("bcryptjs");
const userModel = require("../models/users");
const orderModel = require("../models/orders");
const AuditLog = require("../models/auditLog");
const logAudit = require("../config/auditLogger");
const { ROLES } = require("../config/permissions");

class UserManagementController {
  // ─────────────────────────────────────────────────
  // 1. LIST USERS (paginated, searchable, filterable)
  // ─────────────────────────────────────────────────
  async listUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search = "",
        role = "",
        status = "",
        sort = "-createdAt",
      } = req.query;

      const query = {};

      // Text search on name or email
      if (search.trim()) {
        query.$or = [
          { name: { $regex: search.trim(), $options: "i" } },
          { email: { $regex: search.trim(), $options: "i" } },
        ];
      }

      // Role filter
      if (role && Object.values(ROLES).includes(role)) {
        query.role = role;
      }

      // Status filter
      if (status && ["active", "inactive", "blocked"].includes(status)) {
        query.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await userModel.countDocuments(query);

      const users = await userModel
        .find(query)
        .select(
          "name email phoneNumber role status userRole lastLogin createdAt createdBy"
        )
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      return res.status(200).json({
        success: true,
        users,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      });
    } catch (err) {
      console.error("listUsers Error:", err);
      return res.status(500).json({ error: "Failed to fetch users." });
    }
  }

  // ─────────────────────────────────────────────────
  // 2. CREATE USER (admin-initiated)
  // ─────────────────────────────────────────────────
  async createUser(req, res) {
    try {
      const { name, email, phoneNumber, role = "customer", tempPassword } = req.body;

      if (!name || !email || !tempPassword) {
        return res
          .status(400)
          .json({ error: "name, email and tempPassword are required." });
      }

      // Duplicate email guard
      const existing = await userModel.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ error: "A user with this email already exists." });
      }

      // Validate role
      if (!Object.values(ROLES).includes(role)) {
        return res.status(400).json({ error: "Invalid role specified." });
      }

      const hashedPassword = bcrypt.hashSync(tempPassword, 10);
      const isAdminRole = role !== "customer";

      const newUser = new userModel({
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        phoneNumber: phoneNumber || null,
        role,
        // Keep legacy userRole in sync
        userRole: isAdminRole ? 1 : 0,
        status: "active",
        createdBy: req.user._id,
      });

      await newUser.save();

      await logAudit({
        adminId: req.user._id,
        action: "USER_CREATED",
        entityType: "user",
        entityId: newUser._id,
        oldValue: null,
        newValue: { name, email, role },
        ipAddress: req.ip,
      });

      return res.status(201).json({
        success: true,
        message: "User created successfully.",
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
        },
      });
    } catch (err) {
      console.error("createUser Error:", err);
      return res.status(500).json({ error: "Failed to create user." });
    }
  }

  // ─────────────────────────────────────────────────
  // 3. GET USER DETAIL (profile + order stats)
  // ─────────────────────────────────────────────────
  async getUserDetail(req, res) {
    try {
      const { id } = req.params;

      const user = await userModel
        .findById(id)
        .select(
          "name email phoneNumber role status userRole lastLogin createdAt createdBy"
        )
        .lean();

      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      // Aggregate order statistics
      const orderStats = await orderModel.aggregate([
        { $match: { user: user._id } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: "$amount" },
          },
        },
      ]);

      const latestOrder = await orderModel
        .findOne({ user: user._id })
        .sort({ createdAt: -1 })
        .select("amount status paymentStatus createdAt")
        .lean();

      const stats =
        orderStats.length > 0
          ? orderStats[0]
          : { totalOrders: 0, totalSpent: 0 };

      return res.status(200).json({
        success: true,
        user,
        orderStats: {
          totalOrders: stats.totalOrders,
          totalSpent: stats.totalSpent,
          latestOrder: latestOrder || null,
        },
      });
    } catch (err) {
      console.error("getUserDetail Error:", err);
      return res.status(500).json({ error: "Failed to fetch user details." });
    }
  }

  // ─────────────────────────────────────────────────
  // 4. UPDATE USER (role, status, phone)
  // ─────────────────────────────────────────────────
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { role, status, phoneNumber } = req.body;
      const adminId = req.user._id.toString();

      // Self-demotion guard: a super_admin cannot remove their own super_admin role
      if (adminId === id && role && role !== "super_admin") {
        return res.status(400).json({
          error:
            "You cannot change your own super_admin role. Ask another super admin.",
        });
      }

      const targetUser = await userModel.findById(id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found." });
      }

      const oldSnapshot = {
        role: targetUser.role,
        status: targetUser.status,
        phoneNumber: targetUser.phoneNumber,
      };

      // Apply updates
      if (role && Object.values(ROLES).includes(role)) {
        targetUser.role = role;
        // Keep legacy userRole in sync
        targetUser.userRole = role === "customer" ? 0 : 1;
      }
      if (status && ["active", "inactive", "blocked"].includes(status)) {
        targetUser.status = status;
      }
      if (phoneNumber !== undefined) {
        targetUser.phoneNumber = phoneNumber;
      }

      await targetUser.save();

      // Determine audit action
      let auditAction = "USER_UPDATED";
      if (status === "blocked") auditAction = "USER_BLOCKED";
      else if (status === "active" && oldSnapshot.status !== "active")
        auditAction = "USER_ACTIVATED";
      else if (status === "inactive") auditAction = "USER_DEACTIVATED";
      else if (role && role !== oldSnapshot.role) auditAction = "ROLE_CHANGED";

      await logAudit({
        adminId: req.user._id,
        action: auditAction,
        entityType: "user",
        entityId: id,
        oldValue: oldSnapshot,
        newValue: { role, status, phoneNumber },
        ipAddress: req.ip,
      });

      return res.status(200).json({
        success: true,
        message: "User updated successfully.",
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          status: targetUser.status,
          phoneNumber: targetUser.phoneNumber,
        },
      });
    } catch (err) {
      console.error("updateUser Error:", err);
      return res.status(500).json({ error: "Failed to update user." });
    }
  }

  // ─────────────────────────────────────────────────
  // 5. BULK ACTION (super_admin only)
  // ─────────────────────────────────────────────────
  async bulkAction(req, res) {
    try {
      const { ids, action } = req.body; // action: "activate" | "deactivate" | "block"
      const adminId = req.user._id.toString();

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids must be a non-empty array." });
      }

      const allowedActions = ["activate", "deactivate", "block"];
      if (!allowedActions.includes(action)) {
        return res
          .status(400)
          .json({ error: `action must be one of: ${allowedActions.join(", ")}` });
      }

      // Prevent self-blocking
      const safeIds = ids.filter((id) => id.toString() !== adminId);

      const statusMap = {
        activate: "active",
        deactivate: "inactive",
        block: "blocked",
      };

      await userModel.updateMany(
        { _id: { $in: safeIds } },
        { $set: { status: statusMap[action] } }
      );

      const auditMap = {
        activate: "USER_ACTIVATED",
        deactivate: "USER_DEACTIVATED",
        block: "USER_BLOCKED",
      };

      await logAudit({
        adminId: req.user._id,
        action: "BULK_ACTION",
        entityType: "user",
        entityId: null,
        oldValue: null,
        newValue: { action, count: safeIds.length, ids: safeIds },
        ipAddress: req.ip,
      });

      return res.status(200).json({
        success: true,
        message: `${safeIds.length} user(s) ${action}d successfully.`,
        affected: safeIds.length,
      });
    } catch (err) {
      console.error("bulkAction Error:", err);
      return res.status(500).json({ error: "Bulk action failed." });
    }
  }

  // ─────────────────────────────────────────────────
  // 6. EXPORT USERS CSV (super_admin only)
  // ─────────────────────────────────────────────────
  async exportUsersCSV(req, res) {
    try {
      const { role = "", status = "" } = req.query;
      const query = {};
      if (role) query.role = role;
      if (status) query.status = status;

      const users = await userModel
        .find(query)
        .select("name email phoneNumber role status lastLogin createdAt")
        .sort("-createdAt")
        .lean();

      let csv =
        "Name,Email,Phone,Role,Status,Last Login,Created Date\n";

      for (const u of users) {
        const lastLogin = u.lastLogin
          ? new Date(u.lastLogin).toLocaleDateString("en-IN")
          : "Never";
        const createdAt = new Date(u.createdAt).toLocaleDateString("en-IN");
        csv += `"${u.name}","${u.email}","${u.phoneNumber || ""}","${u.role}","${u.status}","${lastLogin}","${createdAt}"\n`;
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=roshinis_users_export.csv"
      );
      return res.status(200).send(csv);
    } catch (err) {
      console.error("exportUsersCSV Error:", err);
      return res.status(500).json({ error: "Failed to export users." });
    }
  }

  // ─────────────────────────────────────────────────
  // 7. LIST CUSTOMERS (with order aggregates)
  // ─────────────────────────────────────────────────
  async listCustomers(req, res) {
    try {
      const {
        filter = "recent", // "recent" | "top" | "inactive"
        page = 1,
        limit = 20,
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Base: only customers
      const baseQuery = { $or: [{ role: "customer" }, { userRole: 0 }] };

      if (filter === "inactive") {
        // Customers who haven't logged in within 90 days
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        baseQuery.lastLogin = { $lt: ninetyDaysAgo };
      }

      const total = await userModel.countDocuments(baseQuery);

      let customers;

      if (filter === "top") {
        // Aggregate to find customers with highest order spend
        customers = await orderModel.aggregate([
          {
            $group: {
              _id: "$user",
              totalOrders: { $sum: 1 },
              totalSpent: { $sum: "$amount" },
              lastOrderDate: { $max: "$createdAt" },
            },
          },
          { $sort: { totalSpent: -1 } },
          { $skip: skip },
          { $limit: parseInt(limit) },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "userInfo",
            },
          },
          { $unwind: { path: "$userInfo", preserveNullAndEmpty: true } },
          {
            $project: {
              _id: "$userInfo._id",
              name: "$userInfo.name",
              email: "$userInfo.email",
              phoneNumber: "$userInfo.phoneNumber",
              status: "$userInfo.status",
              createdAt: "$userInfo.createdAt",
              lastLogin: "$userInfo.lastLogin",
              totalOrders: 1,
              totalSpent: 1,
              lastOrderDate: 1,
            },
          },
        ]);
      } else {
        const sortMap = { recent: "-createdAt", inactive: "-lastLogin" };
        customers = await userModel
          .find(baseQuery)
          .select(
            "name email phoneNumber status createdAt lastLogin"
          )
          .sort(sortMap[filter] || "-createdAt")
          .skip(skip)
          .limit(parseInt(limit))
          .lean();
      }

      return res.status(200).json({
        success: true,
        customers,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        filter,
      });
    } catch (err) {
      console.error("listCustomers Error:", err);
      return res.status(500).json({ error: "Failed to fetch customers." });
    }
  }

  // ─────────────────────────────────────────────────
  // 8. LIST AUDIT LOGS (super_admin only)
  // ─────────────────────────────────────────────────
  async listAuditLogs(req, res) {
    try {
      const { page = 1, limit = 30, action = "", entityType = "" } = req.query;
      const query = {};
      if (action) query.action = action;
      if (entityType) query.entityType = entityType;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await AuditLog.countDocuments(query);

      const logs = await AuditLog.find(query)
        .populate("adminId", "name email")
        .sort("-timestamp")
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      return res.status(200).json({
        success: true,
        logs,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      });
    } catch (err) {
      console.error("listAuditLogs Error:", err);
      return res.status(500).json({ error: "Failed to fetch audit logs." });
    }
  }
}

const userManagementController = new UserManagementController();
module.exports = userManagementController;
