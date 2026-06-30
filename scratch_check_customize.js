const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");

const customizeSchema = new mongoose.Schema({}, { strict: false });
const customizeModel = mongoose.model("customizes", customizeSchema);

const DATABASE = process.env.DATABASE;

mongoose.connect(DATABASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  const settings = await customizeModel.find({});
  console.log("ALL CUSTOMIZE DOCUMENTS:", JSON.stringify(settings, null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
