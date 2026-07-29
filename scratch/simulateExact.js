const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const orderController = require("../controller/orders");

async function run() {
  await mongoose.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  });
  console.log("Connected!");

  const req = {
    body: {
      allProduct: [{ id: "6a394cfb7c5da3173cb93013", variantId: null, variantName: null, quantitiy: 1, price: 80 }],
      user: "6a50a187c7b6bf004689afc5",
      transactionId: "FREE_LOCALTEST_" + Date.now(),
      address: "rITHESH, SGAS  ARSG,  ASFDGAF G , bANAGLORE, KARNATAKA - 456123, India",
      phone: "7894561234",
      couponCode: "RDX",
      amount: 0
    }
  };

  const start = Date.now();
  const res = {
    status: (c) => { console.log("[Status]:", c); return res; },
    json: (d) => { console.log("[Response]:", JSON.stringify(d)); console.log("[Time taken]:", Date.now() - start, "ms"); return res; }
  };

  console.log("Calling postCreateOrder...");
  await orderController.postCreateOrder(req, res);
  await mongoose.disconnect();
}

run().catch(err => { console.error("CRASH:", err.message, err.stack); process.exit(1); });
