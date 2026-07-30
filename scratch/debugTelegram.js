const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const telegramService = require("../services/telegramService");
const orderModel = require("../models/orders");

async function debug() {
  try {
    await mongoose.connect(process.env.DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    console.log("Connected to DB!");

    const latestOrder = await orderModel.findOne().sort({ createdAt: -1 });
    if (!latestOrder) {
      console.log("No orders found!");
      return;
    }

    console.log(`Testing Telegram notification for latest order ID: ${latestOrder._id}`);
    await telegramService.sendOrderNotification(latestOrder._id);
    console.log("Finished sending notification test!");
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

debug();
