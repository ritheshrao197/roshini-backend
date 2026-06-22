const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const categoryModel = require("../models/categories");
const productModel = require("../models/products");

const DATABASE = process.env.DATABASE || "mongodb://127.0.0.1:27017/roshinis_ecommerce";

// Define categories with descriptions
const categoriesData = [
  {
    cName: "Health & Nutrition",
    cDescription: "Nutrient-dense superfoods, health mixes, and daily nutrition supplements.",
    cStatus: "Active"
  },
  {
    cName: "Kids Nutrition",
    cDescription: "Healthy chocolate malts and nutritious snacks made especially for children.",
    cStatus: "Active"
  },
  {
    cName: "Herbal Wellness",
    cDescription: "Ayurvedic blends and traditional immunity-boosting wellness powders.",
    cStatus: "Active"
  },
  {
    cName: "Postpartum Nutrition",
    cDescription: "Postnatal recovery tonics and traditional nutrition support for mothers.",
    cStatus: "Active"
  },
  {
    cName: "Natural Skincare",
    cDescription: "Chemical-free traditional skincare powders and face packs.",
    cStatus: "Active"
  },
  {
    cName: "Healthy Snacks",
    cDescription: "Raw, premium quality seeds and healthy snacks packed with nutrients.",
    cStatus: "Active"
  },
  {
    cName: "Spice Mixes",
    cDescription: "Authentic homemade spice blends and ready-to-use traditional masala powders.",
    cStatus: "Active"
  },
  {
    cName: "Traditional Foods",
    cDescription: "Traditional pure cow ghee and conventional homemade kitchen staples.",
    cStatus: "Active"
  }
];

