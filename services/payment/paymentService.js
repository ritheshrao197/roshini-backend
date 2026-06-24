const PayUProvider = require("./providers/payuProvider");
const PhonePeProvider = require("./providers/phonepeProvider");

class PaymentService {
  /**
   * Factory method to get the correct payment provider based on the gateway string.
   * @param {string} gateway "PAYU" | "PHONEPE"
   * @returns {import('./interfaces/paymentProvider')}
   */
  getProvider(gateway) {
    if (!gateway) throw new Error("Gateway is required");

    switch (gateway.toUpperCase()) {
      case "PAYU":
        return new PayUProvider();
      case "PHONEPE":
        return new PhonePeProvider();
      default:
        throw new Error(`Unsupported Gateway: ${gateway}`);
    }
  }
}

module.exports = new PaymentService();
