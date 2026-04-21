module.exports = (io, socket) => {

  // 🔥 USER JOINS BATTLE
  socket.on("join_battle", ({ contestId, userId }) => {
    if (!contestId) return;

    socket.join(contestId.toString());

    console.log(`⚔️ ${userId} joined battle room: ${contestId}`);

    socket.to(contestId).emit("opponent_joined", {
      userId,
      status: "Joined"
    });
  });


  // 🔥 TYPING STATUS
  socket.on("typing", ({ contestId, status }) => {
    socket.to(contestId).emit("opponent_status", {
      status
    });
  });


  // 🔥 PROGRESS UPDATE
  socket.on("progress_update", ({ contestId, progress }) => {
    socket.to(contestId).emit("opponent_progress", {
      progress
    });
  });


  // 🔥 SUBMIT EVENT
  socket.on("submit_code", ({ contestId }) => {
    socket.to(contestId).emit("opponent_submitted");
  });

};