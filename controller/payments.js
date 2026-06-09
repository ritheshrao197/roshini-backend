const crypto = require("crypto");
const axios = require("axios");
const orderModel = require("../models/orders");
const paymentModel = require("../models/payment");

/* ── Helpers ────────────────────────────────────────────────────── */

const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const PHONEPE_SALT_KEY    = process.env.PHONEPE_SALT_KEY;
const PHONEPE_SALT_INDEX  = process.env.PHONEPE_SALT_INDEX || "1";
const IS_SANDBOX          = process.env.PHONEPE_MODE !== "production";

const PHONEPE_PAY_URL    = IS_SANDBOX
  ? process.env.PHONEPE_SANDBOX_URL    || "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay"
  : process.env.PHONEPE_PROD_URL       || "https://api.phonepe.com/apis/hermes/pg/v1/pay";

const PHONEPE_STATUS_BASE = IS_SANDBOX
  ? process.env.PHONEPE_SANDBOX_STATUS_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status"
  : process.env.PHONEPE_PROD_STATUS_URL    || "https://api.phonepe.com/apis/hermes/pg/v1/status";

const CLIENT_URL  = process.env.CLIENT_URL  || "http://localhost:3000";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

/** Build X-VERIFY header for a POST pay request */
function buildPayVerify(base64Payload) {
  const str  = base64Payload + "/pg/v1/pay" + PHONEPE_SALT_KEY;
  const hash = crypto.createHash("sha256").update(str).digest("hex");
  return `${hash}###${PHONEPE_SALT_INDEX}`;
}

/** Build X-VERIFY header for a GET status request */
function buildStatusVerify(merchantId, txnId) {
  const endpoint = `/pg/v1/status/${merchantId}/${txnId}`;
  const str      = endpoint + PHONEPE_SALT_KEY;
  const hash     = crypto.createHash("sha256").update(str).digest("hex");
  return `${hash}###${PHONEPE_SALT_INDEX}`;
}

/* ── Controller ─────────────────────────────────────────────────── */

class PaymentController {

