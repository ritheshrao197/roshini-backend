const productModel = require("../models/products");
const fs = require("fs");
const path = require("path");
const { uploadImage, deleteImage } = require("../services/cloudinaryUpload");

const safeUnlink = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error("[ProductController] Failed to delete local temp file:", e);
    }
  }
};

class Product {
  // Delete Image from Cloudinary
  static async deleteImages(publicIds) {
    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return;
    }
    for (let i = 0; i < publicIds.length; i++) {
      let publicId = publicIds[i];
      if (!publicId) continue;
      try {
        await deleteImage(publicId);
      } catch (err) {
        console.error("[ProductController] Cloudinary delete error:", err);
      }
    }
  }

  async getAllProduct(req, res) {
    try {
      let Products = await productModel
        .find({ isDeleted: { $ne: true } })
        .populate("pCategory", "_id cName")
        .sort({ _id: -1 });
      if (Products) {
        return res.json({ Products });
      }
    } catch (err) {
      console.error("[ProductController] getAllProduct error:", err);
    }
  }

  async postAddProduct(req, res) {
    let {
      pName,
      pDescription,
      pPrice,
      pQuantity,
      pCategory,
      pOffer,
      pStatus,
      slug,
      shortDescription,
      productType,
      brandName,
      comparePrice,
      sku,
      lowStockThreshold,
      productWeight,
      ingredients,
      usageInstructions,
      storageInstructions,
      suitableFor,
      bestseller,
      trustBadges,
      canonicalUrl,
      ogImage,
      relatedProducts,
      crossSellProducts,
      comboEligibility,
      shippingWeight,
      packageDimensions,
      allowCoupons,
      limitedTimeOffer,
      offerExpiryDate,
      seoTitle,
      seoDescription,
      tags,
      nutritionalInfo,
      benefits,
      featured,
    } = req.body;
    let images = req.files;

    const safeJsonParse = (val, defaultVal = []) => {
      if (!val) return defaultVal;
      if (typeof val === "object") return val;
      try {
        return JSON.parse(val);
      } catch (e) {
        return defaultVal;
      }
    };

    // Check if images exists and has at least 1 file
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.json({ error: "Must need to provide at least 1 product image" });
    }

    // Validation
    if (
      !pName ||
      !pDescription ||
      !pPrice ||
      !pQuantity ||
      !pCategory ||
      !pStatus
    ) {
      if (images) images.forEach((img) => safeUnlink(img.path));
      return res.json({ error: "All required basic fields must be provided" });
    }
    // Validate Name and description
    else if (pName.length > 255 || pDescription.length > 3000) {
      if (images) images.forEach((img) => safeUnlink(img.path));
      return res.json({
        error: "Name 255 & Description must not be 3000 characters long",
      });
    } else {
      let uploadedImages = [];
      try {
        // Enforce gallery limit (max 10 images)
        if (images.length > 10) {
          images.forEach((img) => safeUnlink(img.path));
          return res.status(400).json({ error: "Maximum 10 images allowed per product" });
        }

        let imagesMetadata = safeJsonParse(req.body.imagesMetadata, []);

        // Upload all images to Cloudinary
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const uploaded = await uploadImage(img, "products");
          const meta = imagesMetadata.find(m => m.fileIndex === i) || {};
          uploadedImages.push({
            publicId: uploaded.publicId,
            secureUrl: uploaded.secureUrl,
            alt: meta.alt || pName,
            isPrimary: meta.isPrimary || (uploadedImages.length === 0),
          });
          safeUnlink(img.path);
        }

        // Auto-generate slug if not provided
        let finalSlug = slug || pName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
        let slugExist = await productModel.findOne({ slug: finalSlug });
        if (slugExist) {
          finalSlug = `${finalSlug}-${Date.now()}`;
        }

        // Unique SKU check if provided
        if (sku) {
          let skuExist = await productModel.findOne({ sku });
          if (skuExist) {
            if (uploadedImages.length > 0) {
              await Product.deleteImages(uploadedImages.map(img => img.publicId));
            }
            return res.json({ error: "SKU already exists" });
          }
        }

        let primaryImg = uploadedImages.find(img => img.isPrimary);
        if (!primaryImg && uploadedImages.length > 0) {
          uploadedImages[0].isPrimary = true;
          primaryImg = uploadedImages[0];
        }

        let newProduct = new productModel({
          image: primaryImg ? {
            publicId: primaryImg.publicId,
            secureUrl: primaryImg.secureUrl,
            alt: primaryImg.alt
          } : null,
          images: uploadedImages,
          pName,
          pDescription,
          pPrice: Number(pPrice),
          pQuantity: Number(pQuantity),
          pCategory,
          pOffer: pOffer || "0",
          pStatus,
          slug: finalSlug,
          shortDescription,
          productType,
          brandName: brandName || "Roshini’s Home Products",
          comparePrice: comparePrice ? Number(comparePrice) : undefined,
          sku,
          lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : 10,
          productWeight,
          ingredients: safeJsonParse(ingredients, []),
          usageInstructions,
          storageInstructions,
          suitableFor: safeJsonParse(suitableFor, []),
          bestseller: bestseller === "true" || bestseller === true,
          trustBadges: safeJsonParse(trustBadges, []),
          canonicalUrl,
          ogImage,
          relatedProducts: safeJsonParse(relatedProducts, []),
          crossSellProducts: safeJsonParse(crossSellProducts, []),
          comboEligibility: comboEligibility === "true" || comboEligibility === true,
          shippingWeight: shippingWeight ? Number(shippingWeight) : undefined,
          packageDimensions: safeJsonParse(packageDimensions, {}),
          allowCoupons: allowCoupons !== "false" && allowCoupons !== false,
          limitedTimeOffer: limitedTimeOffer === "true" || limitedTimeOffer === true,
          offerExpiryDate: offerExpiryDate ? new Date(offerExpiryDate) : undefined,
          seoTitle,
          seoDescription,
          tags: safeJsonParse(tags, []),
          nutritionalInfo: safeJsonParse(nutritionalInfo, {}),
          benefits: safeJsonParse(benefits, []),
          featured: featured === "true" || featured === true,
          auditLog: [
            {
              action: "CREATE",
              details: `Product initially created with stock: ${pQuantity}, price: ₹${pPrice}`,
              performedBy: "Admin",
            },
          ],
        });

        let save = await newProduct.save();
        if (save) {
          return res.json({ success: "Product created successfully" });
        }
      } catch (err) {
        console.error("[ProductController] postAddProduct error:", err);
        // Clean up any successfully uploaded Cloudinary files on error
        if (uploadedImages.length > 0) {
          await Product.deleteImages(uploadedImages.map(img => img.publicId));
        }
        // Clean up local temp files that haven't been deleted
        if (images) {
          images.forEach((img) => safeUnlink(img.path));
        }
        return res.json({ error: "Error occurred while saving product: " + err.message });
      }
    }
  }

  async postEditProduct(req, res) {
    let {
      pId,
      pName,
      pDescription,
      pPrice,
      pQuantity,
      pCategory,
      pOffer,
      pStatus,
      pImages,
      slug,
      shortDescription,
      productType,
      brandName,
      comparePrice,
      sku,
      lowStockThreshold,
      productWeight,
      ingredients,
      usageInstructions,
      storageInstructions,
      suitableFor,
      bestseller,
      trustBadges,
      canonicalUrl,
      ogImage,
      relatedProducts,
      crossSellProducts,
      comboEligibility,
      shippingWeight,
      packageDimensions,
      allowCoupons,
      limitedTimeOffer,
      offerExpiryDate,
      seoTitle,
      seoDescription,
      tags,
      nutritionalInfo,
      benefits,
      featured,
    } = req.body;
    let editImages = req.files;

    const safeJsonParse = (val, defaultVal = []) => {
      if (!val) return defaultVal;
      if (typeof val === "object") return val;
      try {
        return JSON.parse(val);
      } catch (e) {
        return defaultVal;
      }
    };

    if (!pId) {
      return res.json({ error: "Product ID is required" });
    }

    try {
      const existingProduct = await productModel.findById(pId);
      if (!existingProduct) {
        return res.json({ error: "Product not found" });
      }

      // Check unique SKU
      if (sku && sku !== existingProduct.sku) {
        let skuExist = await productModel.findOne({ sku });
        if (skuExist) {
          return res.json({ error: "SKU already exists on another product" });
        }
      }

      // Check unique Slug
      let finalSlug = slug;
      if (slug && slug !== existingProduct.slug) {
        let slugExist = await productModel.findOne({ slug });
        if (slugExist) {
          finalSlug = `${slug}-${Date.now()}`;
        }
      }

      let auditEntries = [];
      if (Number(pPrice) !== existingProduct.pPrice) {
        auditEntries.push({
          action: "PRICE_CHANGE",
          details: `Price modified from ₹${existingProduct.pPrice} to ₹${pPrice}`,
          performedBy: "Admin",
        });
      }
      if (Number(pQuantity) !== existingProduct.pQuantity) {
        auditEntries.push({
          action: "STOCK_CHANGE",
          details: `Stock modified from ${existingProduct.pQuantity} to ${pQuantity}`,
          performedBy: "Admin",
        });
      }
      if (pStatus !== existingProduct.pStatus) {
        auditEntries.push({
          action: "STATUS_CHANGE",
          details: `Status modified from ${existingProduct.pStatus} to ${pStatus}`,
          performedBy: "Admin",
        });
      }

      let editData = {
        pName,
        pDescription,
        pPrice: Number(pPrice),
        pQuantity: Number(pQuantity),
        pCategory,
        pOffer: pOffer || "0",
        pStatus,
        slug: finalSlug || existingProduct.slug,
        shortDescription,
        productType,
        brandName: brandName || "Roshini’s Home Products",
        comparePrice: comparePrice ? Number(comparePrice) : undefined,
        sku,
        lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : 10,
        productWeight,
        ingredients: safeJsonParse(ingredients, []),
        usageInstructions,
        storageInstructions,
        suitableFor: safeJsonParse(suitableFor, []),
        bestseller: bestseller === "true" || bestseller === true,
        trustBadges: safeJsonParse(trustBadges, []),
        canonicalUrl,
        ogImage,
        relatedProducts: safeJsonParse(relatedProducts, []),
        crossSellProducts: safeJsonParse(crossSellProducts, []),
        comboEligibility: comboEligibility === "true" || comboEligibility === true,
        shippingWeight: shippingWeight ? Number(shippingWeight) : undefined,
        packageDimensions: safeJsonParse(packageDimensions, {}),
        allowCoupons: allowCoupons !== "false" && allowCoupons !== false,
        limitedTimeOffer: limitedTimeOffer === "true" || limitedTimeOffer === true,
        offerExpiryDate: offerExpiryDate ? new Date(offerExpiryDate) : undefined,
        seoTitle,
        seoDescription,
        tags: safeJsonParse(tags, []),
        nutritionalInfo: safeJsonParse(nutritionalInfo, {}),
        benefits: safeJsonParse(benefits, []),
        featured: featured === "true" || featured === true,
      };

      let imagesMetadata = safeJsonParse(req.body.imagesMetadata, null);

      if (imagesMetadata !== null) {
        // Enforce gallery limit (max 10 images)
        if (imagesMetadata.length > 10) {
          if (editImages) editImages.forEach((img) => safeUnlink(img.path));
          return res.status(400).json({ error: "Maximum 10 images allowed per product" });
        }

        let uploadedImages = [];
        try {
          if (editImages && editImages.length > 0) {
            for (const img of editImages) {
              const uploaded = await uploadImage(img, "products");
              uploadedImages.push({
                publicId: uploaded.publicId,
                secureUrl: uploaded.secureUrl,
              });
              safeUnlink(img.path);
            }
          }
        } catch (uploadErr) {
          console.error("[ProductController] Error uploading edit images:", uploadErr);
          if (uploadedImages.length > 0) {
            await Product.deleteImages(uploadedImages.map(img => img.publicId));
          }
          if (editImages) {
            editImages.forEach((img) => safeUnlink(img.path));
          }
          return res.status(500).json({ error: "Failed to upload product images: " + uploadErr.message });
        }

        // Reconstruct the new images array
        let finalImages = [];
        for (const meta of imagesMetadata) {
          if (meta.publicId) {
            // Existing image. Make sure it belonged to the product
            const existing = existingProduct.images.find(img => img.publicId === meta.publicId);
            if (existing) {
              finalImages.push({
                publicId: existing.publicId,
                secureUrl: existing.secureUrl,
                alt: meta.alt !== undefined ? meta.alt : existing.alt,
                isPrimary: !!meta.isPrimary,
              });
            }
          } else if (meta.fileIndex !== undefined && uploadedImages[meta.fileIndex]) {
            // Newly uploaded image
            const uploaded = uploadedImages[meta.fileIndex];
            finalImages.push({
              publicId: uploaded.publicId,
              secureUrl: uploaded.secureUrl,
              alt: meta.alt || pName || existingProduct.pName,
              isPrimary: !!meta.isPrimary,
            });
          }
        }

        // Determine which old images were deleted to clean up Cloudinary
        const newPublicIds = new Set(finalImages.map(img => img.publicId));
        const deletedPublicIds = [];
        if (existingProduct.images) {
          for (const img of existingProduct.images) {
            if (img.publicId && !newPublicIds.has(img.publicId)) {
              deletedPublicIds.push(img.publicId);
            }
          }
        }

        if (deletedPublicIds.length > 0) {
          await Product.deleteImages(deletedPublicIds);
        }

        // Set primary image
        let primaryImg = finalImages.find(img => img.isPrimary);
        if (!primaryImg && finalImages.length > 0) {
          finalImages[0].isPrimary = true;
          primaryImg = finalImages[0];
        }

        editData.images = finalImages;
        editData.image = primaryImg ? {
          publicId: primaryImg.publicId,
          secureUrl: primaryImg.secureUrl,
          alt: primaryImg.alt
        } : null;
      } else if (editImages && editImages.length > 0) {
        // Fallback for older API clients that don't pass imagesMetadata
        if (editImages.length > 10) {
          editImages.forEach((img) => safeUnlink(img.path));
          return res.status(400).json({ error: "Maximum 10 images allowed per product" });
        }

        let uploadedImages = [];
        try {
          for (const img of editImages) {
            const uploaded = await uploadImage(img, "products");
            uploadedImages.push({
              publicId: uploaded.publicId,
              secureUrl: uploaded.secureUrl,
              alt: pName || existingProduct.pName,
              isPrimary: uploadedImages.length === 0,
            });
            safeUnlink(img.path);
          }
          editData.image = uploadedImages.length > 0 ? {
            publicId: uploadedImages[0].publicId,
            secureUrl: uploadedImages[0].secureUrl,
            alt: pName || existingProduct.pName
          } : null;
          editData.images = uploadedImages;

          // Delete old images from Cloudinary to prevent orphans
          if (existingProduct.images && existingProduct.images.length > 0) {
            const oldIds = existingProduct.images.map(img => img.publicId).filter(Boolean);
            if (oldIds.length > 0) {
              await Product.deleteImages(oldIds);
            }
          }
        } catch (uploadErr) {
          console.error("[ProductController] Error uploading edit images:", uploadErr);
          if (uploadedImages.length > 0) {
            await Product.deleteImages(uploadedImages.map(img => img.publicId));
          }
          if (editImages) {
            editImages.forEach((img) => safeUnlink(img.path));
          }
          return res.status(500).json({ error: "Failed to upload product images: " + uploadErr.message });
        }
      }

      let updatePayload = {
        $set: editData,
      };
      if (auditEntries.length > 0) {
        updatePayload.$push = { auditLog: { $each: auditEntries } };
      }

      let updatedProduct = await productModel.findByIdAndUpdate(
        pId,
        updatePayload,
        { new: true }
      );

      if (updatedProduct) {
        return res.json({ success: "Product edited successfully" });
      }
      return res.json({ error: "Product not found during update" });
    } catch (err) {
      console.error("[ProductController] postEditProduct error:", err);
      if (editImages) {
        editImages.forEach((img) => safeUnlink(img.path));
      }
      return res.json({ error: "Error updating product details: " + err.message });
    }
  }

  async getDeleteProduct(req, res) {
    let { pId } = req.body;
    if (!pId) {
      return res.json({ error: "Product ID is required" });
    } else {
      try {
        let deleteProduct = await productModel.findByIdAndUpdate(pId, {
          isDeleted: true,
          $push: {
            auditLog: {
              action: "DELETE",
              details: "Product soft deleted.",
              performedBy: "Admin",
            },
          },
        });
        if (deleteProduct) {
          return res.json({ success: "Product deleted successfully" });
        }
      } catch (err) {
        console.error("[ProductController] getDeleteProduct error:", err);
      }
    }
  }

  async postRestoreProduct(req, res) {
    let { pId } = req.body;
    if (!pId) {
      return res.json({ error: "Product ID is required" });
    } else {
      try {
        let restoreProduct = await productModel.findByIdAndUpdate(pId, {
          isDeleted: false,
          $push: {
            auditLog: {
              action: "RESTORE",
              details: "Product restored from soft delete.",
              performedBy: "Admin",
            },
          },
        });
        if (restoreProduct) {
          return res.json({ success: "Product restored successfully" });
        }
      } catch (err) {
        console.error("[ProductController] postRestoreProduct error:", err);
      }
    }
  }

  async getSingleProduct(req, res) {
    let { pId } = req.body;
    if (!pId) {
      return res.json({ error: "All filled must be required" });
    } else {
      try {
        let singleProduct = await productModel
          .findById(pId)
          .populate("pCategory", "cName")
          .populate("pRatingsReviews.user", "name email userImage");
        if (singleProduct) {
          return res.json({ Product: singleProduct });
        }
      } catch (err) {
        console.error("[ProductController] getSingleProduct error:", err);
      }
    }
  }

  async getProductByCategory(req, res) {
    let { catId } = req.body;
    if (!catId) {
      return res.json({ error: "All filled must be required" });
    } else {
      try {
        let products = await productModel
          .find({ pCategory: catId })
          .populate("pCategory", "cName");
        if (products) {
          return res.json({ Products: products });
        }
      } catch (err) {
        return res.json({ error: "Search product wrong" });
      }
    }
  }

  async getProductByPrice(req, res) {
    let { price } = req.body;
    if (!price) {
      return res.json({ error: "All filled must be required" });
    } else {
      try {
        let products = await productModel
          .find({ pPrice: { $lt: price } })
          .populate("pCategory", "cName")
          .sort({ pPrice: -1 });
        if (products) {
          return res.json({ Products: products });
        }
      } catch (err) {
        return res.json({ error: "Filter product wrong" });
      }
    }
  }

  async getWishProduct(req, res) {
    let { productArray } = req.body;
    if (!productArray) {
      return res.json({ error: "All filled must be required" });
    } else {
      try {
        let wishProducts = await productModel.find({
          _id: { $in: productArray },
        });
        if (wishProducts) {
          return res.json({ Products: wishProducts });
        }
      } catch (err) {
        return res.json({ error: "Filter product wrong" });
      }
    }
  }

  async getCartProduct(req, res) {
    let { productArray } = req.body;
    if (!productArray) {
      return res.json({ error: "All filled must be required" });
    } else {
      try {
        let cartProducts = await productModel.find({
          _id: { $in: productArray },
        });
        if (cartProducts) {
          return res.json({ Products: cartProducts });
        }
      } catch (err) {
        return res.json({ error: "Cart product wrong" });
      }
    }
  }

  async postAddReview(req, res) {
    let { pId, uId, rating, review } = req.body;
    if (!pId || !rating || !review || !uId) {
      return res.json({ error: "All filled must be required" });
    } else {
      let checkReviewRatingExists = await productModel.findOne({ _id: pId });
      if (checkReviewRatingExists.pRatingsReviews.length > 0) {
        checkReviewRatingExists.pRatingsReviews.map((item) => {
          if (item.user === uId) {
            return res.json({ error: "Your already reviewd the product" });
          } else {
            try {
              let newRatingReview = productModel.findByIdAndUpdate(pId, {
                $push: {
                  pRatingsReviews: {
                    review: review,
                    user: uId,
                    rating: rating,
                  },
                },
              });
              newRatingReview.exec((err, result) => {
                if (err) {
                  console.error("[ProductController] postAddReview error:", err);
                }
                return res.json({ success: "Thanks for your review" });
              });
            } catch (err) {
              return res.json({ error: "Cart product wrong" });
            }
          }
        });
      } else {
        try {
          let newRatingReview = productModel.findByIdAndUpdate(pId, {
            $push: {
              pRatingsReviews: { review: review, user: uId, rating: rating },
            },
          });
          newRatingReview.exec((err, result) => {
            if (err) {
              console.error("[ProductController] postAddReview error:", err);
            }
            return res.json({ success: "Thanks for your review" });
          });
        } catch (err) {
          return res.json({ error: "Cart product wrong" });
        }
      }
    }
  }

  async deleteReview(req, res) {
    let { rId, pId } = req.body;
    if (!rId) {
      return res.json({ message: "All filled must be required" });
    } else {
      try {
        let reviewDelete = productModel.findByIdAndUpdate(pId, {
          $pull: { pRatingsReviews: { _id: rId } },
        });
        reviewDelete.exec((err, result) => {
          if (err) {
            console.error("[ProductController] deleteReview execute error:", err);
          }
          return res.json({ success: "Your review is deleted" });
        });
      } catch (err) {
        console.error("[ProductController] deleteReview catch error:", err);
      }
    }
  }
}

const productController = new Product();
module.exports = productController;
