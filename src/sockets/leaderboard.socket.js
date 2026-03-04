const mongoose = require("mongoose");
const Contest = require("./contest.model");
const leaderboardService = require("./leaderboard.service");
const walletService = require("../wallet/wallet.service");
const redis = require("../../config/redis");
const ratingEngine = require("./rating.engine");

const getKey = (contestId) => `contest:${contestId}:leaderboard`;

exports.processContestPrizes = async (contestId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const contest = await Contest.findById(contestId).session(session);

    if (!contest) throw new Error("Contest not found");

    if (contest.isProcessed)
      throw new Error("Contest already processed");

    if (contest.status !== "LIVE")
      throw new Error("Contest not ready for processing");

    // Freeze leaderboard
    const finalKey = `contest:${contestId}:leaderboard:final`;
    await redis.rename(getKey(contestId), finalKey);

    const rankings = await redis.zrevrange(
      finalKey,
      0,
      -1
    );

    let currentRank = 1;

    for (const userId of rankings) {
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
            prizeAmount = contest.entryFee * slab.value;
          }

          if (slab.type === "REFUND") {
            prizeAmount = contest.entryFee;
          }
        }
      }

      if (prizeAmount > 0) {
        await walletService.addBalance(
          userId,
          prizeAmount,
          "WIN"
        );
      }

      currentRank++;
    }

    contest.isProcessed = true;
    contest.status = "COMPLETED";
    contest.processedAt = new Date();

    await contest.save({ session });

    await session.commitTransaction();
    session.endSession();

    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
