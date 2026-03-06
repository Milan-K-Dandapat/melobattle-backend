const leaderboardService = require("../modules/contest/leaderboard.service");
const antiCheat = require("../modules/contest/antiCheat.engine");

module.exports = (io, socket) => {

  // Prevent duplicate listeners on reconnect
  socket.removeAllListeners("submit_answer");

  socket.on("submit_answer", async (data) => {
    try {

      const { contestId, userId, score, completionTime, accuracy } = data;

      if (!contestId || !userId) return;

      // 1️⃣ Anti-Cheat Check
      await antiCheat.evaluatePlayer(userId, score, completionTime, accuracy);

      // 2️⃣ Update Leaderboard
      await leaderboardService.updateLeaderboard(
        contestId,
        userId,
        score,
        completionTime,
        accuracy,
        io
      );

      // 3️⃣ Acknowledge
      socket.emit("answer_received", { success: true });

    } catch (error) {

      console.error("Submit Answer Error:", error.message);

      socket.emit("error", {
        message: "Failed to submit answer"
      });

    }
  });

};