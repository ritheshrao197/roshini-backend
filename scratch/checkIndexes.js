const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function check() {
  try {
    await mongoose.connect(process.env.DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    console.log("Connected successfully!");

    const indexes = await mongoose.connection.db.collection("orders").indexes();
    console.log("Orders collection indexes:", indexes);
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
