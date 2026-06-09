const vlogCategoryModel = require("../models/vlogCategories");

class VlogCategory {
  async getAllCategory(req, res) {
    try {
      let Categories = await vlogCategoryModel.find({ isDeleted: false }).sort({ _id: -1 });
      if (Categories) {
        return res.json({ Categories });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async postAddCategory(req, res) {
    let { cName, cDescription, cStatus } = req.body;
    if (!cName || !cDescription) {
      return res.json({ error: "All filled must be required" });
    } else {
      let slug = cName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      
      try {
        let checkCategoryExists = await vlogCategoryModel.findOne({ cName: cName });
        if (checkCategoryExists) {
          return res.json({ error: "Category already exists" });
        } else {
          let newCategory = new vlogCategoryModel({
            cName,
            cDescription,
            cStatus,
            slug
          });
          let save = await newCategory.save();
          if (save) {
            return res.json({ success: "Category created successfully" });
          }
        }
      } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  }

  async postEditCategory(req, res) {
    let { cId, cName, cDescription, cStatus } = req.body;
    if (!cId || !cName || !cDescription || !cStatus) {
      return res.json({ error: "All filled must be required" });
    }
    try {
      let editCategory = vlogCategoryModel.findByIdAndUpdate(cId, {
        cName,
        cDescription,
        cStatus,
        slug: cName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        updatedAt: Date.now(),
      });
      let edit = await editCategory.exec();
      if (edit) {
        return res.json({ success: "Category edit successfully" });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getDeleteCategory(req, res) {
    let { cId } = req.body;
    if (!cId) {
      return res.json({ error: "All filled must be required" });
    } else {
      try {
        let deletedCategory = await vlogCategoryModel.findByIdAndUpdate(cId, { isDeleted: true });
        if (deletedCategory) {
          return res.json({ success: "Category deleted successfully" });
        }
      } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  }
}

const vlogCategoryController = new VlogCategory();
module.exports = vlogCategoryController;
