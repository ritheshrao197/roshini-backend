const { z } = require("zod");

const createCouponSchema = z.object({
  code: z
    .string({ required_error: "Coupon code is required" })
    .min(1, "Coupon code cannot be empty")
    .toUpperCase()
    .trim(),
  discountType: z.enum(["Percentage", "Fixed"], {
    required_error: "Discount type must be either 'Percentage' or 'Fixed'",
  }),
  discountAmount: z.preprocess(
    (val) => Number(val),
    z.number().min(0, "Discount amount must be greater than or equal to 0")
  ),
  minOrderAmount: z.preprocess(
    (val) => (val !== undefined ? Number(val) : 0),
    z.number().min(0, "Minimum order amount must be greater than or equal to 0").optional()
  ),
  expiryDate: z.preprocess(
    (val) => new Date(val),
    z.date().refine((date) => date > new Date(), {
      message: "Expiry date must be in the future",
    })
  ),
  isActive: z.boolean().optional().default(true),
  maxUses: z.preprocess(
    (val) => (val !== undefined && val !== "" ? Number(val) : null),
    z.number().int().min(1, "Max uses must be at least 1").nullable().optional()
  ),
  userEmail: z
    .string()
    .email("User email is invalid")
    .nullable()
    .optional()
    .or(z.literal("")),
});

const applyCouponSchema = z.object({
  code: z
    .string({ required_error: "Coupon code is required" })
    .min(1, "Coupon code cannot be empty")
    .toUpperCase()
    .trim(),
});

module.exports = {
  createCouponSchema,
  applyCouponSchema,
};
