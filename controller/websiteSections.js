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
  { sectionId: "newsletter", name: "Newsletter Subscription", displayOrder: 10 }
];

class WebsiteSectionsController {
  
  async getSections(req, res) {
    try {
      let sections = await websiteSectionModel.find({}).sort({ displayOrder: 1 }).lean().exec();
      
      // Seed default sections if empty
      if (sections.length === 0) {
        await websiteSectionModel.insertMany(DEFAULT_SECTIONS, { ordered: false }).catch(() => null);
        sections = await websiteSectionModel.find({}).sort({ displayOrder: 1 }).lean().exec();
      }

      // If it's a public request, filter out hidden ones
      if (!req.isAdmin) {
        sections = sections.filter(s => s.isVisible);
      }

      return res.json({ sections });
    } catch (err) {
      console.log("getSections error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateSections(req, res) {
    let { sections } = req.body;
    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    try {
      // Bulk update using updateOne for each section
      const bulkOps = sections.map((sec, index) => ({
        updateOne: {
          filter: { _id: sec._id },
          update: { 
            displayOrder: index + 1,
            isVisible: sec.isVisible !== undefined ? sec.isVisible : true
          }
        }
      }));

      await websiteSectionModel.bulkWrite(bulkOps);
      
      return res.json({ success: "Sections updated successfully" });
    } catch (err) {
      console.log("updateSections error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

const websiteSectionsController = new WebsiteSectionsController();
module.exports = websiteSectionsController;
