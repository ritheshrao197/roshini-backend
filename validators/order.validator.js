const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, "Invalid MongoDB ObjectId");

const createOrderSchema = z.object({
  allProduct: z
    .array(
      z.object({
        id: objectIdSchema,
        quantitiy: z.number().int().min(1, "Quantity must be at least 1"),
      }),
      { required_error: "Products list is required" }
    )
    .min(1, "Order must contain at least 1 product"),
  user: objectIdSchema,
  amount: z.preprocess(
    (val) => Number(val),
    z.number().min(0, "Amount must be greater than or equal to 0")
  ),
  transactionId: z.string({ required_error: "Transaction ID is required" }).min(1, "Transaction ID cannot be empty"),
  address: z.string({ required_error: "Address is required" }).min(1, "Address cannot be empty").trim(),
  phone: z.preprocess(
    (val) => Number(val),
    z.number({ required_error: "Phone number is required" }).int()
  ),
});

const updateOrderSchema = z.object({
  oId: objectIdSchema,
  status: z.enum(["Not processed", "Processing", "Shipped", "Delivered", "Cancelled"]).optional(),
  paymentStatus: z.enum(["Pending", "Paid", "Failed", "Refunded"]).optional(),
  shipmentTrackingId: z.string().optional(),
  refundStatus: z.enum(["None", "Requested", "Processed"]).optional(),
});

module.exports = {
  createOrderSchema,
  updateOrderSchema,
};
