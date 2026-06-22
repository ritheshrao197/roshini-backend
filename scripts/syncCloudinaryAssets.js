const path = require("path");
const mongoose = require("mongoose");

// Load environment variables relative to this script
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { cloudinary } = require("../services/cloudinaryUpload");

// Import models
const productModel = require("../models/products");
const categoryModel = require("../models/categories");
const vlogModel = require("../models/vlogs");
const heroSliderModel = require("../models/heroSlider");
const userModel = require("../models/users");

async function getAllCloudinaryPublicIds() {
  let publicIds = [];
  let nextCursor = null;
  do {
    const options = {
      type: "upload",
      max_results: 500,
    };
    if (nextCursor) {
      options.next_cursor = nextCursor;
    }
    const response = await cloudinary.api.resources(options);
    publicIds.push(...response.resources.map((res) => res.public_id));
    nextCursor = response.next_cursor;
  } while (nextCursor);

  return publicIds;
}

async function syncCloudinaryAssets() {
  console.log("==================================================");
  console.log("     RUNNING CLOUDINARY ASSETS SYNCHRONIZATION     ");
  console.log("==================================================");

  if (!process.env.DATABASE) {
    console.error("[FATAL] DATABASE environment variable is not defined");
    process.exit(1);
  }

  try {
    // Connect to DB
    await mongoose.connect(process.env.DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false
    });
    console.log("[DB] Connected successfully to Database.");

    // Fetch all referenced public IDs in MongoDB
    const referencedPublicIds = new Set();

    // 1. Products
    const products = await productModel.find({});
    products.forEach((p) => {
      if (p.image && p.image.publicId) referencedPublicIds.add(p.image.publicId);
      if (p.images && Array.isArray(p.images)) {
        p.images.forEach((img) => {
          if (img.publicId) referencedPublicIds.add(img.publicId);
        });
      }
    });

    // 2. Categories
    const categories = await categoryModel.find({});
    categories.forEach((c) => {
      if (c.image && c.image.publicId) referencedPublicIds.add(c.image.publicId);
    });

    // 3. Vlogs
    const vlogs = await vlogModel.find({});
    vlogs.forEach((v) => {
      if (v.image && v.image.publicId) referencedPublicIds.add(v.image.publicId);
    });

    // 4. HeroSliders (Banners)
    const sliders = await heroSliderModel.find({});
    sliders.forEach((s) => {
      if (s.desktopImage && s.desktopImage.publicId) referencedPublicIds.add(s.desktopImage.publicId);
      if (s.mobileImage && s.mobileImage.publicId) referencedPublicIds.add(s.mobileImage.publicId);
    });

    // 5. Users
    const users = await userModel.find({});
    users.forEach((u) => {
      if (u.userImage && u.userImage.publicId) referencedPublicIds.add(u.userImage.publicId);
    });

    console.log(`[DB] Compiled ${referencedPublicIds.size} unique image references from database.`);

    // Fetch all public IDs in Cloudinary
    console.log("[Cloudinary] Fetching all uploaded assets...");
    const cloudinaryPublicIds = await getAllCloudinaryPublicIds();
    console.log(`[Cloudinary] Found ${cloudinaryPublicIds.length} assets in your Cloudinary account.`);

    // Find orphaned assets
    const orphanedAssets = [];
    cloudinaryPublicIds.forEach((pId) => {
      if (!referencedPublicIds.has(pId)) {
        orphanedAssets.push(pId);
      }
    });

    console.log("\n==================== REPORT ====================");
    if (orphanedAssets.length === 0) {
      console.log("No orphaned Cloudinary assets found! Clean sweep! 🎉");
    } else {
      console.warn(`Found ${orphanedAssets.length} unused/orphaned assets in Cloudinary:\n`);
      orphanedAssets.forEach((pId) => {
        console.log(`  - ${pId}`);
      });
      console.log("\nNote: These assets are NOT referenced in your MongoDB.");
      console.log("Manual verification is recommended before deleting these assets.");
    }
    console.log("==================================================");
  } catch (err) {
    console.error("[Sync] Sync failed with error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("[DB] Disconnected.");
  }
}

syncCloudinaryAssets();
