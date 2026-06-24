const productModel = require("../../models/products");

class InventoryService {
  /**
   * Reduces the stock of products based on the order items.
   * Uses MongoDB sessions to ensure atomicity.
   * @param {Object} order The order document containing allProduct array
   * @param {Object} session The MongoDB session
   */
  async reduceStock(order, session) {
    if (!order || !order.allProduct || order.allProduct.length === 0) {
      return;
    }

    for (const item of order.allProduct) {
      const product = await productModel.findById(item.id).session(session);
      
      if (!product) {
        throw new Error(`Product with ID ${item.id} not found during stock reduction.`);
      }

      if (product.pQuantity < item.quantitiy) {
        throw new Error(`Insufficient stock for product ${product.pName}. Available: ${product.pQuantity}`);
      }

      product.pQuantity -= item.quantitiy;
      product.pSold += item.quantitiy;

      await product.save({ session });
    }
  }

  // Future feature: async reserveStock()
  // Future feature: async releaseStockReservation()
}

module.exports = new InventoryService();
