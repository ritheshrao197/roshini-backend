const heroSliderModel = require("../models/heroSlider");
const sliderAnalyticsModel = require("../models/sliderAnalytics");
const productModel = require("../models/products");
const achievementModel = require("../models/achievements");
const mongoose = require("mongoose");

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

      // Populate referenceId manually for products and achievements
      for (let i = 0; i < sliders.length; i++) {
        let slide = sliders[i];
        if (slide.type === "product" && slide.referenceId) {
          const prod = await productModel.findById(slide.referenceId).select("pName pPrice pImages slug").lean();
          if (prod) slide.productData = prod;
        } else if (slide.type === "achievement" && slide.referenceId) {
          const ach = await achievementModel.findById(slide.referenceId).lean();
          if (ach) slide.achievementData = ach;
        }
      }

      return res.json({ sliders });
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
    
    if (req.files) {
      if (req.files.desktopImage && req.files.desktopImage[0]) {
        data.desktopImage = req.files.desktopImage[0].filename;
      }
      if (req.files.mobileImage && req.files.mobileImage[0]) {
        data.mobileImage = req.files.mobileImage[0].filename;
      }
    }

    if (data.showOverlayStats === "true") data.showOverlayStats = true;
    if (data.showOverlayStats === "false") data.showOverlayStats = false;
    
    if (!data.title && !data.desktopImage && data.type !== 'product' && data.type !== 'achievement') {
      return res.status(400).json({ error: "Title or Image is required for image slides" });
    }

    try {
      let newSlider = new heroSliderModel(data);
      let save = await newSlider.save();
      return res.json({ success: "Slider created successfully", slider: save });
    } catch (err) {
      console.log("postAddSlider error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async putUpdateSlider(req, res) {
    let { id } = req.params;
    let data = { ...req.body };

    if (req.files) {
      if (req.files.desktopImage && req.files.desktopImage[0]) {
        data.desktopImage = req.files.desktopImage[0].filename;
      }
      if (req.files.mobileImage && req.files.mobileImage[0]) {
        data.mobileImage = req.files.mobileImage[0].filename;
      }
    }

    if (data.showOverlayStats === "true") data.showOverlayStats = true;
    if (data.showOverlayStats === "false") data.showOverlayStats = false;

    try {
      let updated = await heroSliderModel.findByIdAndUpdate(id, data, { new: true });
      if (updated) {
        return res.json({ success: "Slider updated successfully", slider: updated });
      }
      return res.status(404).json({ error: "Slider not found" });
    } catch (err) {
      console.log("putUpdateSlider error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async deleteSlider(req, res) {
    let { id } = req.params;
    try {
      let deleted = await heroSliderModel.findByIdAndDelete(id);
      if (deleted) {
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
