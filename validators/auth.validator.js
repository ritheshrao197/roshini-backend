const { z } = require("zod");

const signupSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(3, "Name must be at least 3 characters")
    .max(25, "Name must not exceed 25 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .email("Email is invalid")
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(255, "Password must not exceed 255 characters"),
  cPassword: z
    .string({ required_error: "Confirm password is required" })
}).refine((data) => data.password === data.cPassword, {
  message: "Passwords do not match",
  path: ["cPassword"],
});

const signinSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Email is invalid")
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password cannot be empty")
});

module.exports = {
  signupSchema,
  signinSchema,
};
