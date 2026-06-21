const pino = require("pino");

const isDev = process.env.NODE_ENV === "development";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // Redact sensitive keys in logging output
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "confirmPassword",
      "token",
      "refreshToken",
      "body.password",
      "body.cPassword",
      "body.token",
      "body.refreshToken",
    ],
    placeholder: "[REDACTED]",
  },
  // Pretty-print only in local development
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
        },
      }
    : undefined,
});

module.exports = logger;
