const PaymentProvider = require("../interfaces/paymentProvider");
const crypto = require("crypto");
const axios = require("axios");

class PhonePeProvider extends PaymentProvider {
  constructor() {
    super();
    this.merchantId = process.env.PHONEPE_MERCHANT_ID;
    this.saltKey = process.env.PHONEPE_SALT_KEY;
    this.saltIndex = process.env.PHONEPE_SALT_INDEX || "1";
    this.isSandbox = process.env.PHONEPE_MODE !== "production";
    
    this.payUrl = this.isSandbox
      ? process.env.PHONEPE_SANDBOX_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay"
      : process.env.PHONEPE_PROD_URL || "https://api.phonepe.com/apis/hermes/pg/v1/pay";

    this.statusUrlBase = this.isSandbox
      ? process.env.PHONEPE_SANDBOX_STATUS_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status"
      : process.env.PHONEPE_PROD_STATUS_URL || "https://api.phonepe.com/apis/hermes/pg/v1/status";
  }

  _buildVerifyHeader(payloadStr, endpoint) {
    const str = payloadStr + endpoint + this.saltKey;
    const hash = crypto.createHash("sha256").update(str).digest("hex");
    return `${hash}###${this.saltIndex}`;
  }

  async initiatePayment(order) {
    const txnid = order.payment.transactionId;
    const amountInPaise = Math.round(order.amount * 100);

    const payload = {
      merchantId: this.merchantId,
      merchantTransactionId: txnid,
      merchantUserId: order.user ? order.user._id.toString() : "GUEST",
      amount: amountInPaise,
      redirectUrl: `${process.env.CLIENT_URL}/payment-status?txnId=${txnid}&gateway=phonepe`,
      redirectMode: "REDIRECT",
      callbackUrl: `${process.env.BACKEND_URL}/api/payment/phonepe-webhook`,
      mobileNumber: order.phone ? String(order.phone).replace(/\D/g, "").slice(-10) : undefined,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const xVerify = this._buildVerifyHeader(base64Payload, "/pg/v1/pay");

    try {
      const response = await axios.post(
        this.payUrl,
        { request: base64Payload },
        {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": xVerify,
            "X-MERCHANT-ID": this.merchantId,
          },
        }
      );

      const data = response.data;
      if (data && data.success && data.data && data.data.instrumentResponse && data.data.instrumentResponse.redirectInfo) {
        return {
          gateway: "PHONEPE",
          transactionId: txnid,
          action: data.data.instrumentResponse.redirectInfo.url,
          redirectUrl: data.data.instrumentResponse.redirectInfo.url
        };
      } else {
        throw new Error("Invalid response from PhonePe");
      }
    } catch (error) {
      throw new Error(`PhonePe initiatePayment Error: ${error.message}`);
    }
  }

  async verifyCallback(payload, headers = {}) {
    const base64Response = payload.response;
    if (!base64Response) throw new Error("No response payload found");

    // Validate X-VERIFY Header
    const xVerifyHeader = headers["x-verify"];
    if (!xVerifyHeader) {
      throw new Error("Missing X-VERIFY signature header in callback");
    }

    // Recalculate hash: SHA256(Base64_Response_Body + Salt_Key) + "###" + Salt_Index
    const calculatedHash = crypto.createHash("sha256")
      .update(base64Response + this.saltKey)
      .digest("hex");
    const expectedHeader = `${calculatedHash}###${this.saltIndex}`;

    if (xVerifyHeader !== expectedHeader) {
      throw new Error("PhonePe Webhook signature verification failed. Possible fraud attempt.");
    }

    const decoded = Buffer.from(base64Response, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);

    const isSuccess = parsed.code === "PAYMENT_SUCCESS";
    const amount = parsed.data && parsed.data.amount ? parsed.data.amount / 100 : 0;

    return {
      success: isSuccess,
      gateway: "PHONEPE",
      transactionId: parsed.data.merchantTransactionId,
      gatewayTransactionId: parsed.data.transactionId,
      amount: amount,
      rawResponse: parsed
    };
  }

  async getPaymentStatus(transactionId) {
    const endpoint = `/pg/v1/status/${this.merchantId}/${transactionId}`;
    const xVerify = this._buildVerifyHeader("", endpoint);
    const url = `${this.statusUrlBase}/${this.merchantId}/${transactionId}`;

    try {
      const response = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
          "X-MERCHANT-ID": this.merchantId,
        },
      });

      const parsed = response.data;
      const isSuccess = parsed.code === "PAYMENT_SUCCESS";
      const amount = parsed.data && parsed.data.amount ? parsed.data.amount / 100 : 0;

      return {
        success: isSuccess,
        gateway: "PHONEPE",
        transactionId: transactionId,
        gatewayTransactionId: parsed.data ? parsed.data.transactionId : null,
        amount: amount,
        rawResponse: parsed
      };
    } catch (error) {
      throw new Error(`PhonePe getPaymentStatus Error: ${error.message}`);
    }
  }

  async refund(order) {
    throw new Error("PhonePe Refund not implemented");
  }

  async cancelPayment(order) {
    throw new Error("PhonePe Cancel Payment not implemented");
  }
}

module.exports = PhonePeProvider;
