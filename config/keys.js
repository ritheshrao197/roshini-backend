/**
 * Auth configuration — reads secrets from environment variables only.
 * The server will refuse to start in production without JWT_SECRET.
 */
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error(
    "[FATAL] JWT_SECRET environment variable is not set. Server cannot start in production without it."
  );
}

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || "dev-only-secret-change-in-production",
};
