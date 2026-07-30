const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const PayUProvider = require("../services/payment/providers/payuProvider");
const payuProvider = new PayUProvider();
const userModel = require("../models/users");

async function test() {
  await mongoose.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  });
  console.log("Connected!");

  const user = await userModel.findOne();
  console.log("Found user:", user.name, "| Email:", user.email);

  const mockOrder = {
    amount: 100,
    phone: "9591896917",
    user: user._id, // Raw ObjectId (unpopulated)
    payment: {
      transactionId: "TEST_PAYU_123"
    }
  };

  try {
    const payload = await payuProvider.initiatePayment(mockOrder);
    console.log("PayU Payload Email:", payload.email);
    console.log("PayU Payload Firstname:", payload.firstname);
    if (payload.email === user.email) {
      console.log("SUCCESS: Real user email matched!", payload.email);
    } else {
      console.error("FAIL: Email did not match!", payload.email, "vs", user.email);
    }
  } catch (err) {
    console.error("PayU Test Error:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

test();
