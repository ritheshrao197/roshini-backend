const PaymentProvider = require("../interfaces/paymentProvider");
const crypto = require("crypto");
const axios = require("axios");

class PayUProvider extends PaymentProvider {
  constructor() {
    super();
    this.key = process.env.PAYU_KEY || "";
    this.salt = process.env.PAYU_SALT || "";
    this.baseUrl = process.env.PAYU_BASE_URL || "https://test.payu.in";
    this.action = `${this.baseUrl}/_payment`;
  }

  async initiatePayment(order) {
    if (!this.key) {
      throw new Error("PayU Merchant Key (PAYU_KEY) is not configured in the server environment variables.");
    }
    if (!this.salt) {
      throw new Error("PayU Salt (PAYU_SALT) is not configured in the server environment variables.");
    }
    if (!process.env.BACKEND_URL) {
      throw new Error("BACKEND_URL is not configured in the server environment variables.");
    }

    const txnid = order.payment.transactionId;
    const amount = order.amount;
    const productinfo = "Roshinis Home Products Purchase";
    const firstname = order.user && order.user.name ? order.user.name : "Customer";
    const email = order.user && order.user.email ? order.user.email : "customer@example.com";
    const phone = order.phone ? String(order.phone).replace(/\D/g, "").slice(-10) : "0000000000";

    const surl = `${process.env.BACKEND_URL}/api/payment/payu-webhook`;
    const furl = `${process.env.BACKEND_URL}/api/payment/payu-webhook`;

    // SHA512: key|txnid|amount|productinfo|firstname|email|udf1-5||||||salt
    const hashString = `${this.key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${this.salt}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    return {
      gateway: "PAYU",
      transactionId: txnid,
      action: this.action,
      key: this.key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      hash,
      additionalFields: {
        key: this.key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone,
        surl,
        furl,
        hash
      }
    };
  }

  async verifyCallback(payload) {
    const { txnid, mihpayid, amount, status, hash } = payload;
    
    // Verify hash
    // Reverse Hash formula: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    const email = payload.email || "";
    const firstname = payload.firstname || "";
    const productinfo = payload.productinfo || "";
    
    const reverseHashString = `${this.salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${this.key}`;
    const generatedHash = crypto.createHash("sha512").update(reverseHashString).digest("hex");

    if (hash !== generatedHash) {
      throw new Error("PayU Hash verification failed.");
    }

    const isSuccess = status === "success";

    return {
      success: isSuccess,
      gateway: "PAYU",
      transactionId: txnid,
      gatewayTransactionId: mihpayid,
      amount: Number(amount),
      rawResponse: payload
    };
  }

  async getPaymentStatus(transactionId) {
    // Implement PayU Verify API Call (Command: verify_payment)
    // Formula: key|command|var1|salt
    const command = "verify_payment";
    const hashString = `${this.key}|${command}|${transactionId}|${this.salt}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    const params = new URLSearchParams();
    params.append('key', this.key);
    params.append('command', command);
    params.append('var1', transactionId);
    params.append('hash', hash);

    try {
      const response = await axios.post(`${this.baseUrl}/merchant/postservice?form=2`, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const data = response.data;
      if (data.status === 1 && data.transaction_details && data.transaction_details[transactionId]) {
        const details = data.transaction_details[transactionId];
        const isSuccess = details.status === "success";
        return {
          success: isSuccess,
          gateway: "PAYU",
          transactionId,
          gatewayTransactionId: details.mihpayid,
          amount: Number(details.amt),
          rawResponse: details
        };
      }
      throw new Error(data.msg || "Status verification failed");
    } catch (err) {
      throw new Error(`PayU getPaymentStatus Error: ${err.message}`);
    }
  }

  async refund(order) {
    throw new Error("PayU Refund not implemented");
  }

  async cancelPayment(order) {
    throw new Error("PayU Cancel Payment not implemented");
  }
}

module.exports = PayUProvider;
