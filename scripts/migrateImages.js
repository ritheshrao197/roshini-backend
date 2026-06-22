const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

// Load environment variables relative to this script
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { uploadImage } = require("../services/cloudinaryUpload");

// Import models
const productModel = require("../models/products");
const categoryModel = require("../models/categories");
const vlogModel = require("../models/vlogs");
const heroSliderModel = require("../models/heroSlider");
const userModel = require("../models/users");

const isDryRun = process.argv.includes("--dry-run");

// Helper to extract Cloudinary public ID from URL
function getPublicIdFromUrl(url) {
  if (!url || !url.includes("res.cloudinary.com")) return null;
  // Match standard upload urls e.g., /upload/v12345/folder/name.png
  const regex = /\/v\d+\/([^\s?#]+)\.[a-z0-9]+($|[?#])/i;
  const match = url.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  const fallbackRegex = /\/upload\/([^\s?#]+)\.[a-z0-9]+($|[?#])/i;
  const fallbackMatch = url.match(fallbackRegex);
  if (fallbackMatch && fallbackMatch[1]) {
    return fallbackMatch[1];
  }
  return null;
}

// Helper to process a single image URL or path
async function processImage(imageValue, folderName, fallbackAlt = "Image") {
  if (!imageValue || typeof imageValue !== "string") {
    // If it's already an object, assume it's refactored
    if (imageValue && typeof imageValue === "object" && imageValue.secureUrl) {
      return imageValue;
    }
    return null;
  }

  // 1. If it's a Cloudinary URL
  if (imageValue.includes("res.cloudinary.com")) {
    const publicId = getPublicIdFromUrl(imageValue) || `legacy/${path.basename(imageValue, path.extname(imageValue))}`;
    return {
      publicId: publicId,
      secureUrl: imageValue,
      alt: fallbackAlt
    };
  }

  // 2. If it's a local file path
  // Strip starting slashes/dots to locate it in public/uploads/
  let cleanPath = imageValue;
  if (cleanPath.startsWith("/")) cleanPath = cleanPath.substring(1);
  if (cleanPath.startsWith("uploads/")) cleanPath = "public/" + cleanPath;
  if (!cleanPath.startsWith("public/")) {
    // Assume it might be just filename inside public/uploads/<folder>
    cleanPath = path.join("public/uploads", folderName, cleanPath);
  }

  const absolutePath = path.join(__dirname, "..", cleanPath);
  
  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
    console.log(`[Migration] Found local file: ${cleanPath}. Uploading to Cloudinary...`);
    if (isDryRun) {
      return {
        publicId: `dry-run/${folderName}/${path.basename(cleanPath, path.extname(cleanPath))}`,
        secureUrl: `https://res.cloudinary.com/dry-run/image/upload/${cleanPath}`,
        alt: fallbackAlt
      };
    } else {
      try {
        const uploaded = await uploadImage(absolutePath, folderName);
        return {
          publicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          alt: fallbackAlt
        };
      } catch (err) {
        console.error(`[Migration] Failed to upload local file ${cleanPath}:`, err.message);
        throw err;
      }
    }
  }

  // 3. Fallback: Cannot find local file, but it's a path/string
  console.warn(`[Migration] Warning: Image file not found locally: ${cleanPath}`);
  return {
    publicId: `missing/${folderName}/${path.basename(cleanPath, path.extname(cleanPath))}`,
    secureUrl: imageValue.startsWith("http") ? imageValue : `/images/product-placeholder.jpg`,
    alt: fallbackAlt
  };
}

async function runMigration() {
  console.log("==================================================");
  console.log(`     STARTING IMAGE MIGRATION (${isDryRun ? "DRY-RUN" : "LIVE"})`);
  console.log("==================================================");

  if (!process.env.DATABASE) {
    console.error("[FATAL] DATABASE environment variable is not defined");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false
    });
    console.log("[DB] Connected successfully to Database.");

    // --- 1. Migrate Categories ---
    console.log("\n--- Migrating Categories ---");
    const categories = await categoryModel.find({});
    console.log(`Found ${categories.length} categories.`);
    for (const cat of categories) {
      // Check if image needs migration
      // Note: we check both direct cImage from doc (since we replaced cImage in model, Mongoose might read it differently or return it raw)
      const rawDoc = cat.toObject({ virtuals: false });
      const legacyImage = rawDoc.cImage || (rawDoc.image && typeof rawDoc.image === "string" ? rawDoc.image : null);
      
      if (legacyImage && typeof legacyImage === "string") {
        console.log(`Migrating Category "${cat.cName}"...`);
        try {
          const imageObj = await processImage(legacyImage, "categories", cat.cName);
          if (imageObj) {
            cat.image = imageObj;
            cat.set("cImage", undefined); // clean up old field in mongo doc
            cat.set("cloudinaryPublicId", undefined);
            if (!isDryRun) {
              await cat.save();
              console.log(`  Successfully migrated Category "${cat.cName}"`);
            } else {
              console.log(`  [Dry-Run] Would save Category "${cat.cName}" with:`, imageObj);
            }
          }
        } catch (e) {
          console.error(`  Failed Category "${cat.cName}":`, e.message);
        }
      } else {
        console.log(`  Category "${cat.cName}" is already migrated or has no image.`);
      }
    }

    // --- 2. Migrate Blogs/Vlogs ---
    console.log("\n--- Migrating Vlogs/Blogs ---");
    const vlogs = await vlogModel.find({});
    console.log(`Found ${vlogs.length} vlogs.`);
    for (const vlog of vlogs) {
      const rawDoc = vlog.toObject({ virtuals: false });
      const legacyThumbnail = rawDoc.thumbnail || (rawDoc.image && typeof rawDoc.image === "string" ? rawDoc.image : null);

      if (legacyThumbnail && typeof legacyThumbnail === "string") {
        console.log(`Migrating Vlog "${vlog.title}"...`);
        try {
          const imageObj = await processImage(legacyThumbnail, "blogs", vlog.title);
          if (imageObj) {
            vlog.image = imageObj;
            vlog.set("thumbnail", undefined); // clean up
            if (!isDryRun) {
              await vlog.save();
              console.log(`  Successfully migrated Vlog "${vlog.title}"`);
            } else {
              console.log(`  [Dry-Run] Would save Vlog "${vlog.title}" with:`, imageObj);
            }
          }
        } catch (e) {
          console.error(`  Failed Vlog "${vlog.title}":`, e.message);
        }
      } else {
        console.log(`  Vlog "${vlog.title}" is already migrated or has no thumbnail.`);
      }
    }

    // --- 3. Migrate Banners/HeroSliders ---
    console.log("\n--- Migrating Sliders/Banners ---");
    const sliders = await heroSliderModel.find({});
    console.log(`Found ${sliders.length} sliders.`);
    for (const slide of sliders) {
      const rawDoc = slide.toObject({ virtuals: false });
      const legacyDesktop = rawDoc.desktopImage;
      const legacyMobile = rawDoc.mobileImage;
      let updated = false;

      if (legacyDesktop && typeof legacyDesktop === "string") {
        console.log(`Migrating Slider desktop image "${slide.title}"...`);
        try {
          const imgObj = await processImage(legacyDesktop, "banners", `${slide.title} Desktop`);
          if (imgObj) {
            slide.desktopImage = imgObj;
            updated = true;
          }
        } catch (e) {
          console.error(`  Failed desktop image for slider "${slide.title}":`, e.message);
        }
      }

      if (legacyMobile && typeof legacyMobile === "string") {
        console.log(`Migrating Slider mobile image "${slide.title}"...`);
        try {
          const imgObj = await processImage(legacyMobile, "banners", `${slide.title} Mobile`);
          if (imgObj) {
            slide.mobileImage = imgObj;
            updated = true;
          }
        } catch (e) {
          console.error(`  Failed mobile image for slider "${slide.title}":`, e.message);
        }
      }

      if (updated) {
        if (!isDryRun) {
          await slide.save();
          console.log(`  Successfully migrated Slider "${slide.title}"`);
        } else {
          console.log(`  [Dry-Run] Would save Slider "${slide.title}" with:`, {
            desktopImage: slide.desktopImage,
            mobileImage: slide.mobileImage
          });
        }
      } else {
        console.log(`  Slider "${slide.title}" is already migrated or has no image.`);
      }
    }

    // --- 4. Migrate User Profiles ---
    console.log("\n--- Migrating User Profiles ---");
    const users = await userModel.find({});
    console.log(`Found ${users.length} users.`);
    for (const user of users) {
      const rawDoc = user.toObject({ virtuals: false });
      const legacyUserImg = rawDoc.userImage || rawDoc.profileImageUrl;

      if (legacyUserImg && typeof legacyUserImg === "string" && legacyUserImg !== "user.png") {
        console.log(`Migrating User "${user.name}" profile image...`);
        try {
          const imgObj = await processImage(legacyUserImg, "users", `${user.name} Profile`);
          if (imgObj) {
            user.userImage = imgObj;
            user.set("profileImageUrl", undefined);
            user.set("profileImagePublicId", undefined);
            if (!isDryRun) {
              await user.save();
              console.log(`  Successfully migrated User "${user.name}"`);
            } else {
              console.log(`  [Dry-Run] Would save User "${user.name}" with:`, imgObj);
            }
          }
        } catch (e) {
          console.error(`  Failed User "${user.name}":`, e.message);
        }
      } else {
        console.log(`  User "${user.name}" is already migrated, has no image, or uses default user.png.`);
      }
    }

    // --- 5. Migrate Products ---
    console.log("\n--- Migrating Products ---");
    const products = await productModel.find({});
    console.log(`Found ${products.length} products.`);
    for (const prod of products) {
      const rawDoc = prod.toObject({ virtuals: false });
      const legacyImages = rawDoc.pImages;
      const legacyPublicIds = rawDoc.pImagePublicIds || [];
      
      if (legacyImages && Array.isArray(legacyImages) && legacyImages.length > 0 && typeof legacyImages[0] === "string") {
        console.log(`Migrating Product "${prod.pName}" images...`);
        try {
          let uploadedImages = [];
          for (let i = 0; i < legacyImages.length; i++) {
            const imgVal = legacyImages[i];
            const pId = legacyPublicIds[i] || getPublicIdFromUrl(imgVal);
            
            let imgObj;
            if (pId && imgVal.includes("res.cloudinary.com")) {
              imgObj = {
                publicId: pId,
                secureUrl: imgVal,
                alt: prod.pName,
                isPrimary: i === 0
              };
            } else {
              // Upload local image or search
              imgObj = await processImage(imgVal, "products", prod.pName);
              if (imgObj) {
                imgObj.isPrimary = i === 0;
              }
            }

            if (imgObj) {
              uploadedImages.push(imgObj);
            }
          }

          if (uploadedImages.length > 0) {
            prod.image = {
              publicId: uploadedImages[0].publicId,
              secureUrl: uploadedImages[0].secureUrl,
              alt: prod.pName
            };
            prod.images = uploadedImages;
            prod.set("pImages", undefined);
            prod.set("pImagePublicIds", undefined);

            if (!isDryRun) {
              await prod.save();
              console.log(`  Successfully migrated Product "${prod.pName}" with ${uploadedImages.length} images`);
            } else {
              console.log(`  [Dry-Run] Would save Product "${prod.pName}" with:`, {
                image: prod.image,
                images: prod.images
              });
            }
          }
        } catch (e) {
          console.error(`  Failed Product "${prod.pName}":`, e.message);
        }
      } else {
        console.log(`  Product "${prod.pName}" is already migrated or has no images.`);
      }
    }

    console.log("\n==================================================");
    console.log(`     MIGRATION COMPLETED SUCCESSFULLY`);
    console.log("==================================================");
  } catch (err) {
    console.error("Migration Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("[DB] Disconnected.");
  }
}

runMigration();
