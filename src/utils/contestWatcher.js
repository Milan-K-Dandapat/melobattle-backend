const cron = require('node-cron');

/**
 * 🔥 AUTOMATED ARENA WATCHER
 * Path Resolution: 
 * We are in src/utils. 
 * ../ jumps to src
 * ../../ jumps to backend root to reach api/ contest
 */
const Contest = require('../../src/modules/contest/contest.model'); 
const Transaction = require('../../src/modules/wallet/transaction.model'); 
const { closeContestAndDistributePrizes } = require('../../src/modules/contest/contest.controller');

const initContestCron = (io) => {
  // Runs every 1 minute to check for expired timers
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // 1. Find all contests currently in "LIVE" state
      const liveContests = await Contest.find({ status: "LIVE" });

      for (const contest of liveContests) {
        // 2. Calculate official end time (StartTime + Duration)
        const startTime = new Date(contest.startTime).getTime();
        const durationMs = (contest.duration || 15) * 60 * 1000;
        const endTime = startTime + durationMs;

        // 3. Official closure trigger
        if (now.getTime() >= endTime) {
          console.log(`⏰ Arena Finalized: ${contest.title}`);
          
          contest.status = "COMPLETED";
          await contest.save();

          // 4. 🔥 LEDGER FINALIZATION
          // Converts entry fees from RESERVED to SUCCESS for Admin Analytics
          await Transaction.updateMany(
            { 
              referenceId: contest._id.toString(), 
              type: "ENTRY_FEE", 
              status: "RESERVED" 
            },
            { 
              $set: { status: "SUCCESS" } 
            }
          );

          // 5. 🔥 TRIGGER WEIGHTED PAYOUTS
          // This executes the logic where Rank #1 earns more than Entry Fee
          await closeContestAndDistributePrizes(contest, io);
        }
      }
    } catch (err) {
      console.error("❌ Arena Watcher Error:", err.message);
    }
  });
};

module.exports = initContestCron;