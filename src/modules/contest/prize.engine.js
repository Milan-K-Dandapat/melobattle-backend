const mongoose = require("mongoose");
const Contest = require("./contest.model");
const walletService = require("../wallet/wallet.service");
const redis = require("../../config/redis");
const ratingEngine = require("./rating.engine");
const rankingEngine = require("./ranking.engine");

const getLiveKey = (contestId) =>
  `contest:${contestId}:leaderboard`;

const getFinalKey = (contestId) =>
  `contest:${contestId}:leaderboard:final`;

exports.processContestPrizes = async (contestId, io) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const contest = await Contest.findById(contestId).session(session);

    if (!contest) throw new Error("Contest not found");

    if (contest.isProcessed)
      throw new Error("Contest already processed");

    if (!["PROCESSING", "LIVE"].includes(contest.status))
      throw new Error("Contest not ready for processing");

    const liveKey = getLiveKey(contestId);
    const finalKey = getFinalKey(contestId);

    /**
     * 🔥 REDIS LEADERBOARD FREEZE
     * Ensures the live scoring is locked into a final state before distribution.
     */
    // Safety check for Redis connection to prevent transaction aborts
    if (redis.status === "ready" || redis.connected === true) {
      const exists = await redis.exists(finalKey);
      const hasLive = await redis.exists(liveKey);

      if (!exists && hasLive) {
        await redis.rename(liveKey, finalKey);
      }
    }

    // Generate structured ranking
    const rankingList =
      await rankingEngine.generateFinalRanking(contestId);

    let totalDistributed = 0;
    let winners = 0;

    for (const player of rankingList) {
      const currentRank = player.rank;
      let prizeAmount = 0;

      for (const slab of contest.prizeSlabs) {
        if (
          currentRank >= slab.fromRank &&
          currentRank <= slab.toRank
        ) {
          if (slab.type === "FIXED") {
            prizeAmount = slab.value;
          }

          if (slab.type === "MULTIPLIER") {
            prizeAmount =
              contest.entryFee * slab.value;
          }

          if (slab.type === "REFUND") {
            prizeAmount = contest.entryFee;
          }
        }
      }

      if (prizeAmount > 0) {
        // Update user's wallet with the winnings
        await walletService.addBalance(
          player.userId,
          prizeAmount,
          "WIN"
        );

        totalDistributed += prizeAmount;
        winners++;
      }
    }

    // Update ratings using userId list to sync with Global Leaderboard
    const rankingIds = rankingList.map(
      (r) => r.userId
    );

    if (ratingEngine && typeof ratingEngine.updateRatings === 'function') {
      await ratingEngine.updateRatings(rankingIds);
    }

    contest.isProcessed = true;
    contest.status = "COMPLETED";
    contest.processedAt = new Date();
    contest.totalPrizeDistributed = totalDistributed;
    contest.winnerCount = winners;

    await contest.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Emit final result via socket for real-time dashboard updates
    if (io) {
      io.to(`contest_${contestId}`).emit(
        "contest_completed",
        {
          contestId,
          totalDistributed,
          winners,
          ranking: rankingList
        }
      );

      // Global broadcast to update "Live Arena" status in the Lobby
      io.emit("ARENA_COMPLETED", { contestId });
    }

    return {
      success: true,
      totalDistributed,
      winners
    };

  } catch (error) {
    // 🔥 SYNC SAFETY: Rollback all changes if any part of distribution fails
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error(`🔥 Prize Engine Failure [Contest ${contestId}]:`, error.message);
    throw error;
  }
};