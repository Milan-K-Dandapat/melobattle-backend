const leaderboardService = require("../modules/contest/leaderboard.service");
const antiCheat = require("../modules/contest/antiCheat.engine");

module.exports = (io, socket) => {
  // Handle user submitting an answer
  socket.on("submit_answer", async (data) => {
    try {
      const { contestId, userId, score, completionTime, accuracy } = data;

      // 1. Run quick anti-cheat check
      await antiCheat.evaluatePlayer(userId, score, completionTime, accuracy);

      // 2. Update Redis Leaderboard
      await leaderboardService.updateLeaderboard(
        contestId,
        userId,
        score,
        completionTime,
        accuracy,
        io // Pass io to emit live updates
      );

      // 3. Acknowledge receipt
      socket.emit("answer_received", { success: true });
      
    } catch (error) {
      console.error("Submit Answer Error:", error.message);
      socket.emit("error", { message: "Failed to submit answer" });
    }
  });
};