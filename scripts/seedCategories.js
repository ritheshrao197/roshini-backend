const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const vlogCategoryModel = require("../models/vlogCategories");

const DATABASE = process.env.DATABASE || "mongodb://127.0.0.1:27017/roshinis_ecommerce";

const categories = [
  "Health Tips",
  "Recipes",
  "Nutrition News",
  "Product Guides",
  "Ingredient Spotlight",
  "Seasonal Articles",
  "Healthy Lifestyle",
  "Customer Stories",
  "Announcements"
];

async function seed() {
  try {
    console.log("[seedCategories.js] Connecting to database...");
    await mongoose.connect(DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    console.log("[seedCategories.js] Connected successfully!");

    for (const name of categories) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      let existing = await vlogCategoryModel.findOne({ 
        $or: [
          { cName: name },
          { slug: slug }
        ]
      });

      if (!existing) {
        const newCat = new vlogCategoryModel({
          cName: name,
          cDescription: `Blogs related to ${name}`,
          slug: slug,
          cStatus: "Active"
        });
        await newCat.save();
        console.log(`[seedCategories.js] Created category: ${name}`);
      } else {
        console.log(`[seedCategories.js] Category already exists: ${name}`);
      }
    }

    console.log("[seedCategories.js] Seeding completed!");
    process.exit(0);
  } catch (err) {
    console.error("[seedCategories.js] Error seeding database:", err);
    process.exit(1);
  }
}

seed();
