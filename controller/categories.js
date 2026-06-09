const { toTitleCase } = require("../config/function");
const categoryModel = require("../models/categories");
const { cloudinary } = require("../config/cloudinary");

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

    let cImage = req.file.path; // Cloudinary URL
    let cloudinaryPublicId = req.file.filename; // Cloudinary Public ID

    const deleteUploadedImage = () => {
      if (cloudinaryPublicId) {
        cloudinary.uploader.destroy(cloudinaryPublicId, (error) => {
          if (error) console.error("[CategoryController] Cloudinary delete error:", error);
        });
      }
    };

    if (!cName || !cDescription || !cStatus) {
      deleteUploadedImage();
      return res.status(400).json({ error: "All fields are required" });
    } else {
      cName = toTitleCase(cName);
      try {
        let checkCategoryExists = await categoryModel.findOne({ cName: cName });
        if (checkCategoryExists) {
          deleteUploadedImage();
          return res.json({ error: "Category already exists" });
        } else {
          let newCategory = new categoryModel({
            cName,
            cDescription,
            cStatus,
            cImage,
            cloudinaryPublicId,
          });
          await newCategory.save((err) => {
            if (!err) {
              return res.json({ success: "Category created successfully" });
            }
          });
        }
      } catch (err) {
        console.error("[CategoryController] postAddCategory error:", err);
        deleteUploadedImage();
        return res.status(500).json({ error: "Server error" });
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
          if (deletedCategoryFile && deletedCategoryFile.cloudinaryPublicId) {
            cloudinary.uploader.destroy(deletedCategoryFile.cloudinaryPublicId, (error) => {
              if (error) console.error("[CategoryController] Cloudinary delete error:", error);
            });
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
