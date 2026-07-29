const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const couponModel = require("../models/coupon");

async function check() {
  try {
    await mongoose.connect(process.env.DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    console.log("Connected successfully!");

    const coupon = await mongoose.connection.db.collection("coupons").findOne({ code: "RDX" });
    console.log("RDX Coupon details:", coupon);
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