  /* ─── 1. INITIATE PHONEPE ─────────────────────────────────────── */
  async initiatePhonePe(req, res) {
    const { amount, user, allProduct, address, phone } = req.body;

    if (!amount || !user || !allProduct || !address || !phone) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const merchantTransactionId = `TXN-PP-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const amountInPaise         = Math.round(amount * 100);

    try {
      // 1a. Build payload
      const payload = {
        merchantId:            PHONEPE_MERCHANT_ID,
        merchantTransactionId: merchantTransactionId,
        merchantUserId:        `USER-${user._id || user}`,
        amount:                amountInPaise,
        redirectUrl:           `${CLIENT_URL}/payment-status?txnId=${merchantTransactionId}`,
        redirectMode:          "GET",
        callbackUrl:           `${BACKEND_URL}/api/payment/phonepe-webhook`,
        mobileNumber:          String(phone).replace(/\D/g, "").slice(-10),
        paymentInstrument:     { type: "PAY_PAGE" },
      };

      const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
      const xVerify       = buildPayVerify(base64Payload);

      // 1b. Create pending order record
      const newOrder = new orderModel({
        allProduct,
        user:           user._id || user,
        amount,
        transactionId:  merchantTransactionId,
        address,
        phone,
        paymentGateway: "PhonePe",
        paymentStatus:  "Pending",
        status:         "Not processed",
      });
      const savedOrder = await newOrder.save();

      // 1c. Create payment audit record
      const paymentRecord = new paymentModel({
        transactionId: merchantTransactionId,
        orderId:       savedOrder._id,
        userId:        user._id || user,
        amount,
        amountInPaise,
        gateway:       "PhonePe",
        status:        "Pending",
        rawRequest:    payload,
      });
      await paymentRecord.save();

      // 1d. Call PhonePe API
      const phonePeRes = await axios.post(
        PHONEPE_PAY_URL,
        { request: base64Payload },
        {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY":     xVerify,
            "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
          },
          timeout: 15000,
        }
      );

      const phonePeData = phonePeRes.data;

      // 1e. Update audit log with raw response
      paymentRecord.rawResponse = phonePeData;
      await paymentRecord.save();

      // 1f. Extract redirect URL
      const redirectUrl = phonePeData?.data?.instrumentResponse?.redirectInfo?.url;
      if (!redirectUrl) {
        return res.status(502).json({
          error: "PhonePe did not return a redirect URL. Check merchant credentials.",
          phonePeResponse: phonePeData,
        });
      }

      return res.status(200).json({
        success:               true,
        redirectUrl,
        merchantTransactionId,
        orderId:               savedOrder._id,
      });

    } catch (err) {
      console.error("PhonePe Initiation Error:", err?.response?.data || err.message);

      // Cleanup pending records on fatal error
      await orderModel.deleteOne({ transactionId: merchantTransactionId }).catch(() => {});
      await paymentModel.deleteOne({ transactionId: merchantTransactionId }).catch(() => {});

      const phonePeError = err?.response?.data;
      return res.status(500).json({
        error:          "Failed to initiate PhonePe payment",
        details:        phonePeError || err.message,
      });
    }
  }

  /* ─── 2. VERIFY PAYMENT STATUS (server-side) ──────────────────── */
  async verifyPhonePeStatus(req, res) {
    const { txnId } = req.query;
    if (!txnId) {
      return res.status(400).json({ error: "txnId query param is required" });
    }

    try {
      // 2a. Find payment record
      const paymentRecord = await paymentModel.findOne({ transactionId: txnId });
      if (!paymentRecord) {
        return res.status(404).json({ error: "Payment record not found" });
      }

      // 2b. If already verified, return cached result
      if (paymentRecord.statusVerified && paymentRecord.status === "Success") {
        const order = await orderModel.findById(paymentRecord.orderId);
        return res.status(200).json({
          success: true,
          status:  "PAYMENT_SUCCESS",
          orderId: paymentRecord.orderId,
          amount:  paymentRecord.amount,
          alreadyVerified: true,
          order,
        });
      }

      // 2c. Build X-VERIFY for status check
      const xVerify = buildStatusVerify(PHONEPE_MERCHANT_ID, txnId);
      const statusUrl = `${PHONEPE_STATUS_BASE}/${PHONEPE_MERCHANT_ID}/${txnId}`;

      // 2d. Call PhonePe status API
      const statusRes = await axios.get(statusUrl, {
        headers: {
          "Content-Type":  "application/json",
          "X-VERIFY":      xVerify,
          "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
        },
        timeout: 15000,
      });

      const statusData = statusRes.data;

      const isSuccess  = statusData?.code === "PAYMENT_SUCCESS";
      const isFailed   = ["PAYMENT_ERROR", "PAYMENT_CANCELLED", "TIMED_OUT"].includes(statusData?.code);

      // 2e. Find associated order
      const order = await orderModel.findById(paymentRecord.orderId);
      if (!order) {
        return res.status(404).json({ error: "Associated order not found" });
      }

      // 2f. Idempotency guard — skip if already marked Paid
      if (order.paymentStatus === "Paid") {
        return res.status(200).json({
          success: true,
          status:  "PAYMENT_SUCCESS",
          orderId: order._id,
          amount:  order.amount,
          alreadyVerified: true,
        });
      }

      // 2g. Update order status
      if (isSuccess) {
        order.paymentStatus = "Paid";
        order.status        = "Processing";
        order.gatewayResponse = statusData;
      } else if (isFailed) {
        order.paymentStatus = "Failed";
      }
      await order.save();

      // 2h. Update payment audit record
      paymentRecord.status          = isSuccess ? "Success" : isFailed ? "Failed" : "Pending";
      paymentRecord.statusVerified  = true;
      paymentRecord.rawResponse     = statusData;
      paymentRecord.phonePeTransactionId = statusData?.data?.transactionId || null;
      if (!isSuccess && !isFailed) {
        paymentRecord.failureReason = statusData?.code || "Unknown";
      }
      await paymentRecord.save();

      return res.status(200).json({
        success: isSuccess,
        status:  statusData?.code,
        orderId: order._id,
        amount:  order.amount,
        message: statusData?.message,
      });

    } catch (err) {
      console.error("PhonePe Status Verify Error:", err?.response?.data || err.message);
      return res.status(500).json({
        error:   "Failed to verify payment status",
        details: err?.response?.data || err.message,
      });
    }
  }

  /* ─── 3. PHONEPE WEBHOOK (callback from PhonePe) ─────────────── */
  async phonePeWebhook(req, res) {
    try {
      const { response } = req.body;
      const xVerifyHeader = req.headers["x-verify"];

      if (!response) {
        return res.status(400).json({ error: "Missing response body" });
      }

      // 3a. Verify webhook signature
      if (xVerifyHeader) {
        const [receivedHash] = xVerifyHeader.split("###");
        const expectedHash   = crypto
          .createHash("sha256")
          .update(response + PHONEPE_SALT_KEY)
          .digest("hex");

        if (receivedHash !== expectedHash) {
          console.error("PhonePe Webhook: Invalid signature");
          return res.status(401).json({ error: "Invalid webhook signature" });
        }
      }

      // 3b. Decode Base64 payload
      const decoded = JSON.parse(Buffer.from(response, "base64").toString("utf-8"));

      const { merchantTransactionId, transactionId: phonePeTxnId } = decoded?.data || {};
      const isSuccess = decoded?.code === "PAYMENT_SUCCESS";

      if (!merchantTransactionId) {
        return res.status(400).json({ error: "Missing merchantTransactionId in webhook" });
      }

      // 3c. Find order
      const order = await orderModel.findOne({ transactionId: merchantTransactionId });
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // 3d. Idempotency guard
      if (order.paymentStatus === "Paid") {
        return res.status(200).json({ success: true, message: "Already processed" });
      }

      // 3e. Update order
      if (isSuccess) {
        order.paymentStatus   = "Paid";
        order.status          = "Processing";
        order.gatewayResponse = decoded;
      } else {
        order.paymentStatus   = "Failed";
        order.gatewayResponse = decoded;
      }
      await order.save();

      // 3f. Update payment audit record
      const paymentRecord = await paymentModel.findOne({ transactionId: merchantTransactionId });
      if (paymentRecord) {
        paymentRecord.status               = isSuccess ? "Success" : "Failed";
        paymentRecord.webhookVerified      = true;
        paymentRecord.webhookPayload       = decoded;
        paymentRecord.phonePeTransactionId = phonePeTxnId || null;
        await paymentRecord.save();
      }

      return res.status(200).json({ success: true });

    } catch (err) {
      console.error("PhonePe Webhook Error:", err.message);
      return res.status(500).json({ error: "Webhook processing failed" });
    }
  }

  /* ─── 4. PAYU INTEGRATION ─────────────────────────────────────── */
  async initiatePayU(req, res) {
    const { amount, user, allProduct, address, phone } = req.body;
    if (!amount || !user) {
      return res.status(400).json({ error: "All fields are required" });
    }

    try {
      const txnid       = `TXN-PU-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
      const key         = process.env.PAYU_MERCHANT_KEY || "";
      const salt        = process.env.PAYU_SALT || "";
      const productinfo = "Roshinis Home Products Purchase";
      const firstname   = user.name  || "Customer";
      const email       = user.email || "customer@example.com";

      // SHA512: key|txnid|amount|productinfo|firstname|email|udf1-5||||||salt
      const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
      const hash       = crypto.createHash("sha512").update(hashString).digest("hex");

      // Save pending order
      const newOrder = new orderModel({
        allProduct,
        user:           user._id || user,
        amount,
        transactionId:  txnid,
        address,
        phone,
        paymentGateway: "PayU",
        paymentStatus:  "Pending",
      });
      const savedOrder = await newOrder.save();

      // Save payment audit record
      await new paymentModel({
        transactionId: txnid,
        orderId:       savedOrder._id,
        userId:        user._id || user,
        amount,
        amountInPaise: Math.round(amount * 100),
        gateway:       "PayU",
        status:        "Pending",
      }).save();

      const isSandbox  = process.env.PHONEPE_MODE !== "production";
      const payuAction = isSandbox
        ? "https://sandboxsecure.payu.in/_payment"
        : "https://secure.payu.in/_payment";

      return res.status(200).json({
        success: true,
        key,
        txnid,
        amount: String(amount),
        productinfo,
        firstname,
        email,
        phone: String(phone).replace(/\D/g, "").slice(-10),
        surl:  `${CLIENT_URL}/payment-status?txnId=${txnid}&gateway=payu`,
        furl:  `${CLIENT_URL}/payment-failure?txnId=${txnid}`,
        hash,
        action: payuAction,
        orderId: savedOrder._id,
      });
    } catch (err) {
      console.error("PayU Initiation Error:", err.message);
      return res.status(500).json({ error: "Failed to initiate PayU payment" });
    }
  }
}

const paymentController = new PaymentController();
module.exports = paymentController;
