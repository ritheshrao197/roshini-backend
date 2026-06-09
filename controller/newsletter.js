const subscriberModel = require("../models/subscribers");
const couponModel = require("../models/coupon");
const EmailService = require("../services/emailService");
const { validateEmail } = require("../config/function");

class NewsletterController {
  async subscribe(req, res) {
    const { email, source } = req.body;
    
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    try {
      // Check if already subscribed
      let subscriber = await subscriberModel.findOne({ email: email.toLowerCase() });
      if (subscriber) {
        return res.status(400).json({ error: "You are already subscribed to our newsletter!" });
      }

      // Generate a unique 8-character alphanumeric coupon code
      const uniqueCode = `WELCOME-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Create a one-time-use coupon tied to this email
      const newCoupon = new couponModel({
        code: uniqueCode,
        discountType: "Percentage",
        discountAmount: 10,
        minOrderAmount: 499,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isActive: true,
        maxUses: 1,
        usesCount: 0,
        userEmail: email.toLowerCase(),
      });
      await newCoupon.save();

      // Create subscriber record
      subscriber = new subscriberModel({
        email: email.toLowerCase(),
        source: source || "Website Footer",
        welcomeCoupon: uniqueCode,
        status: "Subscribed",
      });
      await subscriber.save();

      // Dispatch welcome email with the coupon code
      EmailService.sendWelcomeEmail(email, uniqueCode).catch(err => {
        console.error("[NewsletterController] Error sending welcome email:", err);
      });

      return res.json({ 
        success: "Successfully subscribed! Please check your email for your welcome gift.",
        couponCode: uniqueCode 
      });

    } catch (err) {
      console.error("[NewsletterController] Subscription error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new NewsletterController();
