const heroSliderModel = require("../models/heroSlider");
const sliderAnalyticsModel = require("../models/sliderAnalytics");
const productModel = require("../models/products");
const achievementModel = require("../models/achievements");
const mongoose = require("mongoose");
const { uploadImage, deleteImage, replaceImage } = require("../services/cloudinaryUpload");
const fs = require("fs");

const safeUnlink = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error("[SliderController] Failed to delete local temp file:", e);
    }
  }
};

class SliderController {
  // --- PUBLIC ENDPOINTS ---
  
  async getActiveSliders(req, res) {
    try {
      const now = new Date();
      
      // Find published or currently scheduled slides
      let sliders = await heroSliderModel
        .find({
          $or: [
            { status: "published" },
            { 
              status: "scheduled", 
              startDate: { $lte: now }, 
              endDate: { $gte: now } 
            }
          ]
        })
        .sort({ displayOrder: 1, createdAt: -1 })
        .lean()
        .exec();

      // Filter active sliders
      let activeSliders = [];
      const experimentGroups = {};

      for (let slide of sliders) {
        if (slide.experimentId) {
          if (!experimentGroups[slide.experimentId]) {
            experimentGroups[slide.experimentId] = [];
          }
          experimentGroups[slide.experimentId].push(slide);
        } else {
          activeSliders.push(slide);
        }
      }

      // Check cookie for ab_variant
      let abVariant = req.cookies && req.cookies.ab_variant ? req.cookies.ab_variant : null;
      let newVariantSet = false;

      // Process experiments
      for (const [expId, variants] of Object.entries(experimentGroups)) {
        if (variants.length === 0) continue;
        
        let selectedVariant = null;
        if (abVariant) {
          selectedVariant = variants.find(v => v.variant === abVariant);
        }
        
        if (!selectedVariant) {
          // Pseudo-random selection if cookie variant doesn't exist in this experiment
          selectedVariant = variants[Math.floor(Math.random() * variants.length)];
          // Only set new variant if we don't already have one, or if we want to overwrite
          // To keep it simple, if no cookie existed, we set it to this newly picked variant
          if (!abVariant && selectedVariant.variant) {
            abVariant = selectedVariant.variant;
            newVariantSet = true;
          }
        }
        
        if (selectedVariant) {
          activeSliders.push(selectedVariant);
        }
      }

      // Sort final active sliders by display order
      activeSliders.sort((a, b) => a.displayOrder - b.displayOrder);

      // Populate referenceId manually for products and achievements
      const productIds = activeSliders
        .filter((slide) => slide.type === "product" && slide.referenceId)
        .map((slide) => slide.referenceId);
      const achievementIds = activeSliders
        .filter((slide) => slide.type === "achievement" && slide.referenceId)
        .map((slide) => slide.referenceId);

      const [products, achievements] = await Promise.all([
        productIds.length
          ? productModel.find({ _id: { $in: productIds } }).select("pName pPrice image images slug").lean()
          : [],
        achievementIds.length
          ? achievementModel.find({ _id: { $in: achievementIds } }).lean()
          : [],
      ]);

      const productMap = new Map(products.map((product) => [
        String(product._id),
        {
          ...product,
          pImages: Array.isArray(product.images)
            ? product.images.map((img) => img.secureUrl).filter(Boolean)
            : [],
        },
      ]));
      const achievementMap = new Map(achievements.map((achievement) => [String(achievement._id), achievement]));

      for (let i = 0; i < activeSliders.length; i++) {
        let slide = activeSliders[i];
        if (slide.type === "product" && slide.referenceId) {
          slide.productData = productMap.get(String(slide.referenceId)) || null;
        } else if (slide.type === "achievement" && slide.referenceId) {
          slide.achievementData = achievementMap.get(String(slide.referenceId)) || null;
        }
      }

      if (newVariantSet) {
        res.cookie('ab_variant', abVariant, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' });
      }

      return res.json({ sliders: activeSliders });
    } catch (err) {
      console.log("getActiveSliders error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async recordAnalytics(req, res) {
    const { sliderId, type } = req.body; // type can be 'impression', 'click', 'addToCart', 'purchase'
    if (!sliderId || !type) return res.status(400).json({ error: "Missing parameters" });

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const updateData = {};
      
      if (type === "impression") updateData.$inc = { impressions: 1 };
      else if (type === "click") updateData.$inc = { clicks: 1 };
      else if (type === "addToCart") updateData.$inc = { addToCarts: 1 };
      else if (type === "purchase") updateData.$inc = { purchases: 1 };
      else return res.status(400).json({ error: "Invalid analytics type" });

      await sliderAnalyticsModel.findOneAndUpdate(
        { sliderId, date: today },
        updateData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.json({ success: true });
    } catch (err) {
      console.log("recordAnalytics error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // --- ADMIN ENDPOINTS ---

  async getAllAdminSliders(req, res) {
    try {
      let sliders = await heroSliderModel
        .find({})
        .sort({ displayOrder: 1, createdAt: -1 })
        .lean()
        .exec();

      // Fetch analytics for all slides and merge
      const analyticsAggr = await sliderAnalyticsModel.aggregate([
        { 
          $group: { 
            _id: "$sliderId", 
            totalImpressions: { $sum: "$impressions" },
            totalClicks: { $sum: "$clicks" },
            totalAddToCart: { $sum: "$addToCarts" },
            totalPurchases: { $sum: "$purchases" }
          } 
        }
      ]);

      const analyticsMap = {};
      analyticsAggr.forEach(a => {
        analyticsMap[a._id.toString()] = a;
      });

      for (let slide of sliders) {
        let stats = analyticsMap[slide._id.toString()];
        slide.analytics = stats || {
          totalImpressions: 0,
          totalClicks: 0,
          totalAddToCart: 0,
          totalPurchases: 0
        };
      }

      return res.json({ sliders });
    } catch (err) {
      console.log("getAllAdminSliders error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async postAddSlider(req, res) {
    let data = { ...req.body };
    
    let uploadedDesktop = null;
    let uploadedMobile = null;

    if (data.showOverlayStats === "true") data.showOverlayStats = true;
    if (data.showOverlayStats === "false") data.showOverlayStats = false;

    try {
      if (req.files) {
        if (req.files.desktopImage && req.files.desktopImage[0]) {
          uploadedDesktop = await uploadImage(req.files.desktopImage[0], "banners");
          data.desktopImage = {
            publicId: uploadedDesktop.publicId,
            secureUrl: uploadedDesktop.secureUrl,
            alt: data.title || "Desktop Hero Banner"
          };
          safeUnlink(req.files.desktopImage[0].path);
        }
        if (req.files.mobileImage && req.files.mobileImage[0]) {
          uploadedMobile = await uploadImage(req.files.mobileImage[0], "banners");
          data.mobileImage = {
            publicId: uploadedMobile.publicId,
            secureUrl: uploadedMobile.secureUrl,
            alt: data.title || "Mobile Hero Banner"
          };
          safeUnlink(req.files.mobileImage[0].path);
        }
      }

      if (!data.title && !data.desktopImage && data.type !== 'product' && data.type !== 'achievement') {
        return res.status(400).json({ error: "Title or Image is required for image slides" });
      }

      let newSlider = new heroSliderModel(data);
      let save = await newSlider.save();
      return res.json({ success: "Slider created successfully", slider: save });
    } catch (err) {
      console.log("postAddSlider error:", err);
      // Clean up Cloudinary uploads on failure
      if (uploadedDesktop) {
        try { await deleteImage(uploadedDesktop.publicId); } catch(e) {}
      }
      if (uploadedMobile) {
        try { await deleteImage(uploadedMobile.publicId); } catch(e) {}
      }
      // Clean up local temp files
      if (req.files) {
        if (req.files.desktopImage && req.files.desktopImage[0]) safeUnlink(req.files.desktopImage[0].path);
        if (req.files.mobileImage && req.files.mobileImage[0]) safeUnlink(req.files.mobileImage[0].path);
      }
      return res.status(500).json({ error: "Internal server error: " + err.message });
    }
  }

  async putUpdateSlider(req, res) {
    let { id } = req.params;
    let data = { ...req.body };

    if (data.showOverlayStats === "true") data.showOverlayStats = true;
    if (data.showOverlayStats === "false") data.showOverlayStats = false;

    let uploadedDesktop = null;
    let uploadedMobile = null;

    try {
      const existingSlider = await heroSliderModel.findById(id);
      if (!existingSlider) {
        if (req.files) {
          if (req.files.desktopImage && req.files.desktopImage[0]) safeUnlink(req.files.desktopImage[0].path);
          if (req.files.mobileImage && req.files.mobileImage[0]) safeUnlink(req.files.mobileImage[0].path);
        }
        return res.status(404).json({ error: "Slider not found" });
      }

      if (req.files) {
        if (req.files.desktopImage && req.files.desktopImage[0]) {
          const oldPublicId = existingSlider.desktopImage ? existingSlider.desktopImage.publicId : null;
          uploadedDesktop = await replaceImage(oldPublicId, req.files.desktopImage[0], "banners");
          data.desktopImage = {
            publicId: uploadedDesktop.publicId,
            secureUrl: uploadedDesktop.secureUrl,
            alt: data.title || existingSlider.title || "Desktop Hero Banner"
          };
          safeUnlink(req.files.desktopImage[0].path);
        }
        if (req.files.mobileImage && req.files.mobileImage[0]) {
          const oldPublicId = existingSlider.mobileImage ? existingSlider.mobileImage.publicId : null;
          uploadedMobile = await replaceImage(oldPublicId, req.files.mobileImage[0], "banners");
          data.mobileImage = {
            publicId: uploadedMobile.publicId,
            secureUrl: uploadedMobile.secureUrl,
            alt: data.title || existingSlider.title || "Mobile Hero Banner"
          };
          safeUnlink(req.files.mobileImage[0].path);
        }
      }

      let updated = await heroSliderModel.findByIdAndUpdate(id, data, { new: true });
      if (updated) {
        return res.json({ success: "Slider updated successfully", slider: updated });
      }
      return res.status(404).json({ error: "Slider not found" });
    } catch (err) {
      console.log("putUpdateSlider error:", err);
      if (uploadedDesktop) {
        try { await deleteImage(uploadedDesktop.publicId); } catch(e) {}
      }
      if (uploadedMobile) {
        try { await deleteImage(uploadedMobile.publicId); } catch(e) {}
      }
      if (req.files) {
        if (req.files.desktopImage && req.files.desktopImage[0]) safeUnlink(req.files.desktopImage[0].path);
        if (req.files.mobileImage && req.files.mobileImage[0]) safeUnlink(req.files.mobileImage[0].path);
      }
      return res.status(500).json({ error: "Internal server error: " + err.message });
    }
  }

  async deleteSlider(req, res) {
    let { id } = req.params;
    try {
      let deleted = await heroSliderModel.findByIdAndDelete(id);
      if (deleted) {
        // Clean up images from Cloudinary
        if (deleted.desktopImage && deleted.desktopImage.publicId) {
          try { await deleteImage(deleted.desktopImage.publicId); } catch(e) {}
        }
        if (deleted.mobileImage && deleted.mobileImage.publicId) {
          try { await deleteImage(deleted.mobileImage.publicId); } catch(e) {}
        }

        // Also clean up analytics
        await sliderAnalyticsModel.deleteMany({ sliderId: id });
        return res.json({ success: "Slider deleted successfully" });
      }
      return res.status(404).json({ error: "Slider not found" });
    } catch (err) {
      console.log("deleteSlider error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

const sliderController = new SliderController();
module.exports = sliderController;
