const fs = require("fs");
const categoryModel = require("../models/categories");
const productModel = require("../models/products");
const orderModel = require("../models/orders");
const userModel = require("../models/users");
const customizeModel = require("../models/customize");

class Customize {
  async getImages(req, res) {
    try {
      let Images = await customizeModel.find({ type: "slide" });
      if (Images) {
        return res.json({ Images });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async uploadSlideImage(req, res) {
    let image = req.file.filename;
    if (!image) {
      return res.json({ error: "All field required" });
    }
    try {
      let newCustomzie = new customizeModel({
        slideImage: image,
        type: "slide",
      });
      let save = await newCustomzie.save();
      if (save) {
        return res.json({ success: "Image upload successfully" });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async deleteSlideImage(req, res) {
    let { id } = req.body;
    if (!id) {
      return res.json({ error: "All field required" });
    } else {
      try {
        let deletedSlideImage = await customizeModel.findById(id);
        const filePath = `./public/uploads/customize/${deletedSlideImage.slideImage}`;

        let deleteImage = await customizeModel.findByIdAndDelete(id);
        if (deleteImage) {
          // Delete Image from uploads -> customizes folder
          fs.unlink(filePath, (err) => {
            if (err) {
              console.log(err);
            }
            return res.json({ success: "Image deleted successfully" });
          });
        }
      } catch (err) {
        console.log(err);
      }
    }
  }

  async getAllData(req, res) {
    try {
      let Categories = await categoryModel.find({}).count();
      let Products = await productModel.find({}).count();
      let Orders = await orderModel.find({}).count();
      let Users = await userModel.find({}).count();
      if (Categories && Products && Orders) {
        return res.json({ Categories, Products, Orders, Users });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async getPaymentSettings(req, res) {
    try {
      let settings = await customizeModel.findOne({ type: "settings" });
      if (!settings) {
        settings = new customizeModel({
          type: "settings",
          phonePeEnabled: true,
          payUEnabled: true,
        });
        await settings.save();
      }
      return res.json({
        phonePeEnabled: settings.phonePeEnabled !== false,
        payUEnabled: settings.payUEnabled !== false,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Failed to load payment settings" });
    }
  }

  async updatePaymentSettings(req, res) {
    let { phonePeEnabled, payUEnabled } = req.body;
    try {
      let settings = await customizeModel.findOne({ type: "settings" });
      if (!settings) {
        settings = new customizeModel({
          type: "settings",
          phonePeEnabled: phonePeEnabled === true || phonePeEnabled === "true",
          payUEnabled: payUEnabled === true || payUEnabled === "true",
        });
        await settings.save();
      } else {
        settings.phonePeEnabled = phonePeEnabled === true || phonePeEnabled === "true";
        settings.payUEnabled = payUEnabled === true || payUEnabled === "true";
        await settings.save();
      }
      return res.json({ success: "Payment settings updated successfully" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Failed to update payment settings" });
    }
  }

  async getCustomizeSettings(req, res) {
    try {
      let settings = await customizeModel.findOne({ type: "settings" });
      if (!settings) {
        settings = new customizeModel({
          type: "settings",
          phonePeEnabled: true,
          payUEnabled: true,
          shopName: "Roshini's",
          shopSubtitle: "Home Products",
          themePrimaryColor: "#6B3E26",
          themePrimaryColorDark: "#4e2c18",
          themePrimaryColorLight: "#8a5438",
          themeCreamColor: "#F5E9DA",
          themeCreamColorDark: "#ede0cc",
        });
        await settings.save();
      }
      return res.json({ settings });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Failed to load customization settings" });
    }
  }

  async updateCustomizeSettings(req, res) {
    let {
      shopName,
      shopSubtitle,
      themePrimaryColor,
      themePrimaryColorDark,
      themePrimaryColorLight,
      themeCreamColor,
      themeCreamColorDark,
      removeLogo
    } = req.body;

    try {
      let settings = await customizeModel.findOne({ type: "settings" });
      if (!settings) {
        settings = new customizeModel({
          type: "settings",
        });
      }

      if (shopName) settings.shopName = shopName;
      if (shopSubtitle) settings.shopSubtitle = shopSubtitle;
      if (themePrimaryColor) settings.themePrimaryColor = themePrimaryColor;
      if (themePrimaryColorDark) settings.themePrimaryColorDark = themePrimaryColorDark;
      if (themePrimaryColorLight) settings.themePrimaryColorLight = themePrimaryColorLight;
      if (themeCreamColor) settings.themeCreamColor = themeCreamColor;
      if (themeCreamColorDark) settings.themeCreamColorDark = themeCreamColorDark;

      if (removeLogo === "true" || removeLogo === true) {
        if (settings.logoImage) {
          const oldFilePath = `./public/uploads/customize/${settings.logoImage}`;
          fs.unlink(oldFilePath, (err) => {
            if (err) console.log("Failed to delete logo file:", err);
          });
          settings.logoImage = null;
        }
      } else if (req.file) {
        // Delete old logo file if it exists
        if (settings.logoImage) {
          const oldFilePath = `./public/uploads/customize/${settings.logoImage}`;
          fs.unlink(oldFilePath, (err) => {
            if (err) console.log("Failed to delete old logo file:", err);
          });
        }
        settings.logoImage = req.file.filename;
      }

      await settings.save();
      return res.json({ success: "Customization settings updated successfully", settings });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Failed to update customization settings" });
    }
  }
}

const customizeController = new Customize();
module.exports = customizeController;
