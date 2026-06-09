const subscriberModel = require("../models/subscribers");
const couponModel = require("../models/coupon");
const EmailService = require("../services/emailService");

class Subscribers {
  async postSubscribe(req, res) {
    const { email, source } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      // 1. Check if email already subscribed
      let existingSubscriber = await subscriberModel.findOne({ email: email.toLowerCase() });
      if (existingSubscriber) {
        return res.status(400).json({ error: "Email is already subscribed" });
      }

      // 2. Generate Unique Coupon Code (e.g. WELCOME-RHP-4K8X9)
      const randomString = Math.random().toString(36).substring(2, 7).toUpperCase();
      const code = `WELCOME-RHP-${randomString}`;
      
      // Calculate expiry date (30 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      const newCoupon = new couponModel({
        code,
        discountType: "Percentage",
        discountAmount: 10,
        minOrderAmount: 499,
        expiryDate,
        isActive: true,
        // The coupon schema doesn't have usageLimit natively, but we enforce it
        // during checkout or assume it's one-time by marking isActive = false when used.
      });
      await newCoupon.save();

      // 3. Create Subscriber Record
      const newSubscriber = new subscriberModel({
        email,
        source: source || "Unknown",
        welcomeCoupon: code,
      });
      await newSubscriber.save();

      // 4. Send Welcome Email
      try {
        await EmailService.sendWelcomeEmail(email, code);
      } catch (emailErr) {
        console.error("Failed to send welcome email:", emailErr);
        // Continue anyway since subscription succeeded
      }

      return res.json({ success: "Successfully subscribed", coupon: code });
    } catch (err) {
      console.error("postSubscribe error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // Admin endpoint to list subscribers
  async getAllSubscribers(req, res) {
    try {
      const subscribers = await subscriberModel.find({}).sort({ createdAt: -1 });
      return res.json({ subscribers });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

const subscribersController = new Subscribers();
module.exports = subscribersController;
