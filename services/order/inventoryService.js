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

      if (item.variantId && product.pVariants && product.pVariants.length > 0) {
        const variant = product.pVariants.find(v => v._id.toString() === item.variantId || v.weight === item.variantId);
        if (!variant) {
          throw new Error(`Variant with ID ${item.variantId} not found for product ${product.pName} during stock reduction.`);
        }
        if (variant.quantity < item.quantitiy) {
          throw new Error(`Insufficient stock for ${product.pName} (${variant.weight}). Available: ${variant.quantity}`);
        }
        variant.quantity -= item.quantitiy;
      } else {
        if (product.pQuantity < item.quantitiy) {
          throw new Error(`Insufficient stock for product ${product.pName}. Available: ${product.pQuantity}`);
        }
        product.pQuantity -= item.quantitiy;
      }

      product.pSold += item.quantitiy;

      await product.save({ session });
    }
  }

  // Future feature: async reserveStock()
  // Future feature: async releaseStockReservation()
}

module.exports = new InventoryService();
