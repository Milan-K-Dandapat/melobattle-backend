const Participant = require("./participant.model");
const redis = require("../../config/redis");

const getFinalKey = (contestId) => `contest:${contestId}:leaderboard:final`;

exports.generateFinalRanking = async (contestId) => {
  const finalKey = getFinalKey(contestId);
  
  // 1. Get all user IDs from Redis in ranked order
  const rankedUserIds = await redis.zrevrange(finalKey, 0, -1);
  
  const rankingList = [];

  for (let i = 0; i < rankedUserIds.length; i++) {
    const userId = rankedUserIds[i];
    const rank = i + 1;

    // 2. Update the Participant record in MongoDB with the final rank
    const participant = await Participant.findOneAndUpdate(
      { contestId, userId },
      { rank: rank },
      { new: true }
    );

    if (participant) {
      rankingList.push({
        userId,
        rank,
        score: participant.score,
        prizeWon: 0 // Will be updated by prize engine
      });
    }
  }

  return rankingList;
};