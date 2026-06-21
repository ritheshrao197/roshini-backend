const { Resend } = require("resend");
const emailLogModel = require("../models/emailLogs");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || "updates@roshinishomeproducts.com";

class EmailService {
  /**
   * Internal helper to send the email and catch errors
   */
  static async sendEmail({ to, subject, html, text }) {
    if (!resend) {
      console.warn("[EmailService] RESEND_API_KEY is not set. Skipping email to:", to);
      return;
    }
    
    try {
      const data = await resend.emails.send({
        from: `Roshinis Home Products <${fromEmail}>`,
        to,
        subject,
        html,
        text,
      });
      console.log(`[EmailService] Email sent to ${to} with ID ${data.id}`);

      // Log success to database
      await new emailLogModel({
        to,
        subject,
        status: "Sent",
      }).save();

      return data;
    } catch (error) {
      console.error(`[EmailService] Failed to send email to ${to}:`, error);
      // Log failure to database
      await new emailLogModel({
        to,
        subject,
        status: "Failed",
        errorDetails: error.message || String(error),
      }).save();
      // We don't throw here to prevent crashing the main application flow
    }
  }

  // ── Welcome Email ──
  static async sendWelcomeEmailDirect(toEmail, code) {
    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #E8D5BC; border-radius: 12px; background-color: #FAFAFA;">
        <h2 style="color: #6B3E26; text-align: center;">Welcome to Roshini's Home Products!</h2>
        <p style="color: #4A4A4A; font-size: 16px; line-height: 1.5;">We are thrilled to have you join our community. Explore our selection of high-quality, authentic products curated just for you.</p>
        
        <div style="background-color: #FDF6EC; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; border: 1px dashed #D6A848;">
          <h3 style="color: #A66E2B; margin-top: 0;">Your Exclusive Welcome Gift</h3>
          <p style="color: #6B3E26; font-size: 14px;">Enjoy 10% OFF your first purchase (Min order ₹499).</p>
          <div style="background-color: #FFFFFF; padding: 15px; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 20px; letter-spacing: 2px; color: #4CAF50; border: 1px solid #E0E0E0;">
            ${code}
          </div>
          <p style="color: #999; font-size: 12px; margin-bottom: 0;">Valid for 30 days. Single use only.</p>
        </div>

        <p style="color: #4A4A4A; font-size: 16px;">Thanks,</p>
        <p style="color: #6B3E26; font-size: 16px;"><strong>The Roshini's Team</strong></p>
      </div>
    `;
    return this.sendEmail({
      to: toEmail,
      subject: "Welcome to Roshini's! Here is your 10% OFF gift 🎁",
      html,
    });
  }

  static async sendWelcomeEmail(toEmail, code) {
    const { emailQueue, queueAvailable } = require("../config/queue");
    if (queueAvailable && emailQueue) {
      await emailQueue.add("sendEmail", {
        type: "welcome",
        data: { toEmail, nameOrCode: code }
      });
    } else {
      await this.sendWelcomeEmailDirect(toEmail, code);
    }
  }

  // ── Order Confirmation ──
  static async sendOrderConfirmationDirect(toEmail, orderId, amount) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Order Confirmation</h2>
        <p>Thank you for your order!</p>
        <p>Your order ID is <strong>${orderId}</strong> for a total amount of <strong>₹${amount}</strong>.</p>
        <p>We will notify you once your order has shipped.</p>
        <p>Thanks,</p>
        <p><strong>The Roshini's Team</strong></p>
      </div>
    `;
    return this.sendEmail({
      to: toEmail,
      subject: `Order Confirmation - ${orderId}`,
      html,
    });
  }

  static async sendOrderConfirmation(toEmail, orderId, amount) {
    const { emailQueue, queueAvailable } = require("../config/queue");
    if (queueAvailable && emailQueue) {
      await emailQueue.add("sendEmail", {
        type: "orderConfirmation",
        data: { toEmail, orderId, amount }
      });
    } else {
      await this.sendOrderConfirmationDirect(toEmail, orderId, amount);
    }
  }

