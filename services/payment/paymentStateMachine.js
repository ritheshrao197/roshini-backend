class PaymentStateMachine {
  constructor() {
    this.transitions = {
      PENDING: ["SUCCESS", "FAILED"],
      SUCCESS: ["REFUNDED"],
      FAILED: [],
      REFUNDED: [],
    };
  }

  /**
   * Validates if a transition from currentStatus to nextStatus is allowed.
   * @param {string} currentStatus 
   * @param {string} nextStatus 
   * @returns {boolean}
   */
  isValidTransition(currentStatus, nextStatus) {
    if (currentStatus === nextStatus) return true; // Idempotent operations
    const allowed = this.transitions[currentStatus];
    if (!allowed) return false;
    return allowed.includes(nextStatus);
  }

  /**
   * Validates a transition and throws an error if invalid.
   * @param {string} currentStatus 
   * @param {string} nextStatus 
   */
  validateTransition(currentStatus, nextStatus) {
    if (!this.isValidTransition(currentStatus, nextStatus)) {
      throw new Error(`Invalid payment status transition from ${currentStatus} to ${nextStatus}`);
    }
  }
}

module.exports = new PaymentStateMachine();
