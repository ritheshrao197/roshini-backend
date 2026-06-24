class PaymentProvider {
  /**
   * Initiates a payment.
   * @param {Object} order The order document
   * @returns {Promise<{ gateway: string, transactionId: string, redirectUrl?: string, action?: string, additionalFields?: Object }>}
   */
  async initiatePayment(order) {
    throw new Error("initiatePayment method not implemented");
  }

  /**
   * Verifies a callback payload from the payment gateway.
   * @param {Object} payload The raw payload received from the webhook
   * @returns {Promise<{ success: boolean, gateway: string, transactionId: string, gatewayTransactionId: string, amount: number, rawResponse: Object }>}
   */
  async verifyCallback(payload) {
    throw new Error("verifyCallback method not implemented");
  }

  /**
   * Fetches the current payment status directly from the gateway.
   * @param {string} transactionId The merchant transaction ID
   * @returns {Promise<{ success: boolean, gateway: string, transactionId: string, gatewayTransactionId: string, amount: number, rawResponse: Object }>}
   */
  async getPaymentStatus(transactionId) {
    throw new Error("getPaymentStatus method not implemented");
  }

  /**
   * Processes a refund for an order.
   * @param {Object} order The order document
   * @returns {Promise<{ success: boolean, transactionId: string, refundId: string, rawResponse: Object }>}
   */
  async refund(order) {
    throw new Error("refund method not implemented");
  }

  /**
   * Cancels a payment if supported by the gateway.
   * @param {Object} order The order document
   * @returns {Promise<{ success: boolean }>}
   */
  async cancelPayment(order) {
    throw new Error("cancelPayment method not implemented");
  }
}

module.exports = PaymentProvider;
