const cron = require("node-cron");
const mongoose = require("mongoose");
const Contest = require("../modules/contest/contest.model");
const prizeEngine = require("../modules/contest/prize.engine");

/**
 * 🔥 CONTEST LIFECYCLE SYNC PROTOCOL
 * Location: src/jobs/contestLifecycle.job.js
 */
const startLifecycleJob = (io) => {
  /**
   * Runs every 10 seconds to ensure real-time state transitions.
   */
  cron.schedule("*/10 * * * * *", async () => {
    try {
      /**
       * 🔥 CRITICAL: DB READINESS CHECK
       * Verified connection state: 1 = Connected, 2 = Connecting.
       * If disconnected, we skip this cycle to prevent "Buffering Timed Out".
       */
      if (mongoose.connection.readyState !== 1) {
        return; 
      }

      const now = new Date();

      // 1️⃣ Move UPCOMING → LIVE
      // Automatically activates battles when startTime is reached
      const upcomingContests = await Contest.find({
        status: "UPCOMING",
        startTime: { $lte: now }
      });

      for (const contest of upcomingContests) {
        /**
         * 🔥 ATOMIC UPDATE: We use findOneAndUpdate to ensure the state 
         * change is atomic and won't be duplicated by other workers.
         */
        const updatedContest = await Contest.findOneAndUpdate(
          { _id: contest._id, status: "UPCOMING" },
          { $set: { status: "LIVE" } },
          { new: true }
        );

        if (updatedContest) {
          console.log(`🚀 [LIFECYCLE] Contest ${updatedContest._id} is now LIVE`);

          if (io) {
            // Notify users in the specific battle lobby
            io.to(`contest_${updatedContest._id}`).emit("contest_started", {
              contestId: updatedContest._id
            });
            
            // Broadcast to the global dashboard for progress bar updates
            io.emit("BATTLE_STARTED", { contestId: updatedContest._id });
          }
        }
      }

      // 2️⃣ Move LIVE → PROCESSING
      // Transitions battle to prize calculation state when endTime is reached
      const endingContests = await Contest.find({
        status: "LIVE",
        endTime: { $lte: now }
      });

      for (const contest of endingContests) {
        const processedContest = await Contest.findOneAndUpdate(
          { _id: contest._id, status: "LIVE" },
          { $set: { status: "PROCESSING" } },
          { new: true }
        );

        if (processedContest) {
          console.log(`🏁 [LIFECYCLE] Contest ${processedContest._id} is PROCESSING`);

          // Automatically process prizes using the Prize Engine
          if (prizeEngine && typeof prizeEngine.processContestPrizes === 'function') {
            try {
              await prizeEngine.processContestPrizes(processedContest._id, io);
            } catch (prizeErr) {
              console.error(`❌ Prize Processing Failed for ${processedContest._id}:`, prizeErr.message);
            }
          }
        }
      }

    } catch (error) {
      /**
       * 🔥 ERROR RECOVERY:
       * If the error is database-related, we log it without crashing the entire Node process.
       */
      console.error("🔥 Lifecycle Job Error:", error.message);
    }
  });

  console.log("✅ Contest Lifecycle Job Deployed 🚀");
};

module.exports = startLifecycleJob;