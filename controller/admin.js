const orderModel = require("../models/orders");
const productModel = require("../models/products");
const couponModel = require("../models/coupon");

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

  // 2. COUPON ENGINE: CREATE COUPON
  async createCoupon(req, res) {
    const { code, discountType, discountAmount, minOrderAmount, expiryDate } = req.body;
    if (!code || !discountType || !discountAmount || !expiryDate) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    try {
      const existing = await couponModel.findOne({ code: code.toUpperCase() });
      if (existing) {
        return res.status(400).json({ error: "Coupon code already exists" });
      }

      const newCoupon = new couponModel({
        code: code.toUpperCase(),
        discountType,
        discountAmount,
        minOrderAmount,
        expiryDate,
      });

      await newCoupon.save();
      return res.status(201).json({ success: "Coupon created successfully", coupon: newCoupon });
    } catch (err) {
      console.error("Coupon Creation Error:", err);
      return res.status(500).json({ error: "Failed to create coupon" });
    }
  }

  // 3. COUPON ENGINE: APPLY COUPON
  async applyCoupon(req, res) {
    const { code, orderAmount } = req.body;
    if (!code || !orderAmount) {
      return res.status(400).json({ error: "Code and order amount are required" });
    }

    try {
      const coupon = await couponModel.findOne({ code: code.toUpperCase(), isActive: true });
      if (!coupon) {
        return res.status(404).json({ error: "Invalid coupon code" });
      }

      if (new Date() > new Date(coupon.expiryDate)) {
        return res.status(400).json({ error: "Coupon code has expired" });
      }

      if (orderAmount < coupon.minOrderAmount) {
        return res.status(400).json({
          error: `Minimum order amount to apply this coupon is ₹${coupon.minOrderAmount}`,
        });
      }

      let discount = 0;
      if (coupon.discountType === "Percentage") {
        discount = (orderAmount * coupon.discountAmount) / 100;
      } else {
        discount = coupon.discountAmount;
      }

      const finalAmount = Math.max(0, orderAmount - discount);

      return res.status(200).json({
        success: true,
        discount,
        finalAmount,
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
      console.error("CSV Export Error:", err);
      return res.status(500).json({ error: "Failed to export orders to CSV" });
    }
  }
}

const adminController = new AdminController();
module.exports = adminController;
