module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join a specific contest room
    socket.on("join_contest", (contestId) => {
      socket.join(`contest_${contestId}`);
    });

    // Admin triggers the start of a quiz
    socket.on("start_quiz", async (data) => {
      const { contestId, questions } = data;
      
      let currentQuestionIndex = 0;
      
      const interval = setInterval(() => {
        if (currentQuestionIndex >= questions.length) {
          io.to(`contest_${contestId}`).emit("quiz_ended");
          clearInterval(interval);
          return;
        }

        io.to(`contest_${contestId}`).emit("new_question", {
          question: questions[currentQuestionIndex],
          timeLeft: 15 // 15 seconds per question
        });

        currentQuestionIndex++;
      }, 18000); // 15s for question + 3s buffer
    });
  });
};