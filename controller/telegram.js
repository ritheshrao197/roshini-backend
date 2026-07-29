const orderModel = require("../models/orders");
const axios = require("axios");

class TelegramController {
  async handleWebhook(req, res) {
    // Send 200 OK back immediately to avoid Telegram retrying
    res.sendStatus(200);

    const { callback_query } = req.body;
    if (!callback_query) return;

    const fromId = callback_query.from.id;
    const data = callback_query.data;
    const messageId = callback_query.message.message_id;
    const chatId = callback_query.message.chat.id;

    // Load Bot Token
    const botToken = process.env.TELEGRAM_BOT_TOKEN || "8947967700:AAEGtlEGP-4_Vy0W7TfijAIQKP0LtpJHrYw";
    if (!botToken) {
      console.warn("[TelegramController] TELEGRAM_BOT_TOKEN is not configured.");
      return;
    }

    // Load and validate allowed admins
    const allowedAdminIds = (process.env.ALLOWED_ADMIN_TG_IDS || "279214768")
      .split(",").map(id => parseInt(id.trim(), 10));

    if (allowedAdminIds.length > 0 && !allowedAdminIds.includes(fromId)) {
      try {
        await axios.post(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          callback_query_id: callback_query.id,
          text: "⚠️ Unauthorized: You do not have permissions to perform this action.",
          show_alert: true
        });
      } catch (err) {
        console.error("[TelegramController] Failed to send unauthorized alert:", err.message);
      }
      return;
    }

    // Parse button data: expected "status:orderId:newStatus"
    const parts = data.split(":");
    if (parts.length === 3 && parts[0] === "status") {
      const orderId = parts[1];
      const newStatus = parts[2]; // "Processing" | "Shipped" | "Delivered" | "Cancelled"

      try {
        // Find order and update its status
        const updatedOrder = await orderModel
          .findByIdAndUpdate(
            orderId,
            { status: newStatus.toUpperCase() },
            { new: true }
          )
          .populate("allProduct.id", "pName pPrice")
          .populate("user", "name email");

        if (!updatedOrder) {
          console.error(`[TelegramController] Order not found: ${orderId}`);
          return;
        }

        // Send alert toast to user inside Telegram
        await axios.post(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          callback_query_id: callback_query.id,
          text: `Order #${updatedOrder.orderNumber || updatedOrder._id} updated to ${newStatus}!`,
        });

        // Reconstruct the message body to append update status log
        const orderNumber = updatedOrder.orderNumber || updatedOrder._id;
        const customerName = updatedOrder.user ? updatedOrder.user.name : "Guest";
        const phone = updatedOrder.phone || "N/A";
        const address = updatedOrder.address || "N/A";
        const totalAmount = updatedOrder.amount;
        const paymentStatus = updatedOrder.paymentStatus || "PENDING";
        const paymentGateway = updatedOrder.payment?.gateway || (updatedOrder.transactionId?.startsWith("FREE_") ? "Coupon/Free" : "Unknown");

        let itemsText = "";
        if (updatedOrder.allProduct && Array.isArray(updatedOrder.allProduct)) {
          updatedOrder.allProduct.forEach(item => {
            const name = item.id ? item.id.pName : "Unknown Formulation";
            const variant = item.variantName ? ` (${item.variantName})` : "";
            itemsText += `• ${name}${variant} x ${item.quantitiy} (₹${item.price} each)\n`;
          });
        } else {
          itemsText = "No items listed.\n";
        }

        let couponText = "";
        if (updatedOrder.coupon && updatedOrder.coupon.code) {
          couponText = `<b>Coupon:</b> ${updatedOrder.coupon.code} (Saved ₹${updatedOrder.coupon.discountAmount})\n`;
        }

        const message = 
`🔔 <b>New Order Received!</b>

<b>Order Number:</b> #${orderNumber}
<b>Customer:</b> ${customerName} (${updatedOrder.user && updatedOrder.user.email ? updatedOrder.user.email : ""})
<b>Contact:</b> ${phone}
<b>Delivery Address:</b> ${address}
<b>Total Amount:</b> ₹${totalAmount} (${paymentStatus} via ${paymentGateway})
${couponText}
<b>Items:</b>
${itemsText}
🔄 <b>Status updated to:</b> <u>${newStatus.toUpperCase()}</u> (by Admin)`;

        // Edit original message text
        await axios.post(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          chat_id: chatId,
          message_id: messageId,
          text: message,
          parse_mode: "HTML",
          reply_markup: callback_query.message.reply_markup
        });

      } catch (err) {
        console.error("[TelegramController] Failed to process webhook action:", err.message);
      }
    }
  }
}

module.exports = new TelegramController();
