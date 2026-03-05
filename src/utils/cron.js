const cron = require("node-cron");
const User = require("../modules/user/user.model");
const Contest = require("../modules/contest/contest.model"); // NEW
const { closeContestAndDistributePrizes } = require("../modules/contest/contest.controller"); // NEW
const { getIO } = require("../sockets/socket.server");
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

/**
 * 🔥 CONTEST ENGINE
 * Runs every minute to manage contest lifecycle
 */

cron.schedule("*/20 * * * * *", async () => {
  try {

    const now = new Date();
    const io = getIO();

    /* ===============================
       1️⃣ START UPCOMING CONTESTS
    =============================== */

    const upcomingContests = await Contest.find({
  status: "UPCOMING",
  startTime: { $lte: now },
  endTime: { $gt: now } // extra safety
});

    for (const contest of upcomingContests) {

      contest.status = "LIVE";
      await contest.save();

      if (io) {
        io.emit("BATTLE_STARTED", { contestId: contest._id });
      }

      console.log(`🔥 Contest Started: ${contest.title}`);
    }

    /* ===============================
       2️⃣ CLOSE LIVE CONTESTS
    =============================== */

    const finishedContests = await Contest.find({
      status: "LIVE",
      endTime: { $lte: now }
    });

    for (const contest of finishedContests) {

      if (contest.isProcessed) continue; // Safety check

      await closeContestAndDistributePrizes(contest, io);

contest.status = "COMPLETED";
contest.isProcessed = true;

await contest.save();

      console.log(`🏆 Contest Completed: ${contest.title}`);
    }

  } catch (error) {
    console.error("❌ Contest Engine Error:", error.message);
  }
});

module.exports = cron;