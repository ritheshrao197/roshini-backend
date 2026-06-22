const { toTitleCase } = require("../config/function");
const categoryModel = require("../models/categories");
const { uploadImage, deleteImage } = require("../services/cloudinaryUpload");
const fs = require("fs");

const safeUnlink = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error("[CategoryController] Failed to delete local temp file:", e);
    }
  }
};

class Category {
  async getAllCategory(req, res) {
    try {
      let Categories = await categoryModel.find({}).sort({ _id: -1 });
      if (Categories) {
        return res.json({ Categories });
      }
    } catch (err) {
      console.error("[CategoryController] getAllCategory error:", err);
    }
  }

  async postAddCategory(req, res) {
    let { cName, cDescription, cStatus } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: "Category image file is required" });
    }

    let uploaded = null;

    if (!cName || !cDescription || !cStatus) {
      safeUnlink(req.file.path);
      return res.status(400).json({ error: "All fields are required" });
    } else {
      cName = toTitleCase(cName);
      try {
        let checkCategoryExists = await categoryModel.findOne({ cName: cName });
        if (checkCategoryExists) {
          safeUnlink(req.file.path);
          return res.json({ error: "Category already exists" });
        } else {
          // Upload to Cloudinary
          uploaded = await uploadImage(req.file, "categories");
          safeUnlink(req.file.path);

          let newCategory = new categoryModel({
            cName,
            cDescription,
            cStatus,
            image: {
              publicId: uploaded.publicId,
              secureUrl: uploaded.secureUrl,
              alt: cName
            }
          });
          
          await newCategory.save();
          return res.json({ success: "Category created successfully" });
        }
      } catch (err) {
        console.error("[CategoryController] postAddCategory error:", err);
        if (uploaded) {
          try {
            await deleteImage(uploaded.publicId);
          } catch (delErr) {
            console.error("[CategoryController] Cleanup delete error:", delErr);
          }
        }
        safeUnlink(req.file.path);
        return res.status(500).json({ error: "Server error: " + err.message });
      }
    }
  }

  async postEditCategory(req, res) {
    let { cId, cDescription, cStatus } = req.body;
    if (!cId || !cDescription || !cStatus) {
      return res.json({ error: "All filled must be required" });
    }
    try {
      let editCategory = categoryModel.findByIdAndUpdate(cId, {
        cDescription,
        cStatus,
        updatedAt: Date.now(),
      });
      let edit = await editCategory.exec();
      if (edit) {
        return res.json({ success: "Category edit successfully" });
      }
    } catch (err) {
      console.error("[CategoryController] postEditCategory error:", err);
    }
  }

  async getDeleteCategory(req, res) {
    let { cId } = req.body;
    if (!cId) {
      return res.json({ error: "All filled must be required" });
    } else {
      try {
        let deletedCategoryFile = await categoryModel.findById(cId);
        let deleteCategory = await categoryModel.findByIdAndDelete(cId);
        
        if (deleteCategory) {
          // Delete Image from Cloudinary
          if (deletedCategoryFile && deletedCategoryFile.image && deletedCategoryFile.image.publicId) {
            try {
              await deleteImage(deletedCategoryFile.image.publicId);
            } catch (err) {
              console.error("[CategoryController] Cloudinary delete error:", err);
            }
          }
          return res.json({ success: "Category deleted successfully" });
        }
      } catch (err) {
        console.error("[CategoryController] getDeleteCategory error:", err);
      }
    }
  }
}

const categoryController = new Category();
module.exports = categoryController;
