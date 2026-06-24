const cron = require("node-cron");
const orderModel = require("../models/orders");

// Runs every 15 minutes
cron.schedule("*/15 * * * *", async () => {
  try {
    const now = new Date();
    
    // Find orders that are PENDING, paymentStatus PENDING, and past their expiresAt
    const expiredOrders = await orderModel.find({
      status: "PENDING",
      paymentStatus: "PENDING",
      expiresAt: { $lt: now }
    });

    for (const order of expiredOrders) {
      order.status = "CANCELLED";
      order.paymentStatus = "FAILED";
      
      order.paymentEvents.push({
        event: "FAILED",
        gateway: order.payment.gateway,
        transactionId: order.payment.transactionId,
        metadata: { errorReason: "Order expired due to timeout" }
      });

      await order.save();
      console.log(`[OrderExpirationCron] Cancelled expired order ${order.orderNumber}`);
    }
  } catch (err) {
    console.error("[OrderExpirationCron] Error:", err);
  }
});
