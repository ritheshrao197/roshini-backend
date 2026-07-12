/**
 * Roshini's Home Products — Backend API Server
 * Express + MongoDB + JWT Authentication
 */

const express = require("express");
const app = express();
app.set("trust proxy", true); // Trust all proxy headers (Render / Cloudflare)
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// ── Startup Environment Check ──
require("./config/env.validator");

const Sentry = require("@sentry/node");
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

// Start background queue workers
require("./services/worker");

const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const timeout = require("connect-timeout");
const compression = require("compression");
const hpp = require("hpp");
const pinoHttp = require("pino-http");
const crypto = require("crypto");
const logger = require("./config/logger");

// Import Router
const authRouter = require("./routes/auth");
const categoryRouter = require("./routes/categories");
const productRouter = require("./routes/products");
const brainTreeRouter = require("./routes/braintree");
const orderRouter = require("./routes/orders");
const usersRouter = require("./routes/users");
const customizeRouter = require("./routes/customize");
const paymentRouter = require("./routes/payments");
const adminRouter = require("./routes/admin");
const userManagementRouter = require("./routes/userManagement");
const vlogRouter = require("./routes/vlogs");
const adminVlogRouter = require("./routes/adminVlogs");
const achievementRouter = require("./routes/achievements");
const adminAchievementRouter = require("./routes/adminAchievements");
const sliderRouter = require("./routes/sliders");
const adminSliderRouter = require("./routes/adminSliders");
const websiteSectionsRouter = require("./routes/websiteSections");
const sectionRouter = require("./routes/websiteSections");
const subscriberRouter = require("./routes/subscribers");
const accountRouter = require("./routes/account");
const newsletterRouter = require("./routes/newsletter");
// Import Auth middleware for check user login or not~
const { loginCheck } = require("./middleware/auth");
const CreateAllFolder = require("./config/uploadFolderCreateScript");

/* Create All Uploads Folder if not exists | For Uploading Images */
CreateAllFolder();
require("dotenv").config();
// Import cron jobs
require("./cron/orderExpiration");
require("./cron/paymentReconciliation");
require("./cron/scheduledPublish");

// Database Connection
mongoose
  .connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() =>
    console.log(
      "==============Mongodb Database Connected Successfully=============="
    )
  )
  .catch((err) => console.log("Database Not Connected !!! Error:", err));

// ── Performance & Timeout Middlewares ──
app.use(timeout("15s"));
app.use(compression());

// ── Request ID Tracing ──
app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"] || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
  req.id = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

// ── Structured Request Logging ──
app.use(pinoHttp({ logger }));

// ── Security Middlewares ──
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.google-analytics.com", "https://*.clarity.ms"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://*.clarity.ms"],
      connectSrc: ["'self'", "https://www.google-analytics.com", "https://*.clarity.ms", "https://*.sentry.io"],
    },
  },
  xssFilter: true,
  frameguard: { action: "deny" }
}));
app.use(mongoSanitize());
app.use(hpp());

app.use(cookieParser());

const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, "") : "";

const allowedOrigins = process.env.NODE_ENV === "production"
  ? [
      "https://roshinis.com",
      "https://admin.roshinis.com",
      clientUrl
    ].filter(Boolean)
  : [
      clientUrl,
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002",
    ].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.indexOf(origin) !== -1 || 
                      origin.endsWith(".vercel.app") ||
                      (process.env.NODE_ENV !== "production" && (
                        origin.startsWith("http://localhost:") || 
                        origin.startsWith("http://127.0.0.1:") ||
                        origin.startsWith("http://192.168.")
                      ));
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "token"],
};
app.use(cors(corsOptions));

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Routes
app.use("/api", authRouter);
app.use("/api/user", usersRouter);
app.use("/api/category", categoryRouter);
app.use("/api/product", productRouter);
app.use("/api", brainTreeRouter);
app.use("/api/account", accountRouter);
app.use("/api/sliders", sliderRouter);
app.use("/api/sections", sectionRouter);
app.use("/api/subscribers", subscriberRouter);
app.use("/api/order", orderRouter);
app.use("/api/customize", customizeRouter);
app.use("/api/payment", paymentRouter);
app.use("/api", adminRouter);
app.use("/api", vlogRouter);
app.use("/api", adminVlogRouter);
app.use("/api", achievementRouter);
app.use("/api", adminAchievementRouter);
app.use("/api", sliderRouter);
app.use("/api", adminSliderRouter);
app.use("/api", websiteSectionsRouter);
app.use("/api", userManagementRouter); // RBAC & User Management
app.use("/api/newsletter", newsletterRouter);
// Health Check Endpoints
app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.get("/health/details", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  let redisStatus = "disconnected";
  try {
    const redisClient = require("./config/redis");
    if (redisClient) {
      redisStatus = "connected";
    }
  } catch (e) {}

  res.json({
    status: "healthy",
    mongodb: dbStatus,
    redis: redisStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Global Rate Limiter for all API routes
const rateLimit = require("express-rate-limit");
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please wait 15 minutes before trying again.", limit: 100 },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", globalLimiter);

// Global Error Handler
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

// Run Server
const PORT = process.env.PORT || 8000;
let server;
if (process.env.NODE_ENV !== "test") {
  server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
}

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`[Shutdown] Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      logger.info("[Shutdown] HTTP server closed.");
      try {
        await mongoose.disconnect();
        logger.info("[Shutdown] MongoDB connection closed.");
        process.exit(0);
      } catch (err) {
        logger.error({ err }, "[Shutdown] Error during MongoDB disconnect.");
        process.exit(1);
      }
    });
  } else {
    try {
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = app;
