const { z } = require("zod");

const createCouponSchema = z.object({
  code: z
    .string({ required_error: "Coupon code is required" })
    .min(1, "Coupon code cannot be empty")
    .toUpperCase()
    .trim(),
  description: z.string().optional(),
  type: z.enum(["percentage", "fixed", "shipping", "tiered"], {
    required_error: "Type must be percentage, fixed, shipping, or tiered",
  }),
  value: z.preprocess(
    (val) => (val !== undefined && val !== "" ? Number(val) : undefined),
    z.number().min(0, "Value must be positive").optional()
  ),
  minOrderAmount: z.preprocess(
    (val) => (val !== undefined && val !== "" ? Number(val) : 0),
    z.number().min(0).optional()
  ),
  maxDiscount: z.preprocess(
    (val) => (val !== undefined && val !== "" ? Number(val) : undefined),
    z.number().min(0).optional()
  ),
  usageLimit: z.preprocess(
    (val) => (val !== undefined && val !== "" ? Number(val) : undefined),
    z.number().int().min(1).optional()
  ),
  perUserLimit: z.preprocess(
    (val) => (val !== undefined && val !== "" ? Number(val) : 1),
    z.number().int().min(1).optional()
  ),
  firstOrderOnly: z.boolean().optional().default(false),
  applicableProducts: z.array(z.string()).optional(),
  applicableCategories: z.array(z.string()).optional(),
  startDate: z.preprocess(
    (val) => (val ? new Date(val) : new Date()),
    z.date().optional()
  ),
  endDate: z.preprocess(
    (val) => new Date(val),
    z.date().refine((date) => date > new Date(), {
      message: "End date must be in the future",
    })
  ),
  isActive: z.boolean().optional().default(true),
  priority: z.preprocess(
    (val) => (val !== undefined && val !== "" ? Number(val) : 0),
    z.number().int().optional()
  ),
  isStackable: z.boolean().optional().default(false),
  rules: z.array(
    z.object({
      minQuantity: z.number(),
      discount: z.number(),
    })
  ).optional(),
});

const applyCouponSchema = z.object({
  code: z
    .string({ required_error: "Coupon code is required" })
    .min(1, "Coupon code cannot be empty")
    .toUpperCase()
    .trim(),
  cartItems: z.array(z.any()).nonempty({ message: "Cart items are required" }),
});

module.exports = {
  createCouponSchema,
  applyCouponSchema,
};
