const { z } = require("zod");

const envSchema = z.zodSchema || z.object({
  DATABASE: z.string().url("DATABASE must be a valid connection string (e.g. mongodb://...)"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  PORT: z.preprocess((val) => Number(val) || 8000, z.number().int()),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  COOKIE_DOMAIN: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});

function validateEnv() {
  try {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error("\x1b[31m%s\x1b[0m", "==================================================");
      console.error("\x1b[31m%s\x1b[0m", "        [FATAL] ENVIRONMENT VALIDATION FAILED     ");
      console.error("\x1b[31m%s\x1b[0m", "==================================================");
      
      const issues = result.error.issues || [];
      issues.forEach((err) => {
        console.error(`\x1b[33m[${err.path.join(".")}]\x1b[0m: ${err.message}`);
      });
      
      console.error("\x1b[31m%s\x1b[0m", "==================================================");
      process.exit(1);
    }
    return result.data;
  } catch (err) {
    console.error("Failed to run env validation:", err.message);
    process.exit(1);
  }
}

module.exports = validateEnv();
