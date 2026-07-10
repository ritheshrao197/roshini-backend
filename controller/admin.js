const orderModel = require("../models/orders");
const productModel = require("../models/products");
const couponModel = require("../models/coupon");
const emailLogModel = require("../models/emailLogs");
const { cloudinary } = require("../config/cloudinary");

class AdminController {
  // 1. DASHBOARD ANALYTICS & REVENUE OVERVIEW
  async getDashboardAnalytics(req, res) {
    try {
      // Calculate Total Revenue and Order Counts
      const stats = await orderModel.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
            totalOrders: { $sum: 1 },
          },
        },
      ]);

      const revenueData = stats.length > 0 ? stats[0] : { totalRevenue: 0, totalOrders: 0 };

      // Low Stock Alerts (products with quantity less than 10)
      const lowStockProducts = await productModel.find({ pQuantity: { $lt: 10 } });

      return res.status(200).json({
        success: true,
        revenue: revenueData.totalRevenue,
        ordersCount: revenueData.totalOrders,
        lowStockAlerts: lowStockProducts.length,
        lowStockProducts,
      });
    } catch (err) {
      console.error("Dashboard Analytics Error:", err);
      return res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  }

  // 2. COUPON ENGINE: GET ALL COUPONS
  async getAllCoupons(req, res) {
    try {
      const coupons = await couponModel.find({}).sort({ createdAt: -1 });
      return res.status(200).json({ success: true, coupons });
    } catch (err) {
      console.error("Fetch Coupons Error:", err);
      return res.status(500).json({ error: "Failed to fetch coupons" });
    }
  }

  // 3. COUPON ENGINE: CREATE COUPON
  async createCoupon(req, res) {
    const data = req.body;
    try {
      const existing = await couponModel.findOne({ code: data.code.toUpperCase() });
      if (existing) {
        return res.status(400).json({ error: "Coupon code already exists" });
      }

      const newCoupon = new couponModel(data);
      await newCoupon.save();
      return res.status(201).json({ success: "Coupon created successfully", coupon: newCoupon });
    } catch (err) {
      console.error("Coupon Creation Error:", err);
      return res.status(500).json({ error: "Failed to create coupon" });
    }
  }

  // 4. COUPON ENGINE: UPDATE COUPON
  async updateCoupon(req, res) {
    const { id } = req.params;
    const data = req.body;
    try {
      const updated = await couponModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) return res.status(404).json({ error: "Coupon not found" });

      const redisClient = require("../config/redis");
      if (redisClient) {
         await redisClient.del(`coupon:code:${updated.code}`).catch(console.warn);
      }

      return res.status(200).json({ success: "Coupon updated successfully", coupon: updated });
    } catch (err) {
      console.error("Coupon Update Error:", err);
      return res.status(500).json({ error: "Failed to update coupon" });
    }
  }

  // 5. COUPON ENGINE: DELETE COUPON
  async deleteCoupon(req, res) {
    const { id } = req.params;
    try {
      const deleted = await couponModel.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ error: "Coupon not found" });

      const redisClient = require("../config/redis");
      if (redisClient) {
         await redisClient.del(`coupon:code:${deleted.code}`).catch(console.warn);
      }

      return res.status(200).json({ success: "Coupon deleted successfully" });
    } catch (err) {
      console.error("Coupon Deletion Error:", err);
      return res.status(500).json({ error: "Failed to delete coupon" });
    }
  }

  // 6. COUPON ENGINE: APPLY COUPON (Validation Endpoint for Cart)
  async applyCoupon(req, res) {
    const { code, cartItems } = req.body;
    const user = req.userDetails || req.user; // Resolve user object from either details (loginCheck) or user (authorize)

    if (!code || !cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({ error: "Code and cartItems array are required" });
    }

    try {
      const couponValidationService = require("../services/coupon/couponValidationService");
      const couponCalculationService = require("../services/coupon/couponCalculationService");

      const validation = await couponValidationService.validate(code, user, cartItems);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Calculate initial subtotal to determine base shipping
      let subtotal = 0;
      for (const item of cartItems) {
         // This assumes the frontend passes product price, but in a real secure flow, 
         // we should re-fetch the products from the DB. 
         // Since this is just for the cart UI preview, trusting the frontend's cartItems structure is OK for now,
         // because the actual postCreateOrder endpoint re-fetches and re-verifies anyway.
         if (item.product && item.product.pPrice) {
            subtotal += item.product.pPrice * item.quantity;
         }
      }

      const baseShippingCharge = subtotal >= 1000 ? 0 : 99;
      
      const calc = couponCalculationService.calculate(validation.coupon, cartItems, baseShippingCharge);
      if (calc.error) {
        return res.status(400).json({ error: calc.error });
      }

      return res.status(200).json({
        success: true,
        discount: calc.discountAmount,
        finalShippingCharge: calc.finalShippingCharge,
        eligibleSubtotal: calc.eligibleSubtotal,
        message: "Coupon applied successfully",
      });
    } catch (err) {
      console.error("Apply Coupon Error:", err);
      return res.status(500).json({ error: "Failed to apply coupon" });
    }
  }

  // 4. CSV TRANSACTION & ORDER EXPORT
  async exportOrdersCSV(req, res) {
    try {
      const orders = await orderModel
        .find({})
        .populate("user", "name email")
        .sort({ _id: -1 });

      let csvContent = "Order ID,Customer Name,Customer Email,Amount (₹),Transaction ID,Status,Payment Status,Payment Gateway,Date\n";

      for (const order of orders) {
        const orderId = order._id.toString();
        const customerName = order.user ? order.user.name.replace(/,/g, " ") : "Unknown";
        const customerEmail = order.user ? order.user.email : "N/A";
        const amount = order.amount;
        const txnId = order.transactionId || "N/A";
        const status = order.status;
        const paymentStatus = order.paymentStatus || "Pending";
        const paymentGateway = order.paymentGateway || "Braintree";
        const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A";

        csvContent += `${orderId},${customerName},${customerEmail},${amount},${txnId},${status},${paymentStatus},${paymentGateway},${date}\n`;
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=roshinis_orders_report.csv");
      return res.status(200).send(csvContent);
    } catch (err) {
      return res.status(500).json({ error: "Failed to export orders to CSV" });
    }
  }

  // 5. EMAIL LOGS
  async getEmailLogs(req, res) {
    try {
      const logs = await emailLogModel.find({}).sort({ createdAt: -1 }).limit(100);
      return res.status(200).json({ success: true, logs });
    } catch (err) {
      console.error("Fetch Email Logs Error:", err);
      return res.status(500).json({ error: "Failed to fetch email logs" });
    }
  }

  // 6. MEDIA MANAGEMENT (Cloudinary)
  async getCloudinaryMedia(req, res) {
    try {
      const result = await cloudinary.api.resources({ max_results: 100 });
      return res.status(200).json({ success: true, resources: result.resources });
    } catch (err) {
      console.error("Fetch Media Error:", err);
      return res.status(500).json({ error: "Failed to fetch media assets" });
    }
  }

  async deleteCloudinaryMedia(req, res) {
    const { public_id } = req.body;
    if (!public_id) return res.status(400).json({ error: "public_id is required" });
    try {
      await cloudinary.uploader.destroy(public_id);
      return res.status(200).json({ success: "Media deleted successfully" });
    } catch (err) {
      console.error("Delete Media Error:", err);
      return res.status(500).json({ error: "Failed to delete media asset" });
    }
  }
}

const adminController = new AdminController();
module.exports = adminController;
