const vlogModel = require("../models/vlogs");
const vlogCategoryModel = require("../models/vlogCategories");
const vlogTagModel = require("../models/vlogTags");
const { uploadImage, deleteImage, replaceImage } = require("../services/cloudinaryUpload");
const fs = require("fs");

const safeUnlink = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error("[VlogController] Failed to delete local temp file:", e);
    }
  }
};

class Vlog {
  // PUBLIC ENDPOINTS

  async getAllVlogs(req, res) {
    try {
      let { page, limit } = req.query;
      page = parseInt(page) || 1;
      limit = parseInt(limit) || 10;
      const skip = (page - 1) * limit;

      let vlogs = await vlogModel.find({ isPublished: true, isDeleted: false })
        .populate("vCategory", "cName slug")
        .populate("vTags", "name slug")
        .sort({ publishDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      let totalCount = await vlogModel.countDocuments({ isPublished: true, isDeleted: false });

      return res.json({ vlogs, totalCount, totalPages: Math.ceil(totalCount / limit), currentPage: page });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getVlogBySlug(req, res) {
    let { slug } = req.params;
    try {
      let vlog = await vlogModel.findOneAndUpdate(
        { slug: slug, isPublished: true, isDeleted: false },
        { $inc: { viewCount: 1 } },
        { new: true }
      )
        .populate("vCategory", "cName slug")
        .populate("vTags", "name slug")
        .populate("createdBy", "name")
        .exec();

      if (vlog) {
        return res.json({ vlog });
      }
      return res.status(404).json({ error: "Vlog not found" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getFeaturedVlogs(req, res) {
    try {
      let vlogs = await vlogModel.find({ featured: true, isPublished: true, isDeleted: false })
        .populate("vCategory", "cName slug")
        .sort({ publishDate: -1 })
        .limit(5)
        .exec();
      return res.json({ vlogs });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getLatestVlogs(req, res) {
    try {
      let vlogs = await vlogModel.find({ isPublished: true, isDeleted: false })
        .populate("vCategory", "cName slug")
        .sort({ publishDate: -1 })
        .limit(5)
        .exec();
      return res.json({ vlogs });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getPopularVlogs(req, res) {
    try {
      let vlogs = await vlogModel.find({ isPublished: true, isDeleted: false })
        .populate("vCategory", "cName slug")
        .sort({ viewCount: -1 })
        .limit(5)
        .exec();
      return res.json({ vlogs });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getVlogsByCategory(req, res) {
    let { categorySlug } = req.params;
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    try {
      let category = await vlogCategoryModel.findOne({ slug: categorySlug, isDeleted: false });
      if (!category) return res.status(404).json({ error: "Category not found" });

      let vlogs = await vlogModel.find({ vCategory: category._id, isPublished: true, isDeleted: false })
        .populate("vCategory", "cName slug")
        .populate("vTags", "name slug")
        .sort({ publishDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      let totalCount = await vlogModel.countDocuments({ vCategory: category._id, isPublished: true, isDeleted: false });

      return res.json({ vlogs, totalCount, totalPages: Math.ceil(totalCount / limit), currentPage: page });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getSearchVlogs(req, res) {
    let { query, page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    if (!query) {
      return res.json({ vlogs: [], totalCount: 0, totalPages: 0, currentPage: page });
    }

    try {
      let vlogs = await vlogModel.find({
        $text: { $search: query },
        isPublished: true,
        isDeleted: false
      })
        .populate("vCategory", "cName slug")
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(limit)
        .exec();

      let totalCount = await vlogModel.countDocuments({
        $text: { $search: query },
        isPublished: true,
        isDeleted: false
      });

      return res.json({ vlogs, totalCount, totalPages: Math.ceil(totalCount / limit), currentPage: page });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // ADMIN ENDPOINTS

  async getAllAdminVlogs(req, res) {
    try {
      let vlogs = await vlogModel.find({ isDeleted: false })
        .populate("vCategory", "cName slug")
        .sort({ createdAt: -1 })
        .exec();
      return res.json({ vlogs });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async postAddVlog(req, res) {
    let { title, content, excerpt, vCategory, tags, seoTitle, seoDescription, featured, isPublished } = req.body;
    
    if (!title || !content || !excerpt || !vCategory) {
      if (req.file) safeUnlink(req.file.path);
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    let uploaded = null;
    try {
      if (req.file) {
        uploaded = await uploadImage(req.file, "blogs");
        safeUnlink(req.file.path);
      }

      let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      
      // Handle tags - optionally create them if they don't exist
      let tagIds = [];
      let parsedTags = tags;
      if (typeof tags === 'string') {
        try { parsedTags = JSON.parse(tags); } catch(e) { parsedTags = [tags]; }
      }

      if (parsedTags && Array.isArray(parsedTags)) {
        for (let t of parsedTags) {
          let tagSlug = t.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          let tagObj = await vlogTagModel.findOne({ slug: tagSlug });
          if (!tagObj) {
            let newTag = new vlogTagModel({ name: t, slug: tagSlug });
            tagObj = await newTag.save();
          }
          tagIds.push(tagObj._id);
        }
      }

      let newVlog = new vlogModel({
        title,
        slug,
        content,
        excerpt,
        image: uploaded ? {
          publicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          alt: title
        } : null,
        vCategory,
        vTags: tagIds,
        seoTitle,
        seoDescription,
        featured: featured || false,
        isPublished: isPublished || false,
        publishDate: isPublished ? Date.now() : null,
        createdBy: req.user ? req.user._id : null
      });

      let save = await newVlog.save();
      if (save) {
        return res.json({ success: "Vlog created successfully", vlog: save });
      }
    } catch (err) {
      console.log(err);
      if (uploaded) {
        try { await deleteImage(uploaded.publicId); } catch(e) {}
      }
      if (req.file) safeUnlink(req.file.path);
      return res.status(500).json({ error: "Internal server error: " + err.message });
    }
  }

  async putUpdateVlog(req, res) {
    let { id } = req.params;
    let { title, content, excerpt, vCategory, tags, seoTitle, seoDescription, featured } = req.body;

    if (!title || !content || !excerpt || !vCategory) {
      if (req.file) safeUnlink(req.file.path);
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    let uploaded = null;
    try {
      const existingVlog = await vlogModel.findById(id);
      if (!existingVlog) {
        if (req.file) safeUnlink(req.file.path);
        return res.status(404).json({ error: "Vlog not found" });
      }

      let updateData = {
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        content,
        excerpt,
        vCategory,
        seoTitle,
        seoDescription,
        featured,
        updatedAt: Date.now()
      };

      if (req.file) {
        const oldPublicId = existingVlog.image ? existingVlog.image.publicId : null;
        uploaded = await replaceImage(oldPublicId, req.file, "blogs");
        safeUnlink(req.file.path);
        updateData.image = {
          publicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          alt: title
        };
      }

      let tagIds = [];
      let parsedTags = tags;
      if (typeof tags === 'string') {
        try { parsedTags = JSON.parse(tags); } catch(e) { parsedTags = [tags]; }
      }

      if (parsedTags && Array.isArray(parsedTags)) {
        for (let t of parsedTags) {
          let tagSlug = t.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          let tagObj = await vlogTagModel.findOne({ slug: tagSlug });
          if (!tagObj) {
            let newTag = new vlogTagModel({ name: t, slug: tagSlug });
            tagObj = await newTag.save();
          }
          tagIds.push(tagObj._id);
        }
      }
      updateData.vTags = tagIds;

      let updatedVlog = await vlogModel.findByIdAndUpdate(id, updateData, { new: true });
      if (updatedVlog) {
        return res.json({ success: "Vlog updated successfully", vlog: updatedVlog });
      }
    } catch (err) {
      console.log(err);
      if (uploaded) {
        try { await deleteImage(uploaded.publicId); } catch(e) {}
      }
      if (req.file) safeUnlink(req.file.path);
      return res.status(500).json({ error: "Internal server error: " + err.message });
    }
  }

  async deleteVlog(req, res) {
    let { id } = req.params;
    try {
      let deletedVlog = await vlogModel.findByIdAndUpdate(id, { isDeleted: true });
      if (deletedVlog) {
        return res.json({ success: "Vlog deleted successfully" });
      }
      return res.status(404).json({ error: "Vlog not found" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async patchPublishStatus(req, res) {
    let { id } = req.params;
    let { action } = req.body; // "publish" or "unpublish"

    try {
      let isPublished = action === "publish";
      let publishDate = isPublished ? Date.now() : null;

      let updatedVlog = await vlogModel.findByIdAndUpdate(id, {
        isPublished,
        publishDate
      }, { new: true });

      if (updatedVlog) {
        return res.json({ success: `Vlog ${action}ed successfully`, vlog: updatedVlog });
      }
      return res.status(404).json({ error: "Vlog not found" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

const vlogController = new Vlog();
module.exports = vlogController;
