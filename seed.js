require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const userModel = require("./models/users");

const DATABASE = process.env.DATABASE || "mongodb://127.0.0.1:27017/ecommerce";

mongoose.connect(DATABASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
})
.then(async () => {
  console.log("Connected to MongoDB successfully for seeding.");
  
  const adminEmail = "admin@gmail.com";
  const plainPassword = "admin123";
  
  // Check if admin already exists
  const existingAdmin = await userModel.findOne({ email: adminEmail });
  if (existingAdmin) {
    console.log("Admin user already exists:", existingAdmin.email);
    process.exit(0);
  }
  
  const hashedPassword = bcrypt.hashSync(plainPassword, 10);
  
  const adminUser = new userModel({
    name: "Admin",
    email: adminEmail,
    password: hashedPassword,
    userRole: 1, // 1 is Admin, 0 is Customer
  });
  
  await adminUser.save();
  console.log("Admin user seeded successfully!");
  console.log("Email: " + adminEmail);
  console.log("Password: " + plainPassword);
  process.exit(0);
})
.catch((err) => {
  console.error("Error seeding admin:", err);
  process.exit(1);
});
