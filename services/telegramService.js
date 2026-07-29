const axios = require("axios");
const orderModel = require("../models/orders");

class TelegramService {
  async sendOrderNotification(order) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn("[TelegramService] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured in environment variables.");
      return;
    }

    try {
      // Fetch fully populated order details to ensure product names, prices, and user details are present
      const populatedOrder = await orderModel
        .findById(order._id || order)
        .populate("allProduct.id", "pName pPrice")
        .populate("user", "name email");

      if (!populatedOrder) {
        console.error(`[TelegramService] Order not found: ${order._id || order}`);
        return;
      }

      const orderNumber = populatedOrder.orderNumber || populatedOrder._id;
      const customerName = populatedOrder.user ? populatedOrder.user.name : "Guest";
      const phone = populatedOrder.phone || "N/A";
      const address = populatedOrder.address || "N/A";
      const totalAmount = populatedOrder.amount;
      const paymentStatus = populatedOrder.paymentStatus || "PENDING";
      const paymentGateway = populatedOrder.payment?.gateway || (populatedOrder.transactionId?.startsWith("FREE_") ? "Coupon/Free" : "Unknown");

      let itemsText = "";
      if (populatedOrder.allProduct && Array.isArray(populatedOrder.allProduct)) {
        populatedOrder.allProduct.forEach(item => {
          const name = item.id ? item.id.pName : "Unknown Formulation";
          const variant = item.variantName ? ` (${item.variantName})` : "";
          itemsText += `• ${name}${variant} x ${item.quantitiy} (₹${item.price} each)\n`;
        });
      } else {
        itemsText = "No items listed.\n";
      }

      let couponText = "";
      if (populatedOrder.coupon && populatedOrder.coupon.code) {
        couponText = `<b>Coupon:</b> ${populatedOrder.coupon.code} (Saved ₹${populatedOrder.coupon.discountAmount})\n`;
      }

      const message = 
`🔔 <b>New Order Received!</b>

<b>Order Number:</b> #${orderNumber}
<b>Customer:</b> ${customerName} (${populatedOrder.user && populatedOrder.user.email ? populatedOrder.user.email : ""})
<b>Contact:</b> ${phone}
<b>Delivery Address:</b> ${address}
<b>Total Amount:</b> ₹${totalAmount} (${paymentStatus} via ${paymentGateway})
${couponText}
<b>Items:</b>
${itemsText}`;

      // Call Telegram Bot API with inline keyboard markup for order state adjustments
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⚙️ Processing", callback_data: `status:${populatedOrder._id}:Processing` },
              { text: "🚚 Shipped", callback_data: `status:${populatedOrder._id}:Shipped` }
            ],
            [
              { text: "✅ Delivered", callback_data: `status:${populatedOrder._id}:Delivered` },
              { text: "✖ Cancel", callback_data: `status:${populatedOrder._id}:Cancelled` }
            ]
          ]
        }
      });

      console.log(`[TelegramService] Telegram notification sent for order #${orderNumber}`);
    } catch (err) {
      console.error("[TelegramService] Error sending telegram notification:", err.response ? JSON.stringify(err.response.data) : err.message);
    }
  }
}

module.exports = new TelegramService();
