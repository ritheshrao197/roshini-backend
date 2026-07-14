const achievementModel = require("../models/achievements");

class AchievementController {
  // --- Public Endpoints ---
  async getAllActiveAchievements(req, res) {
    try {
      let achievements = await achievementModel
        .find({ isActive: true })
        .select("title subtitle type icon value description displayOrder isActive")
        .sort({ displayOrder: 1, createdAt: -1 })
        .lean()
        .exec();
      return res.json({ achievements });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // --- Admin Endpoints ---
  async getAllAdminAchievements(req, res) {
    try {
      let achievements = await achievementModel
        .find({})
        .sort({ displayOrder: 1, createdAt: -1 })
        .exec();
      return res.json({ achievements });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async postAddAchievement(req, res) {
    let { title, subtitle, type, icon, value, description, displayOrder, isActive } = req.body;
    
    if (!title || !subtitle || !type || !icon) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    try {
      let newAchievement = new achievementModel({
        title,
        subtitle,
        type,
        icon,
        value,
        description,
        displayOrder: displayOrder || 0,
        isActive: isActive !== undefined ? isActive : true
      });

      let save = await newAchievement.save();
      if (save) {
        return res.json({ success: "Achievement created successfully", achievement: save });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async putUpdateAchievement(req, res) {
    let { id } = req.params;
    let { title, subtitle, type, icon, value, description, displayOrder, isActive } = req.body;

    if (!title || !subtitle || !type || !icon) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    try {
      let updatedAchievement = await achievementModel.findByIdAndUpdate(id, {
        title,
        subtitle,
        type,
        icon,
        value,
        description,
        displayOrder,
        isActive,
        updatedAt: Date.now()
      }, { new: true });

      if (updatedAchievement) {
        return res.json({ success: "Achievement updated successfully", achievement: updatedAchievement });
      }
      return res.status(404).json({ error: "Achievement not found" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async deleteAchievement(req, res) {
    let { id } = req.params;
    try {
      let deletedAchievement = await achievementModel.findByIdAndDelete(id);
      if (deletedAchievement) {
        return res.json({ success: "Achievement deleted successfully" });
      }
      return res.status(404).json({ error: "Achievement not found" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

const achievementController = new AchievementController();
module.exports = achievementController;
