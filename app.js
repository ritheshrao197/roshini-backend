/* 

================== Most Important ==================
* Issue 1 :
In uploads folder you need create 3 folder like bellow.
Folder structure will be like: 
public -> uploads -> 1. products 2. customize 3. categories
*** Now This folder will automatically create when we run the server file

* Issue 2:
For admin signup just go to the auth 
controller then newUser obj, you will 
find a role field. role:1 for admin signup & 
role: 0 or by default it for customer signup.
go user model and see the role field.

*/

const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");

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
const vlogRouter = require("./routes/vlogs");
const adminVlogRouter = require("./routes/adminVlogs");
const achievementRouter = require("./routes/achievements");
const adminAchievementRouter = require("./routes/adminAchievements");
const sliderRouter = require("./routes/sliders");
const adminSliderRouter = require("./routes/adminSliders");
// Import Auth middleware for check user login or not~
const { loginCheck } = require("./middleware/auth");
const CreateAllFolder = require("./config/uploadFolderCreateScript");

/* Create All Uploads Folder if not exists | For Uploading Images */
CreateAllFolder();

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
  .catch((err) => console.log("Database Not Connected !!!"));

// Security Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(mongoSanitize());

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: "Too many requests from this IP, please try again later." },
});
app.use("/api/signup", apiLimiter);
app.use("/api/signin", apiLimiter);

// Middleware
app.use(morgan("dev"));
app.use(cookieParser());

const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, "") : "";

const allowedOrigins = [
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
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.indexOf(origin) !== -1 || 
                      origin.startsWith("http://localhost:") || 
                      origin.startsWith("http://127.0.0.1:") ||
                      origin.endsWith(".vercel.app");
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global Error Caught:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    status: err.status || 500,
  });
});

// Run Server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("Server is running on ", PORT);
});
