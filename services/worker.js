const { Worker } = require("bullmq");
const logger = require("../config/logger");
const EmailService = require("./emailService");
const AuditLog = require("../models/auditLog");

const { connection, queueAvailable } = require("../config/queue");

if (queueAvailable && connection) {
  // ── Email Worker ──
  const emailWorker = new Worker(
    "emailQueue",
    async (job) => {
      const { type, data } = job.data;
      logger.info(`[Worker] Processing email job: ${type} for ${data.toEmail || data.to}`);
      
      switch (type) {
        case "welcome":
          await EmailService.sendWelcomeEmailDirect(data.toEmail, data.nameOrCode);
          break;
        case "orderConfirmation":
          await EmailService.sendOrderConfirmationDirect(data.toEmail, data.orderId, data.amount);
          break;
        case "paymentSuccess":
          await EmailService.sendPaymentSuccessDirect(data.toEmail, data.transactionId, data.amount);
          break;
        case "paymentFailed":
          await EmailService.sendPaymentFailedDirect(data.toEmail, data.transactionId);
          break;
        case "orderShipped":
          await EmailService.sendOrderShippedDirect(data.toEmail, data.orderId);
          break;
        case "passwordReset":
          await EmailService.sendPasswordResetDirect(data.toEmail, data.resetLink);
          break;
        case "adminNewOrder":
          await EmailService.sendAdminNewOrderAlertDirect(data.toEmail, data.orderId, data.amount);
          break;
        default:
          logger.warn(`[Worker] Unknown email job type: ${type}`);
      }
    },
    { connection }
  );

  emailWorker.on("completed", (job) => {
    logger.info(`[Worker] Email job ${job.id} completed.`);
  });

  emailWorker.on("failed", (job, err) => {
    logger.error({ err }, `[Worker] Email job ${job?.id} failed.`);
  });

  // ── Audit Log Worker ──
  const auditWorker = new Worker(
    "auditQueue",
    async (job) => {
      const { adminId, action, entityType, entityId, oldValue, newValue, ipAddress } = job.data;
      logger.info(`[Worker] Processing audit log job: ${action} on ${entityType}`);
      
      try {
        await AuditLog.create({
          adminId,
          action,
          entityType,
          entityId,
          oldValue,
          newValue,
          ipAddress,
        });
      } catch (err) {
        logger.error({ err }, "[Worker] Failed to write audit log in background job.");
      }
    },
    { connection }
  );

  auditWorker.on("completed", (job) => {
    logger.info(`[Worker] Audit job ${job.id} completed.`);
  });

  auditWorker.on("failed", (job, err) => {
    logger.error({ err }, `[Worker] Audit job ${job?.id} failed.`);
  });
}
