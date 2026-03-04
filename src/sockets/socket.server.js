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
      // 🔥 THE CRITICAL FIX: Explicitly allow the frontend URL
      // Wildcard "*" is NOT allowed when credentials are true
      origin: "http://localhost:5173", 
      methods: ["GET", "POST"],
      credentials: true
    },
    // Production settings for high concurrency
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on("connection", (socket) => {
    // 🔥 Identify the user connecting to join their personal room
    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.join(userId);
      console.log(`🚀 New Connection: ${socket.id} | User ID: ${userId}`);
    } else {
      console.log(`🚀 New Guest Connection: ${socket.id}`);
    }

    // Register Modular Handlers
    quizHandler(io, socket);
    matchSocket(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(`❌ User Disconnected (${socket.id}): ${reason}`);
    });

    // Error handling for individual sockets
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