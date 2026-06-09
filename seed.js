/**
 * seed.js — Roshini's Home Products
 *
 * Creates the first super admin user.
 * Run once during initial setup: node seed.js
 *
 * Required environment variables (set in .env):
 *   SEED_ADMIN_EMAIL    — email for the super admin account
 *   SEED_ADMIN_PASSWORD — password (min 8 chars recommended)
 *   SEED_ADMIN_NAME     — display name (default: "Admin")
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const userModel = require("./models/users");

const DATABASE = process.env.DATABASE || "mongodb://127.0.0.1:27017/roshinis_ecommerce";
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const plainPassword = process.env.SEED_ADMIN_PASSWORD;
const adminName = process.env.SEED_ADMIN_NAME || "Admin";

// Fail-fast: refuse to seed without credentials in env
if (!adminEmail || !plainPassword) {
  console.error(
    "[seed.js] ERROR: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env before running this script."
  );
  process.exit(1);
}

if (plainPassword.length < 8) {
  console.error("[seed.js] ERROR: SEED_ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

mongoose
  .connect(DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(async () => {
    console.log("[seed.js] Connected to MongoDB.");

    const existingAdmin = await userModel.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("[seed.js] Admin user already exists:", existingAdmin.email);
      process.exit(0);
    }

    const hashedPassword = bcrypt.hashSync(plainPassword, 12);

    const adminUser = new userModel({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      userRole: 1,
      role: "super_admin",
      status: "active",
    });

    await adminUser.save();
    console.log("[seed.js] Super admin created successfully:", adminEmail);
    process.exit(0);
  })
  .catch((err) => {
    console.error("[seed.js] Database connection error:", err.message);
    process.exit(1);
  });
