const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const orderModel = require("../models/orders");
require("../models/products");
require("../models/users");

async function check() {
  try {
    await mongoose.connect(process.env.DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    console.log("Connected successfully!");

    const orders = await orderModel.find().sort({ createdAt: -1 }).limit(3);
    console.log("LAST 3 ORDERS:");
    orders.forEach((o, i) => {
      console.log(`\n--- Order ${i+1} ---`);
      console.log(`ID: ${o._id}`);
      console.log(`Number: ${o.orderNumber}`);
      console.log(`Amount: ₹${o.amount}`);
      console.log(`Status: ${o.status}`);
      console.log(`Payment Status: ${o.paymentStatus}`);
      console.log(`Phone: ${o.phone}`);
      console.log(`Created At: ${o.createdAt}`);
    });
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
