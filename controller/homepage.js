const productModel = require("../models/products");
const categoryModel = require("../models/categories");
const achievementModel = require("../models/achievements");
const heroSliderModel = require("../models/heroSlider");
const vlogModel = require("../models/vlogs");
const websiteSectionModel = require("../models/websiteSections");

const DEFAULT_SECTIONS = [
  { sectionId: "hero", name: "Hero Slider", displayOrder: 1 },
  { sectionId: "trust_badges", name: "Trust Badges", displayOrder: 2 },
  { sectionId: "categories", name: "Product Categories", displayOrder: 3 },
  { sectionId: "featured_products", name: "Featured Products", displayOrder: 4 },
  { sectionId: "why_us", name: "Why Choose Roshini's", displayOrder: 5 },
  { sectionId: "brand_story", name: "Brand Story", displayOrder: 6 },
  { sectionId: "achievements", name: "Achievements & Recognition", displayOrder: 7 },
  { sectionId: "testimonials", name: "Customer Testimonials", displayOrder: 8 },
  { sectionId: "health_hub", name: "Health Hub (Vlogs)", displayOrder: 9 },
  { sectionId: "newsletter", name: "Newsletter Subscription", displayOrder: 10 },
];

const PRODUCT_LIST_SELECT = [
  "pName",
  "pDescription",
  "pPrice",
  "pSold",
  "pQuantity",
  "pCategory",
  "image",
  "images",
  "pOffer",
  "pStatus",
  "comparePrice",
  "productWeight",
  "slug",
  "featured",
  "pVariants",
].join(" ");

const VLOG_LIST_SELECT = [
  "title",
  "slug",
  "excerpt",
  "image",
  "vCategory",
  "vTags",
  "featured",
  "publishDate",
  "viewCount",
  "createdAt",
  "content",
].join(" ");

function toProductListItem(product) {
  return {
    ...product,
    pImages: Array.isArray(product.images)
      ? product.images.map((img) => img.secureUrl).filter(Boolean)
      : [],
  };
}

function toVlogListItem(vlog) {
  const plainText = typeof vlog.content === "string"
    ? vlog.content.replace(/<[^>]*>/g, " ")
    : "";
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;

  return {
    ...vlog,
    thumbnail: vlog.image?.secureUrl || "",
    readingTime: Math.max(1, Math.ceil(wordCount / 200)),
  };
}

async function getActiveSlidersWithReferences(req, res) {
  const now = new Date();
  const sliders = await heroSliderModel
    .find({
      $or: [
        { status: "published" },
        {
          status: "scheduled",
          startDate: { $lte: now },
          endDate: { $gte: now },
        },
      ],
    })
    .sort({ displayOrder: 1, createdAt: -1 })
    .lean()
    .exec();

  const activeSliders = [];
  const experimentGroups = {};

  for (const slide of sliders) {
    if (slide.experimentId) {
      if (!experimentGroups[slide.experimentId]) {
        experimentGroups[slide.experimentId] = [];
      }
      experimentGroups[slide.experimentId].push(slide);
      continue;
    }

    activeSliders.push(slide);
  }

  let abVariant = req.cookies && req.cookies.ab_variant ? req.cookies.ab_variant : null;
  let newVariantSet = false;

  for (const variants of Object.values(experimentGroups)) {
    if (!variants.length) continue;

    let selectedVariant = abVariant
      ? variants.find((variant) => variant.variant === abVariant)
      : null;

    if (!selectedVariant) {
      selectedVariant = variants[Math.floor(Math.random() * variants.length)];
      if (!abVariant && selectedVariant?.variant) {
        abVariant = selectedVariant.variant;
        newVariantSet = true;
      }
    }

    if (selectedVariant) {
      activeSliders.push(selectedVariant);
    }
  }

  activeSliders.sort((a, b) => a.displayOrder - b.displayOrder);

  const productIds = activeSliders
    .filter((slide) => slide.type === "product" && slide.referenceId)
    .map((slide) => String(slide.referenceId));
  const achievementIds = activeSliders
    .filter((slide) => slide.type === "achievement" && slide.referenceId)
    .map((slide) => String(slide.referenceId));

  const [products, achievements] = await Promise.all([
    productIds.length
      ? productModel
          .find({ _id: { $in: productIds } })
          .select("pName pPrice image images slug")
          .lean()
          .exec()
      : [],
    achievementIds.length
      ? achievementModel.find({ _id: { $in: achievementIds } }).lean().exec()
      : [],
  ]);

  const productMap = new Map(products.map((product) => [String(product._id), toProductListItem(product)]));
  const achievementMap = new Map(achievements.map((achievement) => [String(achievement._id), achievement]));

  for (const slide of activeSliders) {
    if (slide.type === "product" && slide.referenceId) {
      slide.productData = productMap.get(String(slide.referenceId)) || null;
    }

    if (slide.type === "achievement" && slide.referenceId) {
      slide.achievementData = achievementMap.get(String(slide.referenceId)) || null;
    }
  }

  if (newVariantSet) {
    res.cookie("ab_variant", abVariant, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
    });
  }

  return activeSliders;
}

class HomepageController {
  async getHomepageData(req, res) {
    try {
      const [
        products,
        categories,
        achievements,
        sections,
        vlogs,
        sliders,
      ] = await Promise.all([
        productModel
          .find({
            isDeleted: { $ne: true },
            pStatus: "Active",
            $or: [{ featured: true }, { pSold: { $gt: 10 } }],
          })
          .select(PRODUCT_LIST_SELECT)
          .populate("pCategory", "_id cName")
          .sort({ featured: -1, pSold: -1, _id: -1 })
          .limit(8)
          .lean()
          .exec(),
        categoryModel
          .find({ cStatus: "Active" })
          .select("cName cDescription image cStatus")
          .sort({ _id: -1 })
          .limit(8)
          .lean()
          .exec(),
        achievementModel
          .find({ isActive: true })
          .select("title subtitle type icon value description displayOrder isActive")
          .sort({ displayOrder: 1, createdAt: -1 })
          .lean()
          .exec(),
        websiteSectionModel
          .find({ isVisible: true })
          .sort({ displayOrder: 1 })
          .lean()
          .exec(),
        vlogModel
          .find({ isPublished: true, isDeleted: false })
          .select(VLOG_LIST_SELECT)
          .populate("vCategory", "cName slug")
          .populate("vTags", "name slug")
          .sort({ publishDate: -1 })
          .limit(15)
          .lean()
          .exec(),
        getActiveSlidersWithReferences(req, res),
      ]);

      if (!sections.length) {
        await websiteSectionModel.insertMany(DEFAULT_SECTIONS, { ordered: false }).catch(() => null);
      }

      return res.json({
        products: products.map(toProductListItem),
        categories,
        achievements,
        heroSliders: sliders,
        sections: sections.length ? sections : DEFAULT_SECTIONS,
        vlogs: vlogs.map(toVlogListItem),
      });
    } catch (err) {
      console.error("[HomepageController] getHomepageData error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new HomepageController();
