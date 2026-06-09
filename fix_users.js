require("dotenv").config();
const mongoose = require("mongoose");
const userModel = require("./models/users");

const DATABASE = process.env.DATABASE || "mongodb://127.0.0.1:27017/roshinis_ecommerce";

mongoose.connect(DATABASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
}).then(async () => {
  console.log("Connected to MongoDB");
  const users = await userModel.find({});
  let updatedCount = 0;
  for (const user of users) {
    if (user.role !== "super_admin" && user.userRole === 1) {
      console.log(`Fixing user ${user.email} from admin to customer`);
      user.userRole = 0;
      user.role = "customer";
      await user.save();
      updatedCount++;
    }
  }
  console.log(`Updated ${updatedCount} users.`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
