const orderModel = require("../models/orders");
const productModel = require("../models/products");
const userModel = require("../models/users");
const paymentService = require("../services/payment/paymentService");
const paymentProcessor = require("../services/payment/paymentProcessor");
const paymentVerificationService = require("../services/payment/paymentVerificationService");
const { ulid } = require("ulid");

class PaymentController {
  
  /**
   * Universal endpoint to initiate payment.
   * Expects req.body to have `gateway` ("PAYU" or "PHONEPE") along with cart/user info.
   */
  async initiatePayment(req, res) {
    const { user, allProduct, address, phone, couponCode, gateway } = req.body;

    if (!user || !allProduct || !address || !phone || !gateway) {
      return res.status(400).json({ error: "All fields including gateway are required" });
    }

    try {
      const userObj = await userModel.findById(user);
      if (!userObj) {
        return res.status(404).json({ error: "User not found" });
      }

      let subtotal = 0;
      const cartItems = [];
      const cartSnapshotProducts = [];
      for (const item of allProduct) {
        const product = await productModel.findById(item.id);
        if (!product) return res.status(404).json({ error: `Product not found` });
        
        let price = product.pPrice;
        let variantObj = null;
        if (item.variantId && product.pVariants && product.pVariants.length > 0) {
          variantObj = product.pVariants.find(v => v._id.toString() === item.variantId || v.weight === item.variantId);
        }

        if (variantObj) {
          if (variantObj.quantity < item.quantitiy) {
            return res.status(400).json({
              error: `Insufficient stock for product ${product.pName} (${variantObj.weight}). Available: ${variantObj.quantity}`,
            });
          }
          price = variantObj.price;
        } else {
          if (product.pQuantity < item.quantitiy) {
            return res.status(400).json({
              error: `Insufficient stock for product ${product.pName}. Available: ${product.pQuantity}`,
            });
          }
        }

        subtotal += price * item.quantitiy;
        cartItems.push({ product: { ...product.toObject(), pPrice: price }, quantity: item.quantitiy });
        cartSnapshotProducts.push({
          id: product._id,
          name: product.pName,
          variantId: item.variantId || null,
          variantName: item.variantName || null,
          price: price,
          quantity: item.quantitiy
        });
      }

      let baseShippingCharge = subtotal >= 499 ? 0 : 99; // Updated logic to 499
      let finalShippingCharge = baseShippingCharge;
      let couponDiscount = 0;
      let couponSnapshot = null;

      if (couponCode) {
        const couponValidationService = require("../services/coupon/couponValidationService");
        const couponCalculationService = require("../services/coupon/couponCalculationService");

        const validation = await couponValidationService.validate(couponCode, userObj, cartItems);
        if (!validation.valid) return res.status(400).json({ error: validation.error });

        const calc = couponCalculationService.calculate(validation.coupon, cartItems, baseShippingCharge);
        if (calc.error) return res.status(400).json({ error: calc.error });

        couponDiscount = calc.discountAmount;
        finalShippingCharge = calc.finalShippingCharge;

        couponSnapshot = {
          code: validation.coupon.code,
          type: validation.coupon.type,
          value: validation.coupon.value,
          discountAmount: couponDiscount
        };
      }

      const total = Math.max(0, subtotal - couponDiscount + finalShippingCharge);

      // Verify frontend amount if provided
      if (req.body.amount && Math.abs(req.body.amount - total) > 1) {
        console.warn(`Amount mismatch. Frontend: ${req.body.amount}, Backend: ${total}`);
      }

      const txnid = `RHP-${ulid()}`; // Using ULID
      const orderNumber = `RHP-${ulid()}`;

      // Create Pending Order
      const newOrder = new orderModel({
        orderNumber,
        allProduct,
        user: userObj._id,
        amount: total,
        transactionId: txnid, // Legacy support, new models use payment.transactionId
        address,
        phone,
        status: "PENDING",
        paymentStatus: "PENDING",
        payment: {
          gateway: gateway.toUpperCase(),
          transactionId: txnid,
        },
        paymentEvents: [{
          event: "INITIATED",
          gateway: gateway.toUpperCase(),
          transactionId: txnid
        }],
        expiresAt: new Date(Date.now() + 30 * 60000), // 30 minutes expiration
        coupon: couponSnapshot,
        pricing: {
          subtotal,
          couponDiscount,
          shippingDiscount: baseShippingCharge - finalShippingCharge,
          shippingCharge: finalShippingCharge,
          tax: 0,
          total
        },
        cartSnapshot: {
          products: cartSnapshotProducts,
          subtotal,
          shipping: finalShippingCharge,
          coupon: couponSnapshot,
          total
        }
      });
      await newOrder.save();

      const provider = paymentService.getProvider(gateway);
      const payload = await provider.initiatePayment(newOrder);

      return res.status(200).json({
        success: true,
        orderId: newOrder._id,
        orderNumber: newOrder.orderNumber,
        ...payload
      });

    } catch (err) {
      console.error("Initiate Payment Error:", err);
      return res.status(500).json({ error: "Failed to initiate payment" });
    }
  }

  /**
   * Generic webhook for PayU
   */
  async payuWebhook(req, res) {
    try {
      const provider = paymentService.getProvider("PAYU");
      const result = await provider.verifyCallback(req.body);

      if (result.success) {
        await paymentProcessor.processSuccess(result);
      } else {
        await paymentProcessor.processFailure({
          ...result,
          errorReason: "PayU returned failed status"
        });
      }

      // Redirect to frontend status page
      return res.redirect(`${process.env.CLIENT_URL}/payment-status?txnId=${result.transactionId}`);
    } catch (err) {
      console.error("PayU Webhook Error:", err);
      return res.status(500).send("Webhook Error");
    }
  }

  /**
   * Generic webhook for PhonePe
   */
  async phonepeWebhook(req, res) {
    try {
      const provider = paymentService.getProvider("PHONEPE");
      const result = await provider.verifyCallback(req.body);

      if (result.success) {
        await paymentProcessor.processSuccess(result);
      } else {
        await paymentProcessor.processFailure({
          ...result,
          errorReason: "PhonePe returned failed status"
        });
      }
      return res.status(200).send("OK"); // PhonePe expects 200 OK
    } catch (err) {
      console.error("PhonePe Webhook Error:", err);
      return res.status(500).send("Webhook Error");
    }
  }

  /**
   * API to verify a specific transaction manually (Polling fallback)
   */
  async verifyPayment(req, res) {
    const { transactionId } = req.params;
    if (!transactionId) {
      return res.status(400).json({ error: "transactionId required" });
    }

    try {
      const result = await paymentVerificationService.verifyTransaction(transactionId);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new PaymentController();
