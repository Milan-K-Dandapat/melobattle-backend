module.exports = (io, socket) => {

  console.log("Quiz socket initialized:", socket.id);

// Join contest room (for quiz + leaderboard updates)
socket.on("JOIN_CONTEST_ROOM", (contestId) => {

  socket.join(`contest_${contestId}`);

  console.log(`User ${socket.id} joined contest room contest_${contestId}`);

});
  // Start quiz
  socket.on("start_quiz", async (data) => {

    const { contestId, questions } = data;

    if (!contestId || !questions) return;

    let currentQuestionIndex = 0;

    const interval = setInterval(() => {

      if (currentQuestionIndex >= questions.length) {

        io.to(`contest_${contestId}`).emit("quiz_ended");

        clearInterval(interval);

        return;

      }

      io.to(`contest_${contestId}`).emit("new_question", {
        question: questions[currentQuestionIndex],
        timeLeft: 15
      });

      currentQuestionIndex++;

    }, 18000);

  });

};