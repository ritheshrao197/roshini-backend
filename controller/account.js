const userModel = require("../models/users");
const bcrypt = require("bcryptjs");
const { uploadImage, deleteImage, replaceImage } = require("../services/cloudinaryUpload");
const fs = require("fs");

const safeUnlink = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error("[AccountController] Failed to delete local temp file:", e);
    }
  }
};

class AccountController {
  
  // ── Profile Methods ──

  async getProfile(req, res) {
    try {
      const user = await userModel.findById(req.userDetails._id).select("-password -history").lean();
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json({ user });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateProfile(req, res) {
    const { name, phoneNumber, preferences, notifications } = req.body;
    try {
      const updateData = {};
      if (name) updateData.name = name;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
      if (preferences) updateData.preferences = preferences;
      if (notifications) updateData.notifications = notifications;

      const user = await userModel.findByIdAndUpdate(
        req.userDetails._id,
        { $set: updateData },
        { new: true }
      ).select("-password -history").lean();

      return res.json({ success: "Profile updated successfully", user });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async uploadProfileImage(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: "No image uploaded" });

      const user = await userModel.findById(req.userDetails._id);
      if (!user) {
        safeUnlink(req.file.path);
        return res.status(404).json({ error: "User not found" });
      }

      let uploaded = null;
      try {
        const oldPublicId = user.userImage ? user.userImage.publicId : null;
        uploaded = await replaceImage(oldPublicId, req.file, "users");
        safeUnlink(req.file.path);
        
        user.userImage = {
          publicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          alt: `${user.name} Profile Image`
        };
        await user.save();

        return res.json({ success: "Profile image updated", profileImageUrl: user.profileImageUrl });
      } catch (uploadErr) {
        console.error("[AccountController] Upload error:", uploadErr);
        if (uploaded) {
          try { await deleteImage(uploaded.publicId); } catch(e) {}
        }
        safeUnlink(req.file.path);
        return res.status(500).json({ error: "Failed to upload image: " + uploadErr.message });
      }
    } catch (err) {
      console.error(err);
      if (req.file) safeUnlink(req.file.path);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // ── Address Methods ──

  async getAddresses(req, res) {
    try {
      const user = await userModel.findById(req.userDetails._id).select("addresses").lean();
      return res.json({ addresses: user.addresses || [] });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async addAddress(req, res) {
    const address = req.body;
    try {
      const user = await userModel.findById(req.userDetails._id);
      
      // If this is the first address or marked default, un-default others
      if (user.addresses.length === 0) {
        address.isDefault = true;
      } else if (address.isDefault) {
        user.addresses.forEach(a => a.isDefault = false);
      }

      user.addresses.push(address);
      await user.save();
      return res.json({ success: "Address added", addresses: user.addresses });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateAddress(req, res) {
    const { id } = req.params;
    const addressData = req.body;
    try {
      const user = await userModel.findById(req.userDetails._id);
      const address = user.addresses.id(id);
      if (!address) return res.status(404).json({ error: "Address not found" });

      if (addressData.isDefault && !address.isDefault) {
        user.addresses.forEach(a => a.isDefault = false);
      }

      address.set(addressData);
      await user.save();
      return res.json({ success: "Address updated", addresses: user.addresses });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async deleteAddress(req, res) {
    const { id } = req.params;
    try {
      const user = await userModel.findById(req.userDetails._id);
      user.addresses.pull({ _id: id });
      
      // If we deleted the default address, set the first one as default
      if (user.addresses.length > 0 && !user.addresses.some(a => a.isDefault)) {
        user.addresses[0].isDefault = true;
      }
      
      await user.save();
      return res.json({ success: "Address deleted", addresses: user.addresses });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async setDefaultAddress(req, res) {
    const { id } = req.params;
    try {
      const user = await userModel.findById(req.userDetails._id);
      const address = user.addresses.id(id);
      if (!address) return res.status(404).json({ error: "Address not found" });

      user.addresses.forEach(a => a.isDefault = false);
      address.isDefault = true;
      
      await user.save();
      return res.json({ success: "Default address updated", addresses: user.addresses });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // ── Security Methods ──

  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    try {
      const user = await userModel.findById(req.userDetails._id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ error: "Incorrect current password" });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      return res.json({ success: "Password changed successfully" });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new AccountController();