// Define products with properties
const productsData = [
  // Roshini's Nutrimix (Health & Nutrition)
  {
    pName: "Roshini's Nutrimix – Superfood Health Mix (200g)",
    pDescription: "A nutrient-dense homemade health mix crafted from millets, nuts, seeds, grains, and dry fruits. Designed to provide balanced nutrition for children, adults, working professionals, and senior citizens.",
    shortDescription: "Nutrient-dense homemade superfood health mix (200g).",
    pPrice: 149,
    productWeight: "200g",
    pQuantity: 100,
    categoryName: "Health & Nutrition",
    pStatus: "Active",
    bestseller: true,
    featured: true,
    ingredients: [
      "Almonds", "Pistachios", "Cashews", "Peanuts", "Pumpkin Seeds", "Chia Seeds", 
      "Watermelon Seeds", "Flax Seeds", "Dates", "Jowar", "Foxtail Millet", 
      "Brown Top Millet", "Pearl Millet (Bajra)", "Little Millet", "Kodo Millet", 
      "Barnyard Millet", "Proso Millet"
    ],
    benefits: [
      "High in protein and fiber",
      "Supports energy and immunity",
      "Rich in iron and calcium",
      "No preservatives",
      "No added sugar"
    ],
    imageUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
  },
  {
    pName: "Roshini's Nutrimix – Superfood Health Mix (500g)",
    pDescription: "A nutrient-dense homemade health mix crafted from millets, nuts, seeds, grains, and dry fruits. Designed to provide balanced nutrition for children, adults, working professionals, and senior citizens.",
    shortDescription: "Nutrient-dense homemade superfood health mix (500g).",
    pPrice: 349,
    productWeight: "500g",
    pQuantity: 100,
    categoryName: "Health & Nutrition",
    pStatus: "Active",
    bestseller: true,
    featured: true,
    ingredients: [
      "Almonds", "Pistachios", "Cashews", "Peanuts", "Pumpkin Seeds", "Chia Seeds", 
      "Watermelon Seeds", "Flax Seeds", "Dates", "Jowar", "Foxtail Millet", 
      "Brown Top Millet", "Pearl Millet (Bajra)", "Little Millet", "Kodo Millet", 
      "Barnyard Millet", "Proso Millet"
    ],
    benefits: [
      "High in protein and fiber",
      "Supports energy and immunity",
      "Rich in iron and calcium",
      "No preservatives",
      "No added sugar"
    ],
    imageUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
  },
  {
    pName: "Roshini's Nutrimix – Superfood Health Mix (1kg)",
    pDescription: "A nutrient-dense homemade health mix crafted from millets, nuts, seeds, grains, and dry fruits. Designed to provide balanced nutrition for children, adults, working professionals, and senior citizens.",
    shortDescription: "Nutrient-dense homemade superfood health mix (1kg).",
    pPrice: 649,
    productWeight: "1kg",
    pQuantity: 50,
    categoryName: "Health & Nutrition",
    pStatus: "Active",
    bestseller: true,
    featured: true,
    ingredients: [
      "Almonds", "Pistachios", "Cashews", "Peanuts", "Pumpkin Seeds", "Chia Seeds", 
      "Watermelon Seeds", "Flax Seeds", "Dates", "Jowar", "Foxtail Millet", 
      "Brown Top Millet", "Pearl Millet (Bajra)", "Little Millet", "Kodo Millet", 
      "Barnyard Millet", "Proso Millet"
    ],
    benefits: [
      "High in protein and fiber",
      "Supports energy and immunity",
      "Rich in iron and calcium",
      "No preservatives",
      "No added sugar"
    ],
    imageUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
  },

  // Ragi ChocoBite (Kids Nutrition)
  {
    pName: "Ragi ChocoBite – Chocolatey Ragi Malt Powder (200g)",
    pDescription: "A healthier chocolate malt drink made with ragi and natural ingredients, offering the taste kids love without artificial additives.",
    shortDescription: "Chocolatey ragi malt powder drink for kids (200g).",
    pPrice: 160,
    productWeight: "200g",
    pQuantity: 100,
    categoryName: "Kids Nutrition",
    pStatus: "Active",
    bestseller: true,
    featured: true,
    benefits: [
      "Rich in calcium",
      "Supports bone health",
      "Better alternative to commercial health drinks",
      "Natural chocolate flavor"
    ],
    imageUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
  },
  {
    pName: "Ragi ChocoBite – Chocolatey Ragi Malt Powder (500g)",
    pDescription: "A healthier chocolate malt drink made with ragi and natural ingredients, offering the taste kids love without artificial additives.",
    shortDescription: "Chocolatey ragi malt powder drink for kids (500g).",
    pPrice: 350,
    productWeight: "500g",
    pQuantity: 100,
    categoryName: "Kids Nutrition",
    pStatus: "Active",
    bestseller: true,
    featured: false,
    benefits: [
      "Rich in calcium",
      "Supports bone health",
      "Better alternative to commercial health drinks",
      "Natural chocolate flavor"
    ],
    imageUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
  },

  // Kashaya Powder (Herbal Wellness)
  {
    pName: "Kashaya Powder (100g)",
    pDescription: "Traditional Ayurvedic herbal blend used for preparing immunity-boosting herbal drinks.",
    shortDescription: "Immunity-boosting traditional Ayurvedic herbal drink blend (100g).",
    pPrice: 120,
    productWeight: "100g",
    pQuantity: 150,
    categoryName: "Herbal Wellness",
    pStatus: "Active",
    bestseller: true,
    featured: true,
    benefits: [
      "Supports immunity",
      "Helps digestion",
      "Traditional wellness remedy",
      "Natural detox support"
    ],
    imageUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
  },

  // Bananthi Maddu (Postpartum Nutrition)
  {
    pName: "Bananthi Maddu (Pack)",
    pDescription: "Traditional Karnataka-style herbal tonic prepared for mothers during the postnatal recovery period.",
    shortDescription: "Traditional postpartum recovery herbal tonic for mothers.",
    pPrice: 400,
    productWeight: "1 Pack",
    pQuantity: 50,
    categoryName: "Postpartum Nutrition",
    pStatus: "Active",
    bestseller: false,
    featured: false,
    benefits: [
      "Supports recovery after childbirth",
      "Traditional energy booster",
      "Rich herbal formulation"
    ],
    imageUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
  },

  // Ubtan Face Wash / Face Pack (Natural Skincare)
  {
    pName: "Ubtan Face Wash / Face Pack (100g)",
    pDescription: "Traditional herbal skincare powder that can be used as both a face wash and face pack.",
    shortDescription: "Chemical-free traditional skincare herbal powder (100g).",
    pPrice: 120,
    productWeight: "100g",
    pQuantity: 120,
    categoryName: "Natural Skincare",
    pStatus: "Active",
    bestseller: false,
    featured: false,
    benefits: [
      "Gentle exfoliation",
      "Removes impurities",
      "Natural glow enhancement",
      "Chemical-free skincare"
    ],
    imageUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
  },

  // Pumpkin Seeds (Healthy Snacks)
  {
    pName: "Pumpkin Seeds (100g)",
    pDescription: "Premium quality raw pumpkin seeds packed with essential nutrients.",
    shortDescription: "Premium raw pumpkin seeds for healthy snacking (100g).",
    pPrice: 95,
    productWeight: "100g",
    pQuantity: 200,
    categoryName: "Healthy Snacks",
    pStatus: "Active",
    bestseller: true,
    featured: true,
    benefits: [
      "Rich in magnesium",
      "High protein content",
      "Good source of antioxidants",
      "Supports heart health"
    ],
    imageUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
  },

  // Sunflower Seeds (Healthy Snacks)
  {
    pName: "Sunflower Seeds (100g)",
    pDescription: "Nutritious sunflower seeds ideal for snacking or adding to meals.",
    shortDescription: "Nutritious raw sunflower seeds (100g).",
    pPrice: 80,
    productWeight: "100g",
    pQuantity: 200,
    categoryName: "Healthy Snacks",
    pStatus: "Active",
    bestseller: false,
    featured: false,
    benefits: [
      "Rich in Vitamin E",
      "Healthy fats",
      "Good source of protein",
      "Supports skin health"
    ],
    imageUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
  },

  // Chicken Sukka Masala Powder (Spice Mixes)
  {
    pName: "Chicken Sukka Masala Powder (100g)",
    pDescription: "Authentic Mangalorean-style spice blend for preparing flavorful Chicken Sukka.",
    shortDescription: "Authentic homemade style Chicken Sukka spice mix (100g).",
    pPrice: 80,
    productWeight: "100g",
    pQuantity: 150,
    categoryName: "Spice Mixes",
    pStatus: "Active",
    bestseller: false,
    featured: false,
    benefits: [
      "Traditional recipe",
      "Ready-to-use spice mix",
      "Homemade flavor profile",
      "No artificial colors"
    ],
    imageUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
  },

  // Pure Cow Ghee (Traditional Foods)
  {
    pName: "Pure Cow Ghee (500ml)",
    pDescription: "Traditional homemade cow ghee prepared using conventional methods for rich aroma and taste. Contact for latest seasonal pricing.",
    shortDescription: "Traditional homemade cow ghee with rich aroma (500ml).",
    pPrice: 600,
    productWeight: "500ml",
    pQuantity: 80,
    categoryName: "Traditional Foods",
    pStatus: "Active",
    bestseller: true,
    featured: true,
    benefits: [
      "Rich in healthy fats",
      "Traditional preparation",
      "Multipurpose cooking ingredient"
    ],
    imageUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
  }
];

