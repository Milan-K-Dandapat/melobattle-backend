const cron = require("node-cron");
const User = require("../modules/user/user.model");
const { getIO } = require("../sockets/socket.server"); // 🔥 Import socket instance

/**
 * ARENA ELITE RESET PROTOCOLS
 * Automatically clears periodic rankings and notifies online players
 */

// 1. DAILY RESET (Runs every night at 00:00 / Midnight)
cron.schedule("0 0 * * *", async () => {
  console.log("🕒 [CRON] Initializing Daily Ranking Reset...");
  try {
    await User.updateMany({}, { 
      $set: { 
        dailyPoints: 0,
        "categoryStats.$[].daily": 0 
      } 
    });

    // 🔥 Notify online users
    const io = getIO();
    if (io) {
      io.emit("SEASON_RESET", { 
        type: "DAILY", 
        message: "A new Daily Season has started! Climb the leaderboard now." 
      });
    }

    console.log("✅ [CRON] Daily rankings cleared and users notified.");
  } catch (err) {
    console.error("❌ [CRON] Daily reset failed:", err);
  }
});

// 2. WEEKLY RESET (Runs every Sunday at 00:00)
cron.schedule("0 0 * * 0", async () => {
  console.log("🕒 [CRON] Initializing Weekly Ranking Reset...");
  try {
    await User.updateMany({}, { 
      $set: { 
        weeklyPoints: 0,
        "categoryStats.$[].weekly": 0 
      } 
    });

    const io = getIO();
    if (io) {
      io.emit("SEASON_RESET", { 
        type: "WEEKLY", 
        message: "The Weekly Season has refreshed! Claim your glory." 
      });
    }

    console.log("✅ [CRON] Weekly rankings cleared.");
  } catch (err) {
    console.error("❌ [CRON] Weekly reset failed:", err);
  }
});

// 3. MONTHLY RESET (Runs on the 1st of every month at 00:00)
cron.schedule("0 0 1 * *", async () => {
  console.log("🕒 [CRON] Initializing Monthly Ranking Reset...");
  try {
    await User.updateMany({}, { 
      $set: { 
        monthlyPoints: 0,
        "categoryStats.$[].monthly": 0 
      } 
    });

    const io = getIO();
    if (io) {
      io.emit("SEASON_RESET", { 
        type: "MONTHLY", 
        message: "The Grand Monthly Season has begun! Top the charts for massive rewards." 
      });
    }

    console.log("✅ [CRON] Monthly rankings cleared.");
  } catch (err) {
    console.error("❌ [CRON] Monthly reset failed:", err);
  }
});

module.exports = cron;