const cron = require("node-cron");
const orderModel = require("../models/orders");
const paymentVerificationService = require("../services/payment/paymentVerificationService");

// Runs every 6 hours
cron.schedule("0 */6 * * *", async () => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60000);
    
    // Find orders that are still PENDING after 10 minutes from creation
    // This catches missed webhooks or delayed confirmations before expiration cancels them
    const pendingOrders = await orderModel.find({
      paymentStatus: "PENDING",
      createdAt: { $lt: tenMinutesAgo }
    });

    for (const order of pendingOrders) {
      if (order.payment && order.payment.transactionId) {
        console.log(`[PaymentReconciliation] Verifying order ${order.orderNumber}...`);
        await paymentVerificationService.verifyTransaction(order.payment.transactionId);
      }
    }
  } catch (err) {
    console.error("[PaymentReconciliation] Error:", err);
  }
});
