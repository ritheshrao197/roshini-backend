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

const toVlogListItem = (vlog) => {
  const plainText = typeof vlog.content === "string"
    ? vlog.content.replace(/<[^>]*>/g, " ")
    : "";
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;

  return {
    ...vlog,
    thumbnail: vlog.image?.secureUrl || "",
    readingTime: Math.max(1, Math.ceil(wordCount / 200)),
  };
};

class Vlog {
  // PUBLIC ENDPOINTS

  async getAllVlogs(req, res) {
    try {
      let { page, limit, category, tag, search, sort } = req.query;
      page = parseInt(page) || 1;
      limit = parseInt(limit) || 10;
      const skip = (page - 1) * limit;

      let queryCondition = { isPublished: true, isDeleted: false };

      // Category filter (by slug)
      if (category) {
        const cat = await vlogCategoryModel.findOne({ slug: category, isDeleted: false });
        if (cat) {
          queryCondition.vCategory = cat._id;
        } else {
          return res.json({ vlogs: [], totalCount: 0, totalPages: 0, currentPage: page });
        }
      }

      // Tag filter (by slug)
      if (tag) {
        const tagObj = await vlogTagModel.findOne({ slug: tag });
        if (tagObj) {
          queryCondition.vTags = tagObj._id;
        } else {
          return res.json({ vlogs: [], totalCount: 0, totalPages: 0, currentPage: page });
        }
      }

      // Search filter
      if (search) {
        queryCondition.$text = { $search: search };
      }

      let sortCondition = { publishDate: -1 };
      if (sort === "popular") {
        sortCondition = { viewCount: -1 };
      } else if (sort === "featured") {
        queryCondition.featured = true;
        sortCondition = { publishDate: -1 };
      } else if (sort === "latest") {
        sortCondition = { publishDate: -1 };
      }

      let vlogs = await vlogModel.find(queryCondition)
        .select(VLOG_LIST_SELECT)
        .populate("vCategory", "cName slug")
        .populate("vTags", "name slug")
        .sort(sortCondition)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      let totalCount = await vlogModel.countDocuments(queryCondition);

      return res.json({
        vlogs: vlogs.map(toVlogListItem),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      });
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
        .populate("relatedProducts", "pName pPrice pImages slug")
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
        .select(VLOG_LIST_SELECT)
        .populate("vCategory", "cName slug")
        .sort({ publishDate: -1 })
        .limit(5)
        .lean()
        .exec();
      return res.json({ vlogs: vlogs.map(toVlogListItem) });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getLatestVlogs(req, res) {
    try {
      let vlogs = await vlogModel.find({ isPublished: true, isDeleted: false })
        .select(VLOG_LIST_SELECT)
        .populate("vCategory", "cName slug")
        .sort({ publishDate: -1 })
        .limit(5)
        .lean()
        .exec();
      return res.json({ vlogs: vlogs.map(toVlogListItem) });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getPopularVlogs(req, res) {
    try {
      let vlogs = await vlogModel.find({ isPublished: true, isDeleted: false })
        .select(VLOG_LIST_SELECT)
        .populate("vCategory", "cName slug")
        .sort({ viewCount: -1 })
        .limit(5)
        .lean()
        .exec();
      return res.json({ vlogs: vlogs.map(toVlogListItem) });
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
        .select(VLOG_LIST_SELECT)
        .populate("vCategory", "cName slug")
        .populate("vTags", "name slug")
        .sort({ publishDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      let totalCount = await vlogModel.countDocuments({ vCategory: category._id, isPublished: true, isDeleted: false });

      return res.json({
        vlogs: vlogs.map(toVlogListItem),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      });
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
        .select(VLOG_LIST_SELECT)
        .populate("vCategory", "cName slug")
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      let totalCount = await vlogModel.countDocuments({
        $text: { $search: query },
        isPublished: true,
        isDeleted: false
      });

      return res.json({
        vlogs: vlogs.map(toVlogListItem),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      });
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
        .populate("vTags", "name slug")
        .populate("relatedProducts", "pName pPrice pImages slug")
        .sort({ createdAt: -1 })
        .exec();
      return res.json({ vlogs });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async postAddVlog(req, res) {
    let { 
      title, content, excerpt, vCategory, tags, 
      seoTitle, seoDescription, seoKeywords, canonicalUrl, ogImage,
      featured, isPublished, status, scheduledPublishDate, relatedProducts 
    } = req.body;
    
    if (!title || !content || !excerpt || !vCategory) {
      if (req.file) safeUnlink(req.file.path);
      if (req.files) {
        if (req.files.thumbnail && req.files.thumbnail[0]) safeUnlink(req.files.thumbnail[0].path);
        if (req.files.gallery) req.files.gallery.forEach(f => safeUnlink(f.path));
      }
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    let thumbnailFile = null;
    if (req.file) {
      thumbnailFile = req.file;
    } else if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      thumbnailFile = req.files.thumbnail[0];
    }

    let galleryFiles = [];
    if (req.files && req.files.gallery) {
      galleryFiles = req.files.gallery;
    }

    let uploaded = null;
    let galleryUploaded = [];
    try {
      if (thumbnailFile) {
        uploaded = await uploadImage(thumbnailFile, "blogs");
        safeUnlink(thumbnailFile.path);
      }

      if (galleryFiles && galleryFiles.length > 0) {
        for (const file of galleryFiles) {
          const resG = await uploadImage(file, "blogs");
          safeUnlink(file.path);
          galleryUploaded.push({
            publicId: resG.publicId,
            secureUrl: resG.secureUrl,
            alt: title
          });
        }
      }

      let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      let baseSlug = slug;
      let count = 1;
      while (await vlogModel.findOne({ slug, isDeleted: false })) {
        slug = `${baseSlug}-${count}`;
        count++;
      }
      
      let tagIds = [];
      let parsedTags = tags;
      if (typeof tags === 'string') {
        try { parsedTags = JSON.parse(tags); } catch(e) { parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean); }
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

      let finalStatus = status || (isPublished === 'true' || isPublished === true ? "Published" : "Draft");
      let finalIsPublished = finalStatus === "Published";
      let finalPublishDate = finalIsPublished ? Date.now() : null;

      let parsedProducts = [];
      if (relatedProducts) {
        try {
          parsedProducts = typeof relatedProducts === 'string' ? JSON.parse(relatedProducts) : relatedProducts;
        } catch (e) {
          parsedProducts = [relatedProducts];
        }
      }

      let parsedKeywords = [];
      if (seoKeywords) {
        try {
          parsedKeywords = typeof seoKeywords === 'string' ? JSON.parse(seoKeywords) : seoKeywords;
        } catch (e) {
          parsedKeywords = seoKeywords.split(",").map(k => k.trim()).filter(Boolean);
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
        seoKeywords: parsedKeywords,
        canonicalUrl,
        ogImage,
        featured: featured === 'true' || featured === true,
        status: finalStatus,
        isPublished: finalIsPublished,
        publishDate: finalPublishDate,
        scheduledPublishDate: scheduledPublishDate ? new Date(scheduledPublishDate) : null,
        relatedProducts: parsedProducts,
        gallery: galleryUploaded,
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
      for (const img of galleryUploaded) {
        try { await deleteImage(img.publicId); } catch(e) {}
      }
      if (thumbnailFile) safeUnlink(thumbnailFile.path);
      if (galleryFiles && galleryFiles.length > 0) {
        galleryFiles.forEach(f => safeUnlink(f.path));
      }
      return res.status(500).json({ error: "Internal server error: " + err.message });
    }
  }

  async putUpdateVlog(req, res) {
    let { id } = req.params;
    let { 
      title, content, excerpt, vCategory, tags, 
      seoTitle, seoDescription, seoKeywords, canonicalUrl, ogImage,
      featured, isPublished, status, scheduledPublishDate, relatedProducts, currentGallery 
    } = req.body;

    if (!title || !content || !excerpt || !vCategory) {
      if (req.file) safeUnlink(req.file.path);
      if (req.files) {
        if (req.files.thumbnail && req.files.thumbnail[0]) safeUnlink(req.files.thumbnail[0].path);
        if (req.files.gallery) req.files.gallery.forEach(f => safeUnlink(f.path));
      }
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    let thumbnailFile = null;
    if (req.file) {
      thumbnailFile = req.file;
    } else if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      thumbnailFile = req.files.thumbnail[0];
    }

    let galleryFiles = [];
    if (req.files && req.files.gallery) {
      galleryFiles = req.files.gallery;
    }

    let uploaded = null;
    let galleryUploaded = [];
    try {
      const existingVlog = await vlogModel.findOne({ _id: id, isDeleted: false });
      if (!existingVlog) {
        if (thumbnailFile) safeUnlink(thumbnailFile.path);
        if (galleryFiles && galleryFiles.length > 0) galleryFiles.forEach(f => safeUnlink(f.path));
        return res.status(404).json({ error: "Vlog not found" });
      }

      let finalStatus = status || (isPublished === 'true' || isPublished === true ? "Published" : "Draft");
      let finalIsPublished = finalStatus === "Published";
      let finalPublishDate = finalIsPublished ? (existingVlog.publishDate || Date.now()) : null;

      let parsedProducts = [];
      if (relatedProducts) {
        try {
          parsedProducts = typeof relatedProducts === 'string' ? JSON.parse(relatedProducts) : relatedProducts;
        } catch (e) {
          parsedProducts = [relatedProducts];
        }
      }

      let parsedKeywords = [];
      if (seoKeywords) {
        try {
          parsedKeywords = typeof seoKeywords === 'string' ? JSON.parse(seoKeywords) : seoKeywords;
        } catch (e) {
          parsedKeywords = seoKeywords.split(",").map(k => k.trim()).filter(Boolean);
        }
      }

      let updateData = {
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        content,
        excerpt,
        vCategory,
        seoTitle,
        seoDescription,
        seoKeywords: parsedKeywords,
        canonicalUrl,
        ogImage,
        featured: featured === 'true' || featured === true,
        status: finalStatus,
        isPublished: finalIsPublished,
        publishDate: finalPublishDate,
        scheduledPublishDate: scheduledPublishDate ? new Date(scheduledPublishDate) : null,
        relatedProducts: parsedProducts,
        updatedAt: Date.now()
      };

      if (thumbnailFile) {
        const oldPublicId = existingVlog.image ? existingVlog.image.publicId : null;
        uploaded = await replaceImage(oldPublicId, thumbnailFile, "blogs");
        safeUnlink(thumbnailFile.path);
        updateData.image = {
          publicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          alt: title
        };
      }

      if (galleryFiles && galleryFiles.length > 0) {
        for (const file of galleryFiles) {
          const resG = await uploadImage(file, "blogs");
          safeUnlink(file.path);
          galleryUploaded.push({
            publicId: resG.publicId,
            secureUrl: resG.secureUrl,
            alt: title
          });
        }
      }

      let retainedGallery = [];
      if (currentGallery) {
        try {
          retainedGallery = typeof currentGallery === 'string' ? JSON.parse(currentGallery) : currentGallery;
        } catch (e) {
          retainedGallery = existingVlog.gallery || [];
        }
      } else {
        retainedGallery = existingVlog.gallery || [];
      }
      updateData.gallery = [...retainedGallery, ...galleryUploaded];

      let tagIds = [];
      let parsedTags = tags;
      if (typeof tags === 'string') {
        try { parsedTags = JSON.parse(tags); } catch(e) { parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean); }
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
      for (const img of galleryUploaded) {
        try { await deleteImage(img.publicId); } catch(e) {}
      }
      if (thumbnailFile) safeUnlink(thumbnailFile.path);
      if (galleryFiles && galleryFiles.length > 0) {
        galleryFiles.forEach(f => safeUnlink(f.path));
      }
      return res.status(500).json({ error: "Internal server error: " + err.message });
    }
  }

  async deleteVlog(req, res) {
    let { id } = req.params;
    try {
      let deletedVlog = await vlogModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true, isPublished: false, status: "Archived", publishDate: null },
        { new: true }
      );
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

      let updatedVlog = await vlogModel.findOneAndUpdate({
        _id: id,
        isDeleted: false
      }, {
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

  async patchVlogStatus(req, res) {
    let { id } = req.params;
    let { status } = req.body;

    if (!["Draft", "Published", "Archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    try {
      const existingVlog = await vlogModel.findOne({ _id: id, isDeleted: false });
      if (!existingVlog) {
        return res.status(404).json({ error: "Vlog not found" });
      }

      const updateData = {
        status,
        isPublished: status === "Published",
        publishDate: status === "Published"
          ? (existingVlog.publishDate || new Date())
          : null
      };

      const updatedVlog = await vlogModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        updateData,
        { new: true }
      );
      return res.json({ success: "Vlog status updated successfully", vlog: updatedVlog });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async submitPublicVlog(req, res) {
    let { title, content, excerpt, category, tags, seoTitle, seoDescription, imageUrl } = req.body;

    if (!title || !category || !content) {
      if (req.file) safeUnlink(req.file.path);
      return res.status(400).json({ error: "Title, category, and content are required fields." });
    }

    let uploaded = null;
    try {
      // 1. Handle image upload (either file or remote URL)
      if (req.file) {
        uploaded = await uploadImage(req.file, "blogs");
        safeUnlink(req.file.path);
      } else if (imageUrl) {
        try {
          uploaded = await uploadImage(imageUrl, "blogs");
        } catch (uploadErr) {
          console.error("[VlogController] Public submit failed to upload image from URL:", uploadErr);
          return res.status(400).json({ error: "Failed to upload image from the provided URL: " + uploadErr.message });
        }
      }

      // 2. Generate slug with collision avoidance
      let baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      if (!baseSlug) {
        baseSlug = "submitted-blog";
      }
      let slug = baseSlug;
      let count = 1;
      while (await vlogModel.findOne({ slug, isDeleted: false })) {
        slug = `${baseSlug}-${count}`;
        count++;
      }

      // 3. Auto-generate excerpt if not provided (strip HTML tags and get first 150 chars)
      let finalExcerpt = excerpt;
      if (!finalExcerpt) {
        const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim();
        finalExcerpt = plainText.substring(0, 150);
        if (plainText.length > 150) {
          finalExcerpt += "...";
        }
      }

      // 4. Resolve category
      let categoryId = null;
      if (category) {
        const mongoose = require("mongoose");
        if (mongoose.Types.ObjectId.isValid(category)) {
          const existingCat = await vlogCategoryModel.findById(category);
          if (existingCat) {
            categoryId = existingCat._id;
          }
        }
        
        if (!categoryId) {
          const cleanCategoryName = category.trim();
          let existingCat = await vlogCategoryModel.findOne({ 
            cName: { $regex: new RegExp(`^${cleanCategoryName}$`, "i") } 
          });
          if (existingCat) {
            categoryId = existingCat._id;
          } else {
            let catSlug = cleanCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
            let catBaseSlug = catSlug || "category";
            catSlug = catBaseSlug;
            let catCount = 1;
            while (await vlogCategoryModel.findOne({ slug: catSlug })) {
              catSlug = `${catBaseSlug}-${catCount}`;
              catCount++;
            }
            const newCat = new vlogCategoryModel({
              cName: cleanCategoryName,
              cDescription: `Blogs related to ${cleanCategoryName}`,
              slug: catSlug,
              cStatus: "Active"
            });
            const savedCat = await newCat.save();
            categoryId = savedCat._id;
          }
        }
      }

      // 5. Handle tags
      let tagIds = [];
      let parsedTags = tags;
      if (typeof tags === 'string') {
        try { 
          parsedTags = JSON.parse(tags); 
        } catch(e) { 
          parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean); 
        }
      }

      if (parsedTags && Array.isArray(parsedTags)) {
        for (let t of parsedTags) {
          let cleanTagName = t.trim();
          if (!cleanTagName) continue;
          let tagSlug = cleanTagName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          let tagObj = await vlogTagModel.findOne({ slug: tagSlug });
          if (!tagObj) {
            let newTag = new vlogTagModel({ name: cleanTagName, slug: tagSlug });
            tagObj = await newTag.save();
          }
          tagIds.push(tagObj._id);
        }
      }

      // 6. Create the Blog (always set isPublished: false, publishedDate: null)
      let newVlog = new vlogModel({
        title,
        slug,
        content,
        excerpt: finalExcerpt,
        image: uploaded ? {
          publicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          alt: title
        } : null,
        vCategory: categoryId,
        vTags: tagIds,
        seoTitle: seoTitle || `${title} | Roshini's Home Products`,
        seoDescription: seoDescription || finalExcerpt,
        featured: false,
        isPublished: false,
        publishDate: null,
        createdBy: null
      });

      let savedVlog = await newVlog.save();
      if (savedVlog) {
        return res.status(201).json({ 
          success: "Blog submitted successfully. It will be reviewed, edited, and published by an administrator.", 
          blog: savedVlog 
        });
      }
    } catch (err) {
      console.error("[VlogController] Error in submitPublicVlog:", err);
      if (uploaded) {
        try { await deleteImage(uploaded.publicId); } catch(e) {}
      }
      if (req.file) safeUnlink(req.file.path);
      return res.status(500).json({ error: "Internal server error: " + err.message });
    }
  }

  async importBlog(req, res) {
    let { 
      title, content, excerpt, format, category, tags, 
      seoTitle, seoDescription, seoKeywords, canonicalUrl, ogImage, imageUrl 
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required." });
    }

    try {
      let finalContent = content;
      if (format === "markdown") {
        const markedModule = await import("marked");
        const markedParser = markedModule.marked || markedModule.default;
        finalContent = markedParser.parse(content);
      }

      // 1. Resolve slug with collision avoidance
      let baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      if (!baseSlug) baseSlug = "imported-blog";
      let slug = baseSlug;
      let count = 1;
      while (await vlogModel.findOne({ slug, isDeleted: false })) {
        slug = `${baseSlug}-${count}`;
        count++;
      }

      // 2. Resolve category
      let categoryId = null;
      if (category) {
        const mongoose = require("mongoose");
        if (mongoose.Types.ObjectId.isValid(category)) {
          const existingCat = await vlogCategoryModel.findById(category);
          if (existingCat) categoryId = existingCat._id;
        }

        if (!categoryId) {
          const cleanCategoryName = category.trim();
          let existingCat = await vlogCategoryModel.findOne({ 
            cName: { $regex: new RegExp(`^${cleanCategoryName}$`, "i") } 
          });
          if (existingCat) {
            categoryId = existingCat._id;
          } else {
            let catSlug = cleanCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
            let catBaseSlug = catSlug || "category";
            catSlug = catBaseSlug;
            let catCount = 1;
            while (await vlogCategoryModel.findOne({ slug: catSlug })) {
              catSlug = `${catBaseSlug}-${catCount}`;
              catCount++;
            }
            const newCat = new vlogCategoryModel({
              cName: cleanCategoryName,
              cDescription: `Blogs related to ${cleanCategoryName}`,
              slug: catSlug,
              cStatus: "Active"
            });
            const savedCat = await newCat.save();
            categoryId = savedCat._id;
          }
        }
      } else {
        let generalCat = await vlogCategoryModel.findOne({ cName: { $regex: /^General$/i } });
        if (!generalCat) {
          generalCat = new vlogCategoryModel({
            cName: "General",
            cDescription: "General blog posts",
            slug: "general",
            cStatus: "Active"
          });
          generalCat = await generalCat.save();
        }
        categoryId = generalCat._id;
      }

      // 3. Resolve tags
      let tagIds = [];
      let parsedTags = tags;
      if (typeof tags === 'string') {
        try { parsedTags = JSON.parse(tags); } catch(e) { parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean); }
      }

      if (parsedTags && Array.isArray(parsedTags)) {
        for (let t of parsedTags) {
          let cleanTagName = t.trim();
          if (!cleanTagName) continue;
          let tagSlug = cleanTagName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          let tagObj = await vlogTagModel.findOne({ slug: tagSlug });
          if (!tagObj) {
            let newTag = new vlogTagModel({ name: cleanTagName, slug: tagSlug });
            tagObj = await newTag.save();
          }
          tagIds.push(tagObj._id);
        }
      }

      // 4. Image Upload (from remote URL)
      let uploaded = null;
      if (imageUrl) {
        try {
          uploaded = await uploadImage(imageUrl, "blogs");
        } catch (uploadErr) {
          console.error("Import failed to upload remote image:", uploadErr);
        }
      }

      // 5. Excerpt auto-generation
      let finalExcerpt = excerpt;
      if (!finalExcerpt) {
        const plainText = finalContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim();
        finalExcerpt = plainText.substring(0, 150);
        if (plainText.length > 150) finalExcerpt += "...";
      }

      let parsedKeywords = [];
      if (seoKeywords) {
        try {
          parsedKeywords = typeof seoKeywords === 'string' ? JSON.parse(seoKeywords) : seoKeywords;
        } catch (e) {
          parsedKeywords = seoKeywords.split(",").map(k => k.trim()).filter(Boolean);
        }
      }

      // 6. Create Draft
      const newVlog = new vlogModel({
        title,
        slug,
        content: finalContent,
        excerpt: finalExcerpt,
        image: uploaded ? {
          publicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          alt: title
        } : null,
        vCategory: categoryId,
        vTags: tagIds,
        seoTitle: seoTitle || `${title} | Roshini's Home Products`,
        seoDescription: seoDescription || finalExcerpt,
        seoKeywords: parsedKeywords,
        canonicalUrl,
        ogImage,
        featured: false,
        status: "Draft",
        isPublished: false,
        publishDate: null,
        createdBy: null
      });

      const saved = await newVlog.save();
      return res.status(201).json({ success: "Blog imported successfully as Draft", blog: saved });
    } catch (err) {
      console.error("Import API Error:", err);
      return res.status(500).json({ error: "Internal server error: " + err.message });
    }
  }

  async importBlogBulk(req, res) {
    let blogs = req.body.blogs || req.body;
    if (!blogs || !Array.isArray(blogs)) {
      return res.status(400).json({ error: "Request body must contain an array of blogs." });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    const importedBlogs = [];

    for (const blogItem of blogs) {
      try {
        let { 
          title, content, excerpt, format, category, tags, 
          seoTitle, seoDescription, seoKeywords, canonicalUrl, ogImage, imageUrl 
        } = blogItem;

        if (!title || !content) {
          failedCount++;
          errors.push({ title: title || "Unknown", error: "Title and content are required." });
          continue;
        }

        let finalContent = content;
        if (format === "markdown") {
          const markedModule = await import("marked");
          const markedParser = markedModule.marked || markedModule.default;
          finalContent = markedParser.parse(content);
        }

        let baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
        if (!baseSlug) baseSlug = "imported-blog";
        let slug = baseSlug;
        let count = 1;
        while (await vlogModel.findOne({ slug, isDeleted: false })) {
          slug = `${baseSlug}-${count}`;
          count++;
        }

        let categoryId = null;
        if (category) {
          const mongoose = require("mongoose");
          if (mongoose.Types.ObjectId.isValid(category)) {
            const existingCat = await vlogCategoryModel.findById(category);
            if (existingCat) categoryId = existingCat._id;
          }

          if (!categoryId) {
            const cleanCategoryName = category.trim();
            let existingCat = await vlogCategoryModel.findOne({ 
              cName: { $regex: new RegExp(`^${cleanCategoryName}$`, "i") } 
            });
            if (existingCat) {
              categoryId = existingCat._id;
            } else {
              let catSlug = cleanCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
              let catBaseSlug = catSlug || "category";
              catSlug = catBaseSlug;
              let catCount = 1;
              while (await vlogCategoryModel.findOne({ slug: catSlug })) {
                catSlug = `${catBaseSlug}-${catCount}`;
                catCount++;
              }
              const newCat = new vlogCategoryModel({
                cName: cleanCategoryName,
                cDescription: `Blogs related to ${cleanCategoryName}`,
                slug: catSlug,
                cStatus: "Active"
              });
              const savedCat = await newCat.save();
              categoryId = savedCat._id;
            }
          }
        } else {
          let generalCat = await vlogCategoryModel.findOne({ cName: { $regex: /^General$/i } });
          if (!generalCat) {
            generalCat = new vlogCategoryModel({
              cName: "General",
              cDescription: "General blog posts",
              slug: "general",
              cStatus: "Active"
            });
            generalCat = await generalCat.save();
          }
          categoryId = generalCat._id;
        }

        let tagIds = [];
        let parsedTags = tags;
        if (typeof tags === 'string') {
          try { parsedTags = JSON.parse(tags); } catch(e) { parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean); }
        }

        if (parsedTags && Array.isArray(parsedTags)) {
          for (let t of parsedTags) {
            let cleanTagName = t.trim();
            if (!cleanTagName) continue;
            let tagSlug = cleanTagName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            let tagObj = await vlogTagModel.findOne({ slug: tagSlug });
            if (!tagObj) {
              let newTag = new vlogTagModel({ name: cleanTagName, slug: tagSlug });
              tagObj = await newTag.save();
            }
            tagIds.push(tagObj._id);
          }
        }

        let uploaded = null;
        if (imageUrl) {
          try {
            uploaded = await uploadImage(imageUrl, "blogs");
          } catch (uploadErr) {
            console.error("Bulk import failed to upload remote image:", uploadErr);
          }
        }

        let finalExcerpt = excerpt;
        if (!finalExcerpt) {
          const plainText = finalContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim();
          finalExcerpt = plainText.substring(0, 150);
          if (plainText.length > 150) finalExcerpt += "...";
        }

        let parsedKeywords = [];
        if (seoKeywords) {
          try {
            parsedKeywords = typeof seoKeywords === 'string' ? JSON.parse(seoKeywords) : seoKeywords;
          } catch (e) {
            parsedKeywords = seoKeywords.split(",").map(k => k.trim()).filter(Boolean);
          }
        }

        const newVlog = new vlogModel({
          title,
          slug,
          content: finalContent,
          excerpt: finalExcerpt,
          image: uploaded ? {
            publicId: uploaded.publicId,
            secureUrl: uploaded.secureUrl,
            alt: title
          } : null,
          vCategory: categoryId,
          vTags: tagIds,
          seoTitle: seoTitle || `${title} | Roshini's Home Products`,
          seoDescription: seoDescription || finalExcerpt,
          seoKeywords: parsedKeywords,
          canonicalUrl,
          ogImage,
          featured: false,
          status: "Draft",
          isPublished: false,
          publishDate: null,
          createdBy: null
        });

        const saved = await newVlog.save();
        importedBlogs.push(saved);
        successCount++;
      } catch (err) {
        failedCount++;
        errors.push({ title: blogItem.title || "Unknown", error: err.message });
      }
    }

    return res.status(201).json({
      success: `${successCount} blogs imported successfully, ${failedCount} failed`,
      importedCount: successCount,
      failedCount,
      importedBlogs,
      errors
    });
  }

  async likeVlog(req, res) {
    let { id } = req.params;
    try {
      let updated = await vlogModel.findOneAndUpdate(
        { _id: id, isPublished: true, isDeleted: false },
        { $inc: { likesCount: 1 } },
        { new: true }
      );
      if (updated) {
        return res.json({ success: "Vlog liked successfully", likesCount: updated.likesCount });
      }
      return res.status(404).json({ error: "Vlog not found" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getRelatedVlogs(req, res) {
    let { id } = req.params;
    try {
      const vlog = await vlogModel.findOne({
        _id: id,
        isPublished: true,
        isDeleted: false
      }).populate("vTags");
      if (!vlog) {
        return res.status(404).json({ error: "Vlog not found" });
      }
      const tagIds = vlog.vTags.map(t => t._id);
      
      const related = await vlogModel.find({
        _id: { $ne: vlog._id },
        isPublished: true,
        isDeleted: false,
        $or: [
          { vCategory: vlog.vCategory },
          { vTags: { $in: tagIds } }
        ]
      })
      .populate("vCategory", "cName slug")
      .populate("vTags", "name slug")
      .limit(4)
      .exec();
      
      return res.json({ related });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

const vlogController = new Vlog();
module.exports = vlogController;
