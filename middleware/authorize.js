const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/keys");
const userModel = require("../models/users");

/**
 * authorize(allowedRoles)
 * 
 * Factory that returns middleware enforcing role-based access.
 * Validates JWT → checks user status → checks role.
 * 
 * Usage:
 *   router.get("/admin/users", authorize(["super_admin", "order_manager"]), controller.listUsers);
 * 
 * @param {string[]} allowedRoles - array of role strings permitted to access the route
 */
const authorize = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // 1. Extract and verify JWT (reuses same logic as loginCheck)
      let token = req.cookies.token || req.headers.token;
      if (!token) {
        return res.status(401).json({ error: "Authentication required. Please log in." });
      }
      token = token.replace("Bearer ", "");

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
      }

      // 2. Fetch fresh user from DB (ensures we get current role/status — not stale JWT data)
      const user = await userModel.findById(decoded._id).select(
        "name email role status userRole permissions"
      );

      if (!user) {
        return res.status(401).json({ error: "User not found. Please log in again." });
      }

      // 3. Check account status
      if (user.status === "blocked") {
        return res.status(403).json({
          error: "Your account has been blocked. Please contact support.",
        });
      }

      if (user.status === "inactive") {
        return res.status(403).json({
          error: "Your account is inactive. Please contact an administrator.",
        });
      }

      // 4. Resolve effective role
      // New `role` field takes precedence; fall back to numeric userRole for legacy super_admin (userRole=1)
      let effectiveRole = user.role;
      if (!effectiveRole || effectiveRole === "customer") {
        if (user.userRole === 1) {
          effectiveRole = "super_admin";
        }
      }

      // 5. Check role authorization
      if (allowedRoles.length > 0 && !allowedRoles.includes(effectiveRole)) {
        return res.status(403).json({
          error: `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${effectiveRole}.`,
        });
      }

      // 6. Attach full user to request for downstream use
      req.user = user;
      req.user.effectiveRole = effectiveRole;
      req.userDetails = decoded; // keep backward compat with loginCheck pattern

      next();
    } catch (err) {
      console.error("Authorize Middleware Error:", err);
      return res.status(500).json({ error: "Authorization check failed." });
    }
  };
};

module.exports = authorize;
