const { Server } = require("socket.io");
const quizHandler = require("./quiz.handler");
const matchSocket = require("./match.socket");

let io;

/**
 * Initializes the Socket.io instance and attaches it to the HTTP server.
 */
const initSocket = (server) => {

  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://battle.meloapp.in",
        "https://melobattle-frontend.vercel.app"
      ],
      methods: ["GET", "POST"],
      credentials: true
    },

    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6
  });

  io.on("connection", (socket) => {

    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;

    if (userId) {
      socket.join(userId);
      socket.data.userId = userId;
      console.log(`🚀 User Connected: ${userId} | Socket: ${socket.id}`);
    } else {
      console.log(`🚀 Guest Connected: ${socket.id}`);
    }

    // Register modular socket handlers
    quizHandler(io, socket);
    matchSocket(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(`❌ User Disconnected (${socket.id}): ${reason}`);
    });

    socket.on("error", (err) => {
      console.error(`Socket Error (${socket.id}):`, err);
    });

  });

  console.log("✅ Socket.io Server Initialized with Elite CORS Policy");

  return io;
};

/**
 * Provides access to the global 'io' instance.
 */
const getIO = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized. Please call initSocket(server) first.");
  }
  return io;
};

module.exports = { initSocket, getIO };