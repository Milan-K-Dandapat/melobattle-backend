require("dotenv").config();

// 1. Core Config & Connect Redis
require("./src/config/redis");

const express = require("express"); 
const http = require("http");
const connectDB = require("./src/config/db");
// Import the app instance
const app = require("./src/app"); 

/**
 * 🔥 PERFORMANCE OVERRIDE
 * Fixes: MaxListenersExceededWarning detected in your terminal.
 * Required to prevent the memory leak warning when multiple jobs/sockets are attached.
 */
require('events').EventEmitter.defaultMaxListeners = 25;

/**
 * 🔥 PAYLOAD ACCELERATION PROTOCOL
 * Required to handle Base64 Image Strings from Laptop Uploads.
 * Increased to 10MB to ensure high-res banners pass through without termination.
 */
// IMPORTANT: These apply globally to the 'app' instance imported from src/app.js
app.use(express.json({ limit: "10mb" })); 
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 🔥 Ranking Resetter (Cron Jobs)
require("./src/utils/cron"); 

// Socket Initialization
const { initSocket } = require("./src/sockets/socket.server");

/**
 * 🛠️ FOLDER STRUCTURE SYNC
 * Based on your Explorer in image_404d3b.jpg, your jobs are located in ./src/jobs/
 */
const startLifecycleJob = require("./src/jobs/contestLifecycle.job");
const startContestReminders = require("./src/jobs/contestStart.job");
const startLeaderboardJob = require("./src/jobs/leaderboard.job");
const startPrizeDistributionJob = require("./src/jobs/prizeDistribution.job");

/**
 * 🔥 ARENA WATCHER PROTOCOL
 * Based on image_404d3b.jpg, this file is in ./src/utils/
 */
const initContestCron = require("./src/utils/contestWatcher");

const PORT = process.env.PORT || 5000;

// 2. Create HTTP server
const server = http.createServer(app);

/**
 * 3. Initialize Socket.io 
 * 🔥 Ensure credentials: true is set in initSocket to fix CORS errors
 */
const io = initSocket(server);

// 4. Make io accessible in Express controllers
app.set("io", io);

/**
 * 🔥 STARTUP PROTOCOL: ASYNC INITIALIZATION
 * This prevents "buffering timed out" by awaiting the database sync
 * before deploying background jobs.
 */
const startServer = async () => {
  try {
    // 5. Connect to MongoDB (Awaited to prevent job timeouts and buffer errors)
    await connectDB();
    console.log("🛡️ Database matrix sync complete. Ready for job deployment.");

    // 6. Start Background Cron Jobs with Safety Wrappers
    const startJob = (jobFunc, name, arg = null) => {
      if (typeof jobFunc === "function") {
        arg ? jobFunc(arg) : jobFunc();
        console.log(`✅ Job Started: ${name}`);
      } else {
        // This triggers if a file in /src/jobs/ is missing an export
        console.warn(`⚠️ Warning: ${name} could not be started (Check exports in src/jobs/)`);
      }
    };

    // Deploy jobs only after DB connection is confirmed established
    startJob(startLifecycleJob, "Contest Lifecycle", io);
    startJob(startContestReminders, "Contest Reminders");
    startJob(startLeaderboardJob, "Leaderboard Sync");
    startJob(startPrizeDistributionJob, "Prize Distribution", io);
    
    /**
     * 🔥 DEPLOY ARENA WATCHER
     * Ensures prize money stays RESERVED until the 15-minute timer hits zero.
     */
    startJob(initContestCron, "Arena Time Watcher", io);

    /**
     * 7. Start the Server
     */
    server.listen(PORT, () => {
      console.log(`
      🚀 MELO BATTLE API IS LIVE!
      📡 Port: ${PORT}
      🔗 URL: http://localhost:${PORT}
      ✨ Real-time sockets enabled.
      🖼️ Banner Protocol: Optimized for 10MB Matrix Sync.
      🛠️ CORS configured for http://localhost:5173
      `);
    });

  } catch (error) {
    console.error("🔥 Server Initiation Failed:", error.message);
    // Exit with failure if the database cannot be synced
    process.exit(1);
  }
};

// Execute the final startup sequence
startServer();

// Handle unhandled promise rejections to prevent silent crashes
process.on("unhandledRejection", (err) => {
  console.error("🔥 Unhandled Rejection:", err.message);
});