const { z } = require("zod");

// MongoDB ObjectId Regex validation
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, "Invalid MongoDB ObjectId");

const createProductSchema = z.object({
  pName: z
    .string({ required_error: "Product name is required" })
    .min(1, "Product name cannot be empty")
    .trim(),
  pDescription: z
    .string({ required_error: "Product description is required" })
    .min(1, "Product description cannot be empty"),
  pPrice: z.preprocess(
    (val) => Number(val),
    z.number({ required_error: "Product price is required" }).min(0, "Price must be greater than or equal to 0")
  ),
  pQuantity: z.preprocess(
    (val) => (val !== undefined ? Number(val) : 0),
    z.number().min(0, "Quantity must be greater than or equal to 0").default(0)
  ),
  pCategory: objectIdSchema,
  pImages: z.array(z.string()).optional(),
  pStatus: z.string({ required_error: "Product status is required" }),
  slug: z.string().optional(),
  sku: z.string().optional(),
  productType: z.string().optional(),
  brandName: z.string().optional(),
  comparePrice: z.preprocess((val) => (val !== undefined ? Number(val) : undefined), z.number().optional()),
  lowStockThreshold: z.preprocess((val) => (val !== undefined ? Number(val) : 10), z.number().optional()),
  productWeight: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  usageInstructions: z.string().optional(),
  storageInstructions: z.string().optional(),
  suitableFor: z.array(z.string()).optional(),
  bestseller: z.boolean().optional(),
  featured: z.boolean().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateProductSchema = createProductSchema.partial();

const createCategorySchema = z.object({
  cName: z
    .string({ required_error: "Category name is required" })
    .min(1, "Category name cannot be empty")
    .trim(),
  cDescription: z
    .string({ required_error: "Category description is required" })
    .min(1, "Category description cannot be empty"),
  cStatus: z.string({ required_error: "Category status is required" }),
});

const submitReviewSchema = z.object({
  rating: z.preprocess(
    (val) => Number(val),
    z.number().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5")
  ),
  review: z
    .string({ required_error: "Review is required" })
    .min(1, "Review content cannot be empty")
    .trim(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  submitReviewSchema,
};
