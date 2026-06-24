const paymentService = require("./paymentService");
const paymentProcessor = require("./paymentProcessor");
const orderModel = require("../../models/orders");

class PaymentVerificationService {
  /**
   * Actively polls the gateway to verify a pending transaction and processes it.
   * @param {string} transactionId 
   */
  async verifyTransaction(transactionId) {
    const order = await orderModel.findOne({ "payment.transactionId": transactionId });
    if (!order) {
      throw new Error("Order not found for verification");
    }

    if (order.paymentStatus !== "PENDING") {
      return { 
        success: order.paymentStatus === "SUCCESS", 
        status: order.paymentStatus,
        orderId: order._id, 
        amount: order.amount, 
        message: `Order already processed. Status: ${order.paymentStatus}` 
      };
    }

    const gateway = order.payment.gateway;
    if (!gateway) {
      throw new Error("Gateway not specified on order");
    }

    const provider = paymentService.getProvider(gateway);
    try {
      const statusData = await provider.getPaymentStatus(transactionId);
      
      if (statusData.success) {
        await paymentProcessor.processSuccess(statusData);
        return { 
          success: true, 
          status: "SUCCESS",
          orderId: order._id, 
          amount: order.amount, 
          message: "Transaction verified and processed successfully" 
        };
      } else {
        await paymentProcessor.processFailure({
          gateway,
          transactionId,
          gatewayTransactionId: statusData.gatewayTransactionId,
          rawResponse: statusData.rawResponse,
          errorReason: "Failed during active verification"
        });
        return { 
          success: false, 
          status: "FAILED",
          orderId: order._id,
          amount: order.amount,
          message: "Transaction verified as failed" 
        };
      }
    } catch (err) {
      console.error("[PaymentVerificationService] Error verifying transaction:", err);
      return { success: false, message: `Gateway verification error: ${err.message}` };
    }
  }
}

module.exports = new PaymentVerificationService();
