module.exports = (io, socket) => {
  socket.on("enter_lobby", (contestId) => {
    socket.join(`lobby_${contestId}`);
    
    // Broadcast to others in lobby that a new player is here
    socket.to(`lobby_${contestId}`).emit("player_joined_lobby", {
      userId: socket.id // Or actual user name from auth
    });
  });

  socket.on("leave_lobby", (contestId) => {
    socket.leave(`lobby_${contestId}`);
  });
};