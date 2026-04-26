const redis = require("../../config/redis");
const User = require("../user/user.model");
const Contest = require("../contest/contest.model");
const Participant = require("../contest/participant.model"); // 🔥 Added for Dream11-style persistence
const mongoose = require("mongoose");
const getKey = (contestId) => `contest:${contestId}:leaderboard`;

/**
 * Composite scoring logic:
 * Priority 1: Main Score (Factor: 1M)
 * Priority 2: Completion Speed (Subtracted)
 * Priority 3: Accuracy
 */
const calculateCompositeScore = (score, completionTime, accuracy) => {
  return (score * 1000000) - (completionTime * 10) + (accuracy);
};

/* =========================================
   🔥 PRIZE DISTRIBUTION HELPER
========================================= */

const distributePrizes = (participants, prizePool, winnerPercentage = 60) => {
  const totalPlayers = participants.length;

  if (!totalPlayers || !prizePool) return participants;

  // 🔥 Calculate number of winners
  const winnersCount = Math.ceil((winnerPercentage / 100) * totalPlayers);

  if (winnersCount <= 0) return participants;

  // 🔥 Create decreasing weight system
  // Example for 6 winners → [6,5,4,3,2,1]
  const weights = [];
  for (let i = winnersCount; i >= 1; i--) {
    weights.push(i);
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // 🔥 Calculate prizes based on weight ratio
  let prizes = weights.map(weight =>
    Math.floor((weight / totalWeight) * prizePool)
  );

  // 🔥 Fix rounding difference (give remainder to rank 1)
  const distributedTotal = prizes.reduce((a, b) => a + b, 0);
  const remainingAmount = prizePool - distributedTotal;

  if (remainingAmount > 0) {
    prizes[0] += remainingAmount;
  }

  return participants.map((player, index) => ({
    ...player,
    prizeWon: prizes[index] || 0
  }));
};

/* =========================================
   1. UPDATE LEADERBOARD (Real-time & DB Sync)
========================================= */
exports.updateLeaderboard = async (
  contestId,
  userId,
  score,
  completionTime,
  accuracy,
  io 
) => {
  try {
    const compositeScore = calculateCompositeScore(
      score,
      completionTime,
      accuracy
    );

    // 1. Update Redis Sorted Set for high-speed live ranking
    await redis.zadd(getKey(contestId), compositeScore, userId);

    // 2. 🔥 PERSISTENCE: Save/Update individual match score in MongoDB
    // This allows the "View Results" button to work after the Redis key expires.
await Participant.findOneAndUpdate(
  { contestId: new mongoose.Types.ObjectId(contestId), userId },
  {
    $max: { score: score }, // ✅ KEEP HIGHEST SCORE ONLY
    $set: {
      contestId: new mongoose.Types.ObjectId(contestId),
      userId,
      accuracy,
      completionTime: completionTime || 0
    }
  },
  { upsert: true, new: true }
);
    // Emit live update to all players currently in the contest room
  if (io) {
  io.to(`contest_${contestId}`).emit("LIVE_LEADERBOARD_UPDATE", {
    contestId,
    userId,
    score,
    accuracy,
    completionTime
  });

}
  } catch (error) {
    console.error("Leaderboard Sync Error:", error);
  }
};

/* =========================================
   2. GET TOP PLAYERS (Contest-Specific Results)
========================================= */
exports.getTopPlayers = async (contestId, limit = 50) => {
  try {
    console.log("🔥 Leaderboard contestId:", contestId);

    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      console.log("Invalid contestId:", contestId);
      return [];
    }

    const objectContestId = new mongoose.Types.ObjectId(contestId);

    const dbParticipants = await Participant.find({
      contestId: objectContestId
    })
      .populate("userId", "name username avatar rating totalWins")
      .sort({
        score: -1,
        accuracy: -1,
        completionTime: 1,
      })
      .limit(limit)
      .lean();

    console.log("Participants found:", dbParticipants.length);

    if (!dbParticipants.length) return [];

    // 🔥 Proper tie-rank logic
    let currentRank = 1;
    let previousPlayer = null;

    const rankedPlayers = dbParticipants.map((p, index) => {
      if (
        previousPlayer &&
        (
          p.score !== previousPlayer.score ||
          p.accuracy !== previousPlayer.accuracy ||
          p.completionTime !== previousPlayer.completionTime
        )
      ) {
        currentRank = index + 1;
      }

      previousPlayer = p;

      return {
        rank: currentRank,
        userId: p.userId?._id,
        username: p.userId?.username || p.userId?.name || "Warrior",
        avatar: p.userId?.avatar || null,
        rating: p.userId?.rating || 1000,
        score: p.score,
        accuracy: p.accuracy,
        time: p.completionTime,
        prizeWon: 0
      };
    });

    // 🔥 Apply weighted payout with default 60%
    const contest = await Contest.findById(objectContestId)
  .select("prizePool winnerPercentage")
  .lean();

    if (contest && contest.prizePool > 0) {
      const winnerPercentage = contest.winnerPercentage || 60;

      const winnersCount = Math.ceil(
        (winnerPercentage / 100) * rankedPlayers.length
      );

      if (winnersCount > 0) {
        // Create weights [n, n-1, ..., 1]
        const weights = [];
        for (let i = winnersCount; i >= 1; i--) {
          weights.push(i);
        }

        const totalWeight = weights.reduce((sum, w) => sum + w, 0);

        let prizes = weights.map(weight =>
          Math.floor((weight / totalWeight) * contest.prizePool)
        );

        // Fix rounding remainder
        const distributedTotal = prizes.reduce((a, b) => a + b, 0);
        const remainingAmount = contest.prizePool - distributedTotal;

        if (remainingAmount > 0) {
          prizes[0] += remainingAmount;
        }

        const finalPlayers = rankedPlayers.map((player, index) => ({
  ...player,
  prizeWon: prizes[index] || 0
}));

// 🔥 SAVE RANK + PRIZE TO DB
for (const player of finalPlayers) {
  await Participant.findOneAndUpdate(
    { contestId: objectContestId, userId: player.userId },
    {
      $set: {
        rank: player.rank,
        prizeWon: player.prizeWon
      }
    }
  );
}

return finalPlayers;

      }
    }

    // 🔥 Save ranks even if prize pool is zero
for (const player of rankedPlayers) {
  await Participant.findOneAndUpdate(
    { contestId: objectContestId, userId: player.userId },
    {
      $set: {
        rank: player.rank,
        prizeWon: 0
      }
    }
  );
}

return rankedPlayers;

  } catch (error) {
    console.error("Get Leaderboard Error:", error);
    return [];
  }
};