async function seed() {
  try {
    console.log("[seedProducts.js] Connecting to database...");
    await mongoose.connect(DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    console.log("[seedProducts.js] Connected to database successfully.");

    const categoryMap = {};

    // 1. Seed Categories
    for (const cat of categoriesData) {
      let existing = await categoryModel.findOne({ cName: cat.cName });
      if (!existing) {
        existing = new categoryModel({
          cName: cat.cName,
          cDescription: cat.cDescription,
          cStatus: cat.cStatus,
          image: {
            publicId: `categories/${cat.cName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            secureUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
            alt: cat.cName
          }
        });
        await existing.save();
        console.log(`[seedProducts.js] Created Category: ${cat.cName}`);
      } else {
        console.log(`[seedProducts.js] Category already exists: ${cat.cName}`);
      }
      categoryMap[cat.cName] = existing._id;
    }

    // 2. Seed Products
    for (const prod of productsData) {
      let existing = await productModel.findOne({ pName: prod.pName });
      if (!existing) {
        const catId = categoryMap[prod.categoryName];
        if (!catId) {
          console.error(`[seedProducts.js] Category not found for ${prod.pName}: ${prod.categoryName}`);
          continue;
        }

        const slug = prod.pName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
        const baseSku = prod.pName.replace(/–/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-");
        const suffix = prod.productWeight ? "-" + prod.productWeight.toUpperCase().replace(/[^A-Z0-9]+/g, "") : "";
        const sku = (baseSku.substring(0, 30 - suffix.length) + suffix).substring(0, 30);

        const newProd = new productModel({
          pName: prod.pName,
          pDescription: prod.pDescription,
          shortDescription: prod.shortDescription,
          pPrice: prod.pPrice,
          productWeight: prod.productWeight,
          pQuantity: prod.pQuantity,
          pCategory: catId,
          pStatus: prod.pStatus,
          bestseller: prod.bestseller,
          featured: prod.featured,
          ingredients: prod.ingredients || [],
          benefits: prod.benefits || [],
          slug: slug,
          sku: sku,
          image: {
            publicId: `products/${slug}`,
            secureUrl: prod.imageUrl,
            alt: prod.pName
          },
          images: [{
            publicId: `products/${slug}`,
            secureUrl: prod.imageUrl,
            alt: prod.pName,
            isPrimary: true
          }],
          auditLog: [{
            action: "CREATE",
            details: "Database seeded initial product.",
            performedBy: "System"
          }]
        });

        await newProd.save();
        console.log(`[seedProducts.js] Created Product: ${prod.pName}`);
      } else {
        console.log(`[seedProducts.js] Product already exists: ${prod.pName}`);
      }
    }

    console.log("[seedProducts.js] Seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("[seedProducts.js] Error seeding database:", err);
    process.exit(1);
  }
}

seed();
