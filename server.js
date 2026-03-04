require("dotenv").config();

// 1. Core Config & Connect Redis
require("./src/config/redis");

const express = require("express"); 
const http = require("http");
const cors = require("cors"); // Added CORS import
const connectDB = require("./src/config/db");
// Import the app instance
const app = require("./src/app"); 

/**
 * 🔥 PERFORMANCE OVERRIDE
 * Fixes: MaxListenersExceededWarning detected in your terminal.
 */
require('events').EventEmitter.defaultMaxListeners = 25;

/**
 * 🛠️ CORS CONFIGURATION
 * Updated to allow all origins (*) so your live frontend can connect to this Render backend.
 */
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

/**
 * 🔥 PAYLOAD ACCELERATION PROTOCOL
 */
app.use(express.json({ limit: "10mb" })); 
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 🔥 Ranking Resetter (Cron Jobs)
require("./src/utils/cron"); 

// Socket Initialization
const { initSocket } = require("./src/sockets/socket.server");

/**
 * 🛠️ FOLDER STRUCTURE SYNC
 */
const startLifecycleJob = require("./src/jobs/contestLifecycle.job");
const startContestReminders = require("./src/jobs/contestStart.job");
const startLeaderboardJob = require("./src/jobs/leaderboard.job");
const startPrizeDistributionJob = require("./src/jobs/prizeDistribution.job");

/**
 * 🔥 ARENA WATCHER PROTOCOL
 */
const initContestCron = require("./src/utils/contestWatcher");

const PORT = process.env.PORT || 5000;

// 2. Create HTTP server
const server = http.createServer(app);

/**
 * 3. Initialize Socket.io 
 * Added CORS origin: "*" here as well to ensure the Socket handshake succeeds.
 */
const io = initSocket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 4. Make io accessible in Express controllers
app.set("io", io);

/**
 * 🔥 STARTUP PROTOCOL: ASYNC INITIALIZATION
 */
const startServer = async () => {
  try {
    // 5. Connect to MongoDB
    await connectDB();
    console.log("🛡️ Database matrix sync complete. Ready for job deployment.");

    // 6. Start Background Cron Jobs with Safety Wrappers
    const startJob = (jobFunc, name, arg = null) => {
      if (typeof jobFunc === "function") {
        arg ? jobFunc(arg) : jobFunc();
        console.log(`✅ Job Started: ${name}`);
      } else {
        console.warn(`⚠️ Warning: ${name} could not be started (Check exports in src/jobs/)`);
      }
    };

    // Deploy jobs
    startJob(startLifecycleJob, "Contest Lifecycle", io);
    startJob(startContestReminders, "Contest Reminders");
    startJob(startLeaderboardJob, "Leaderboard Sync");
    startJob(startPrizeDistributionJob, "Prize Distribution", io);
    
    startJob(initContestCron, "Arena Time Watcher", io);

    /**
     * 7. Start the Server
     */
    server.listen(PORT, () => {
      console.log(`
      🚀 MELO BATTLE API IS LIVE!
      📡 Port: ${PORT}
      🔗 URL: https://melobattle-backend1.onrender.com
      ✨ Real-time sockets enabled.
      🖼️ Banner Protocol: Optimized for 10MB Matrix Sync.
      🛠️ CORS configured for ALL ORIGINS (*)
      `);
    });

  } catch (error) {
    console.error("🔥 Server Initiation Failed:", error.message);
    process.exit(1);
  }
};

startServer();

process.on("unhandledRejection", (err) => {
  console.error("🔥 Unhandled Rejection:", err.message);
});