/* =========================================
   3. GET USER RANK
========================================= */
exports.getUserRank = async (contestId, userId) => {
  try {
    // Check DB first for finalized rank
    const participant = await Participant.findOne({ contestId, userId });
    if (participant && participant.rank) return participant.rank;

    // Fallback to Redis for live rank
    const rank = await redis.zrevrank(getKey(contestId), userId);
    return rank !== null ? rank + 1 : null;
  } catch (error) {
    return null;
  }
};

/**
 * 🔥 NEW: SAVE USER SCORE & LOCK CONTEST
 * This method coordinates the leaderboard update and the contest completion lock.
 */
exports.saveUserScore = async ({ userId, contestId, score, accuracy, timeTaken }) => {
  try {
    // 1. Update the Participant record and Live Leaderboard (Redis)
    await this.updateLeaderboard(
      contestId,
      userId,
      score,
      timeTaken,
      accuracy,
      null // IO can be added if you want live score pops
    );

    // 2. 🔥 THE CRITICAL LOCK & SYNC:
    // Push user ID into the Contest's completedParticipants array.
    // Also increment the total matches for the user to unlock their withdrawals.
    await Contest.findByIdAndUpdate(
      contestId,
      { $addToSet: { completedParticipants: userId } }
    );

// 🔥 CONTROLLED XP + ELO SYSTEM

let xpGain = 10; // base XP per match

// accuracy bonus
if (accuracy >= 90) xpGain += 10;
else if (accuracy >= 70) xpGain += 5;

// speed bonus
if (timeTaken <= 30) xpGain += 5;

// 🔥 ELO gain should be small per match
let eloGain = 0;

if (score >= 90) eloGain = 25;
else if (score >= 70) eloGain = 18;
else if (score >= 50) eloGain = 10;
else eloGain = 5;

await User.findByIdAndUpdate(userId, {
  $inc: {
    totalMatches: 1,
    points: xpGain,   // XP
    rating: eloGain   // ELO
  }
});

    return { score, accuracy, timeTaken };
  } catch (error) {
    console.error("🔥 saveUserScore Failed:", error);
    throw error;
  }
};