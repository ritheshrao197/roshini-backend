const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const orderController = require("../controller/orders");
const productModel = require("../models/products");
const userModel = require("../models/users");
require("../models/orders");

async function runSim() {
  try {
    await mongoose.connect(process.env.DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    console.log("Connected successfully!");

    // Find a real user
    const user = await userModel.findOne();
    // Find a real product
    const product = await productModel.findOne();

    if (!user || !product) {
      console.error("Need at least 1 user and 1 product in DB");
      return;
    }

    console.log(`Using User: ${user._id}, Product: ${product._id}`);

    // Mock request and response
    const req = {
      body: {
        allProduct: [{ id: product._id.toString(), quantitiy: 1 }],
        user: user._id.toString(),
        transactionId: "TEST_" + Date.now(),
        address: "Test Address Line 1, City, State - 123456",
        phone: "9591896917",
        couponCode: "", // Empty or no coupon first
        amount: 0
      }
    };

    const res = {
      status: function(code) {
        console.log(`[Response Status]: ${code}`);
        return this;
      },
      json: function(data) {
        console.log("[Response JSON]:", data);
        return this;
      }
    };

    console.log("Calling postCreateOrder...");
    await orderController.postCreateOrder(req, res);
    console.log("Execution finished successfully without crashing!");
  } catch (err) {
    console.error("[CRASH DETECTED]:", err);
  } finally {
    await mongoose.disconnect();
  }
}

runSim();