  // ── Payment Success ──
  static async sendPaymentSuccessDirect(toEmail, transactionId, amount) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Payment Successful</h2>
        <p>We have successfully received your payment of <strong>₹${amount}</strong>.</p>
        <p>Transaction ID: <strong>${transactionId}</strong></p>
        <p>Thank you for shopping with us!</p>
      </div>
    `;
    return this.sendEmail({
      to: toEmail,
      subject: "Payment Successful",
      html,
    });
  }

  static async sendPaymentSuccess(toEmail, transactionId, amount) {
    const { emailQueue, queueAvailable } = require("../config/queue");
    if (queueAvailable && emailQueue) {
      await emailQueue.add("sendEmail", {
        type: "paymentSuccess",
        data: { toEmail, transactionId, amount }
      });
    } else {
      await this.sendPaymentSuccessDirect(toEmail, transactionId, amount);
    }
  }

  // ── Payment Failed ──
  static async sendPaymentFailedDirect(toEmail, transactionId) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Payment Failed</h2>
        <p>Unfortunately, your recent payment attempt has failed.</p>
        <p>Transaction ID: <strong>${transactionId || "N/A"}</strong></p>
        <p>Please try again or contact support if you need assistance.</p>
      </div>
    `;
    return this.sendEmail({
      to: toEmail,
      subject: "Payment Failed",
      html,
    });
  }

  static async sendPaymentFailed(toEmail, transactionId) {
    const { emailQueue, queueAvailable } = require("../config/queue");
    if (queueAvailable && emailQueue) {
      await emailQueue.add("sendEmail", {
        type: "paymentFailed",
        data: { toEmail, transactionId }
      });
    } else {
      await this.sendPaymentFailedDirect(toEmail, transactionId);
    }
  }

  // ── Order Shipped ──
  static async sendOrderShippedDirect(toEmail, orderId) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Your Order Has Shipped!</h2>
        <p>Great news! Your order <strong>${orderId}</strong> has been shipped and is on its way to you.</p>
        <p>Thanks,</p>
        <p><strong>The Roshini's Team</strong></p>
      </div>
    `;
    return this.sendEmail({
      to: toEmail,
      subject: "Your Order is on the Way!",
      html,
    });
  }

  static async sendOrderShipped(toEmail, orderId) {
    const { emailQueue, queueAvailable } = require("../config/queue");
    if (queueAvailable && emailQueue) {
      await emailQueue.add("sendEmail", {
        type: "orderShipped",
        data: { toEmail, orderId }
      });
    } else {
      await this.sendOrderShippedDirect(toEmail, orderId);
    }
  }

  // ── Password Reset ──
  static async sendPasswordResetDirect(toEmail, resetLink) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <a href="${resetLink}" style="display:inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none;">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `;
    return this.sendEmail({
      to: toEmail,
      subject: "Password Reset Request",
      html,
    });
  }

  static async sendPasswordReset(toEmail, resetLink) {
    const { emailQueue, queueAvailable } = require("../config/queue");
    if (queueAvailable && emailQueue) {
      await emailQueue.add("sendEmail", {
        type: "passwordReset",
        data: { toEmail, resetLink }
      });
    } else {
      await this.sendPasswordResetDirect(toEmail, resetLink);
    }
  }

  // ── Admin Alerts ──
  static async sendAdminNewOrderAlertDirect(adminEmail, orderId, amount) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>New Order Received</h2>
        <p>A new order (<strong>${orderId}</strong>) has been placed for <strong>₹${amount}</strong>.</p>
        <p>Please check the admin dashboard for details.</p>
      </div>
    `;
    return this.sendEmail({
      to: adminEmail,
      subject: `New Order Alert - ${orderId}`,
      html,
    });
  }

  static async sendAdminNewOrderAlert(adminEmail, orderId, amount) {
    const { emailQueue, queueAvailable } = require("../config/queue");
    if (queueAvailable && emailQueue) {
      await emailQueue.add("sendEmail", {
        type: "adminNewOrder",
        data: { toEmail: adminEmail, orderId, amount }
      });
    } else {
      await this.sendAdminNewOrderAlertDirect(adminEmail, orderId, amount);
    }
  }
}

module.exports = EmailService;
