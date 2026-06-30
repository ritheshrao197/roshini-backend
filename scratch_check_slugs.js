const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({}, { strict: false });
const productModel = mongoose.model("products", productSchema);

const DATABASE = process.env.DATABASE;

mongoose.connect(DATABASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  const products = await productModel.find({ isDeleted: { $ne: true } });
  console.log("PRODUCTS:", JSON.stringify(products.map(p => ({
    name: p.get("pName"),
    slug: p.get("slug"),
    status: p.get("pStatus")
  })), null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
