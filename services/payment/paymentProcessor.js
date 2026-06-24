const mongoose = require("mongoose");
const orderModel = require("../../models/orders");
const paymentTransactionModel = require("../../models/paymentTransaction");
const failedPaymentEventModel = require("../../models/failedPaymentEvent");
const inventoryService = require("../order/inventoryService");
const couponService = require("../order/couponService");
const paymentStateMachine = require("./paymentStateMachine");
const redisClient = require("../../config/redis"); // Assume this exports Upstash Redis or ioredis

class PaymentProcessor {
  /**
   * Acquire a distributed lock to prevent concurrent processing of the same transaction callback.
   */
  async _acquireLock(gateway, transactionId) {
    if (!redisClient) return true; // Bypass if no Redis configured
    const lockKey = `payment:lock:${gateway}:${transactionId}`;
    try {
      // SET key value NX EX 300 -> sets only if not exists, expires in 300s
      const acquired = await redisClient.set(lockKey, "LOCKED", { nx: true, ex: 300 });
      return acquired !== null && acquired !== false;
    } catch (err) {
      console.warn("Failed to acquire Redis lock, bypassing:", err.message);
      return true; // fail-open if redis is just down, but ideally we'd fail-closed
    }
  }

  async _releaseLock(gateway, transactionId) {
    if (!redisClient) return;
    const lockKey = `payment:lock:${gateway}:${transactionId}`;
    try {
      await redisClient.del(lockKey);
    } catch (err) {
      console.warn("Failed to release Redis lock:", err.message);
    }
  }

  async _logDeadLetter(transactionId, gateway, payload, error) {
    try {
      await failedPaymentEventModel.create({
        transactionId,
        gateway,
        payload,
        error: error.message || String(error),
      });
    } catch (err) {
      console.error("CRITICAL: Failed to write to dead letter queue:", err);
    }
  }

  /**
   * Unified success handler.
   * @param {Object} data { success: true, gateway, transactionId, gatewayTransactionId, amount, rawResponse }
   */
  async processSuccess(data) {
    const { gateway, transactionId, gatewayTransactionId, amount, rawResponse } = data;

    const lockAcquired = await this._acquireLock(gateway, transactionId);
    if (!lockAcquired) {
      console.log(`[PaymentProcessor] Callback already processing for ${gateway}:${transactionId}`);
      return;
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const order = await orderModel.findOne({ "payment.transactionId": transactionId }).session(session);
        if (!order) {
          throw new Error(`Order with transactionId ${transactionId} not found`);
        }

        // 1. Idempotency Check
        if (order.paymentStatus === "SUCCESS") {
          return; // Already processed
        }

        // 2. State Machine Validation
        paymentStateMachine.validateTransition(order.paymentStatus, "SUCCESS");

        // 3. Verify Amount
        if (Number(order.amount) !== Number(amount)) {
          throw new Error(`Amount mismatch. Expected ${order.amount}, got ${amount}`);
        }

        // 4. Update Order Status
        order.paymentStatus = "SUCCESS";
        order.status = "CONFIRMED";
        order.payment.gatewayTransactionId = gatewayTransactionId;
        order.payment.paidAt = new Date();
        order.payment.response = rawResponse;
        order.payment.hashVerified = true;
        
        order.paymentEvents.push({
          event: "SUCCESS",
          gateway,
          transactionId,
          metadata: { gatewayTransactionId, amount }
        });

        // 5. Fulfillment Services
        await inventoryService.reduceStock(order, session);
        await couponService.recordUsage(order, session);

        // 6. Save Order
        await order.save({ session });

        // 7. Transaction Audit Log
        await paymentTransactionModel.create([{
          transactionId,
          gatewayTransactionId,
          gateway,
          status: "SUCCESS",
          response: rawResponse,
        }], { session });

      });
    } catch (err) {
      console.error("[PaymentProcessor] processSuccess error:", err);
      await this._logDeadLetter(transactionId, gateway, data, err);
      throw err;
    } finally {
      session.endSession();
      await this._releaseLock(gateway, transactionId);
    }
  }

  /**
   * Unified failure handler.
   */
  async processFailure(data) {
    const { gateway, transactionId, gatewayTransactionId, rawResponse, errorReason } = data;

    const lockAcquired = await this._acquireLock(gateway, transactionId);
    if (!lockAcquired) return;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const order = await orderModel.findOne({ "payment.transactionId": transactionId }).session(session);
        if (!order) {
          throw new Error(`Order with transactionId ${transactionId} not found`);
        }

        if (order.paymentStatus === "SUCCESS") return; // Cannot fail if already success

        paymentStateMachine.validateTransition(order.paymentStatus, "FAILED");

        order.paymentStatus = "FAILED";
        order.status = "CANCELLED";
        order.payment.response = rawResponse;
        
        order.paymentEvents.push({
          event: "FAILED",
          gateway,
          transactionId,
          metadata: { errorReason, gatewayTransactionId }
        });

        await order.save({ session });

        await paymentTransactionModel.create([{
          transactionId,
          gatewayTransactionId,
          gateway,
          status: "FAILED",
          response: rawResponse,
        }], { session });
      });
    } catch (err) {
      console.error("[PaymentProcessor] processFailure error:", err);
      await this._logDeadLetter(transactionId, gateway, data, err);
      throw err;
    } finally {
      session.endSession();
      await this._releaseLock(gateway, transactionId);
    }
  }
}

module.exports = new PaymentProcessor();
