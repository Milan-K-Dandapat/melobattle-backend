const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const {
  globalLimiter,
  speedLimiter
} = require("./middleware/rateLimit.middleware");

/* ==============================
    ROUTES
============================== */
const userRoutes = require("./modules/user/user.routes");
const walletRoutes = require("./modules/wallet/wallet.routes");
const contestRoutes = require("./modules/contest/contest.routes");
const withdrawalRoutes = require("./modules/withdrawal/withdrawal.routes");
const adminRoutes = require("./modules/admin/admin.routes");

// 🔥 NEW: Category/Fields Routes injected
const categoryRoutes = require("./modules/category/category.routes");
const compilerRoutes = require("./modules/compiler/compiler.routes");
const paymentRoutes = require("./modules/payment/payment.routes");


const app = express();

/* ==============================
    SECURITY & CORS MIDDLEWARE
============================== */

// Allows Google Auth popups and cross-origin resource sharing
app.use(
  helmet({
    // Allows Google Auth popups to communicate back to the main window
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false,
  })
);

/**
 * 🔥 CRITICAL CORS UPDATE: FIX FOR VERCEL DEPLOYMENT
 * Changed from localhost:5173 to "*" to allow your live Vercel frontend.
 */
app.use(
  cors({
    origin: "https://melobattle-frontend.vercel.app", 
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

/* ==============================
    BODY PARSERS & LOGGER
============================== */
/**
 * 🔥 THE CRITICAL FIX: PAYLOAD LIMITS
 * Increased to 10MB to accommodate Base64 image banners from laptop uploads.
 * This prevents the PayloadTooLargeError and "Update Sequence Terminated" issues.
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(cookieParser());
app.use(morgan("dev"));

/* ==============================
    RATE LIMITING
============================== */
app.use(globalLimiter);
app.use(speedLimiter);

/* ==============================
    API ROUTES
============================== */
/**
 * 🔥 SYNC PROTOCOL: PATH VERSIONING
 * Your frontend axiosInstance uses baseURL: .../api/v1
 * We are mounting routes to /api/v1 to match that sync.
 */
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/users", userRoutes); 

app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/contest", contestRoutes);
app.use("/api/v1/withdrawal", withdrawalRoutes);
app.use("/api/v1/admin", adminRoutes);

// 🔥 NEW: Mount the dynamic categories route
app.use("/api/v1/categories", categoryRoutes);

// Fallback for legacy /api calls (Optional but recommended for stability)
app.use("/api/user", userRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/contest", contestRoutes);
app.use("/api/categories", categoryRoutes); // Added fallback for categories
app.use("/api/v1/compiler", compilerRoutes);
app.use("/api/v1/payment", paymentRoutes);

/* ==============================
    DIAGNOSTICS & 404
============================== */
app.get("/", (req, res) => res.send("🚀 MELO BATTLE API LIVE"));

app.use((req, res) => {
  console.warn(`⚠️ 404 ERROR: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found. Check path capitalization.`
  });
});

/* ==============================
    GLOBAL ERROR HANDLER
============================== */
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Arena Error"
  });
});

module.exports = app;