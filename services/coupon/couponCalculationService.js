class CouponCalculationService {
  /**
   * Calculates the exact discount and final order pricing.
   * @param {Object} coupon - The validated coupon object
   * @param {Array} cartItems - Array of objects: { product: Object, quantity: Number }
   * @param {Number} shippingCharge - The standard shipping charge before coupon
   * @returns {Object} { discountAmount, eligibleSubtotal, finalShippingCharge, error }
   */
  calculate(coupon, cartItems, shippingCharge = 0) {
    let eligibleSubtotal = 0;
    let totalSubtotal = 0;

    // Determine eligible subtotal based on restrictions
    for (const item of cartItems) {
      const { product, quantity } = item;
      const itemTotal = product.pPrice * quantity;
      totalSubtotal += itemTotal;

      let isEligible = true;

      // Restrict by specific products
      if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
        const isProductAllowed = coupon.applicableProducts.some(
          (pId) => pId.toString() === product._id.toString()
        );
        if (!isProductAllowed) isEligible = false;
      }

      // Restrict by specific categories
      if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
        // product.pCategory might be an ObjectId or populated object. 
        // Assuming we check the category ID or name. For safety, check both if available.
        const categoryId = product.pCategory?._id?.toString() || product.pCategory?.toString();
        const categoryName = product.pCategory?.cName || product.pCategory;
        
        const isCategoryAllowed = coupon.applicableCategories.some(
          (cat) => cat === categoryId || cat === categoryName
        );
        if (!isCategoryAllowed) isEligible = false;
      }

      if (isEligible) {
        eligibleSubtotal += itemTotal;
      }
    }

    if (eligibleSubtotal === 0) {
      return { error: "No items in your cart are eligible for this coupon" };
    }

    if (coupon.minOrderAmount && eligibleSubtotal < coupon.minOrderAmount) {
      return { error: `Eligible items must total at least ₹${coupon.minOrderAmount} to use this coupon` };
    }

    let discountAmount = 0;
    let finalShippingCharge = shippingCharge;

    switch (coupon.type) {
      case "percentage":
        discountAmount = (eligibleSubtotal * coupon.value) / 100;
        break;

      case "fixed":
        discountAmount = coupon.value;
        break;

      case "shipping":
        // Override shipping charge to 0
        finalShippingCharge = 0;
        // The discount amount is technically the shipping charge we waived
        discountAmount = shippingCharge;
        break;

      case "tiered":
        // For tiered, calculate total eligible quantity
        let eligibleQuantity = 0;
        for (const item of cartItems) {
           // We could check isEligible here again, but for simplicity assuming all eligibleSubtotal items count
           // Actually, let's just count quantity of eligible items
           let isEligible = true;
           if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
             isEligible = coupon.applicableProducts.some(pId => pId.toString() === item.product._id.toString());
           }
           if (isEligible) eligibleQuantity += item.quantity;
        }

        if (coupon.rules && coupon.rules.length > 0) {
          // Sort rules by minQuantity descending to find the highest applicable tier
          const sortedRules = [...coupon.rules].sort((a, b) => b.minQuantity - a.minQuantity);
          const applicableRule = sortedRules.find(r => eligibleQuantity >= r.minQuantity);
          
          if (applicableRule) {
             discountAmount = (eligibleSubtotal * applicableRule.discount) / 100;
          } else {
             return { error: "You haven't added enough items to unlock this discount tier" };
          }
        }
        break;
        
      default:
        return { error: "Unknown coupon type" };
    }

    // Apply maxDiscount cap if it exists
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }

    // Ensure we don't discount more than the eligible subtotal (unless it's a shipping coupon)
    if (coupon.type !== "shipping" && discountAmount > eligibleSubtotal) {
      discountAmount = eligibleSubtotal;
    }

    return {
      discountAmount,
      eligibleSubtotal,
      finalShippingCharge,
      totalSubtotal
    };
  }
}

module.exports = new CouponCalculationService();
