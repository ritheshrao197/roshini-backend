const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const orderModel = require("../models/orders");
require("../models/products");
require("../models/users");
const telegramService = require("../services/telegramService");

async function runTest() {
  console.log("Connecting to MongoDB database...");
  try {
    await mongoose.connect(process.env.DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    console.log("Connected successfully!");

    console.log("Fetching latest order from database...");
    const latestOrder = await orderModel.findOne().sort({ _id: -1 });

    if (!latestOrder) {
      console.warn("No orders found in database to test with. Creating a dummy order...");
      return;
    }

    console.log(`Found order ID: ${latestOrder._id}. Sending notification to Telegram...`);
    await telegramService.sendOrderNotification(latestOrder._id);
    console.log("Done!");
  } catch (err) {
    console.error("Test failed with error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database.");
  }
}

runTest();
