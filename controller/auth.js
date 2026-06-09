const { toTitleCase, validateEmail } = require("../config/function");
const bcrypt = require("bcryptjs");
const userModel = require("../models/users");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/keys");
const logAudit = require("../config/auditLogger");

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
                userRole: 1, // Field Name change to userRole from role
              });
              newUser
                .save()
                .then((data) => {
                  return res.json({
                    success: "Account create successfully. Please login",
                  });
                })
                .catch((err) => {
                  console.log(err);
                });
            }
          } catch (err) {
            console.log(err);
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

        const token = jwt.sign(
          { _id: data._id, role: data.userRole, rbacRole: effectiveRole },
          JWT_SECRET,
          { expiresIn: "7d" }
        );
        const encode = jwt.verify(token, JWT_SECRET);

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

        // Set secure HTTP-only cookie
        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return res.json({
          token: token,
          user: encode,
        });
      } else {
        return res.json({
          error: "Invalid email or password",
        });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async logout(req, res) {
    res.clearCookie("token");
    return res.json({ message: "Logged out successfully" });
  }
}

const authController = new Auth();
module.exports = authController;
