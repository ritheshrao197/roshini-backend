const { toTitleCase, validateEmail } = require("../config/function");
const bcrypt = require("bcryptjs");
const userModel = require("../models/users");
const jwt = require("jsonwebtoken");
const EmailService = require("../services/emailService");
const { JWT_SECRET } = require("../config/keys");
const logAudit = require("../config/auditLogger");
const refreshTokenModel = require("../models/refreshToken");
const crypto = require("crypto");

class Auth {
  async isAdmin(req, res) {
    let { loggedInUserId } = req.body;
    try {
      let loggedInUserRole = await userModel.findById(loggedInUserId);
      res.json({ role: loggedInUserRole.userRole });
    } catch {
      res.status(404);
    }
  }

  async allUser(req, res) {
    try {
      let allUser = await userModel.find({});
      res.json({ users: allUser });
    } catch {
      res.status(404);
    }
  }

  /* User Registration/Signup controller  */
  async postSignup(req, res) {
    let { name, email, password, cPassword } = req.body;
    let error = {};
    if (!name || !email || !password || !cPassword) {
      error = {
        ...error,
        name: "Filed must not be empty",
        email: "Filed must not be empty",
        password: "Filed must not be empty",
        cPassword: "Filed must not be empty",
      };
      return res.json({ error });
    }
    if (name.length < 3 || name.length > 25) {
      error = { ...error, name: "Name must be 3-25 charecter" };
      return res.json({ error });
    } else {
      if (validateEmail(email)) {
        name = toTitleCase(name);
        if ((password.length > 255) | (password.length < 8)) {
          error = {
            ...error,
            password: "Password must be 8 charecter",
            name: "",
            email: "",
          };
          return res.json({ error });
        } else {
          // If Email & Number exists in Database then:
          try {
            password = bcrypt.hashSync(password, 10);
            const data = await userModel.findOne({ email: email });
            if (data) {
              error = {
                ...error,
                password: "",
                name: "",
                email: "Email already exists",
              };
              return res.json({ error });
            } else {
              let newUser = new userModel({
                name,
                email,
                password,
                // ========= Here role 1 for admin signup role 0 for customer signup =========
                userRole: 0,
              });
              newUser
                .save()
                .then((data) => {
                  EmailService.sendWelcomeEmail(data.email, data.name);
                  return res.json({
                    success: "Account create successfully. Please login",
                  });
                })
                .catch((err) => {
                  console.error("[AuthController] Signup save error:", err);
                });
            }
          } catch (err) {
            console.error("[AuthController] Signup error:", err);
          }
        }
      } else {
        error = {
          ...error,
          password: "",
          name: "",
          email: "Email is not valid",
        };
        return res.json({ error });
      }
    }
  }

  /* User Login/Signin controller  */
  async postSignin(req, res) {
    let { email, password } = req.body;
    if (!email || !password) {
      return res.json({
        error: "Fields must not be empty",
      });
    }
    try {
      const data = await userModel.findOne({ email: email });
      if (!data) {
        return res.json({
          error: "Invalid email or password",
        });
      }

      // ── RBAC: Block check ──
      if (data.status === "blocked") {
        await logAudit({
          adminId: data._id,
          action: "LOGIN_FAILED",
          entityType: "user",
          entityId: data._id,
          oldValue: null,
          newValue: { reason: "account_blocked" },
        });
        return res.json({
          error: "Your account has been blocked. Please contact support.",
        });
      }

      const login = await bcrypt.compare(password, data.password);
      if (login) {
        // ── RBAC: Determine effective role for JWT payload ──
        const effectiveRole = data.role && data.role !== "customer"
          ? data.role
          : data.userRole === 1
          ? "super_admin"
          : "customer";

        // Generate Access Token (15 mins)
        const accessToken = jwt.sign(
          { _id: data._id, role: data.userRole, rbacRole: effectiveRole },
          JWT_SECRET,
          { expiresIn: "15m" }
        );
        const encode = jwt.verify(accessToken, JWT_SECRET);

        // Generate Refresh Token (7 days)
        const newRefreshToken = crypto.randomBytes(40).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await refreshTokenModel.create({
          token: newRefreshToken,
          userId: data._id,
          expiresAt,
        });

        // ── RBAC: Record lastLogin ──
        await userModel.findByIdAndUpdate(data._id, { lastLogin: new Date() });

        await logAudit({
          adminId: data._id,
          action: "LOGIN",
          entityType: "user",
          entityId: data._id,
          oldValue: null,
          newValue: { role: effectiveRole },
        });

        // Cookie Configuration
        const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
        const secureCookie = process.env.NODE_ENV === "production";

        res.cookie("token", accessToken, {
          httpOnly: true,
          secure: secureCookie,
          sameSite: "lax",
          domain: cookieDomain,
          maxAge: 15 * 60 * 1000,
        });

        res.cookie("refreshToken", newRefreshToken, {
          httpOnly: true,
          secure: secureCookie,
          sameSite: "lax",
          domain: cookieDomain,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.json({
          token: accessToken,
          user: encode,
        });
      } else {
        return res.json({
          error: "Invalid email or password",
        });
      }
    } catch (err) {
      console.error("[AuthController] Signin error:", err);
    }
  }

  async refreshTokenRotate(req, res) {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token required", code: "REFRESH_TOKEN_REQUIRED" });
    }

    try {
      const storedToken = await refreshTokenModel.findOne({ token: refreshToken });
      if (!storedToken) {
        return res.status(401).json({ error: "Invalid refresh token", code: "INVALID_REFRESH_TOKEN" });
      }

      if (storedToken.expiresAt < new Date()) {
        await refreshTokenModel.deleteOne({ _id: storedToken._id });
        return res.status(401).json({ error: "Refresh token expired", code: "REFRESH_TOKEN_EXPIRED" });
      }

      // Rotate Refresh Token (invalidate old)
      await refreshTokenModel.deleteOne({ _id: storedToken._id });

      const user = await userModel.findById(storedToken.userId);
      if (!user || user.status === "blocked" || user.status === "inactive") {
        return res.status(403).json({ error: "User account is disabled or blocked", code: "USER_DISABLED" });
      }

      const effectiveRole = user.role && user.role !== "customer"
        ? user.role
        : user.userRole === 1
        ? "super_admin"
        : "customer";

      // Issue new Access Token (15 mins) and new Refresh Token (7 days)
      const newAccessToken = jwt.sign(
        { _id: user._id, role: user.userRole, rbacRole: effectiveRole },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      const newRefreshToken = crypto.randomBytes(40).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await refreshTokenModel.create({
        token: newRefreshToken,
        userId: user._id,
        expiresAt,
      });

      const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
      const secureCookie = process.env.NODE_ENV === "production";

      res.cookie("token", newAccessToken, {
        httpOnly: true,
        secure: secureCookie,
        sameSite: "lax",
        domain: cookieDomain,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: secureCookie,
        sameSite: "lax",
        domain: cookieDomain,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        token: newAccessToken,
        user: jwt.verify(newAccessToken, JWT_SECRET),
      });
    } catch (err) {
      console.error("[AuthController] Refresh token rotation error:", err);
      return res.status(500).json({ error: "Refresh token rotation failed" });
    }
  }

  async logout(req, res) {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      try {
        await refreshTokenModel.deleteOne({ token: refreshToken });
      } catch (err) {
        console.error("[AuthController] Logout delete token error:", err);
      }
    }

    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
    res.clearCookie("token", { domain: cookieDomain });
    res.clearCookie("refreshToken", { domain: cookieDomain });
    return res.json({ message: "Logged out successfully" });
  }
}

const authController = new Auth();
module.exports = authController;
