const mongoose = require("mongoose");

/**
 * 🔥 ARENA DATABASE SYNC
 * Optimized for MongoDB Atlas to prevent "Buffering Timed Out" and "Connection Closed" errors.
 */
const connectDB = async () => {
  try {
    // Check if URI exists to prevent early crash
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from the .env matrix.");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      /**
       * 🔥 CRITICAL SYNC OPTIONS:
       * These ensure the connection stays alive during heavy battle transitions.
       */
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,         // Close sockets after 45s of inactivity
      heartbeatFrequencyMS: 10000,    // Check connection every 10s
    });

    console.log(`
    ✅ MONGODB ATLAS SYNCED
    📡 Host: ${conn.connection.host}
    🛡️ Database: ${conn.connection.name}
    ✨ Ready for Battle deployment.
    `);

    return conn;
  } catch (error) {
    console.error("🔥 DATABASE CRITICAL FAILURE:", error.message);
    
    /**
     * 🔥 AUTO-RECONNECT PROTOCOL:
     * Instead of process.exit(1), we retry after 5 seconds to keep the battle server alive.
     */
    console.log("🔄 Attempting to re-establish Neural Link to Database in 5s...");
    setTimeout(connectDB, 5000);
  }
};

// --- MATRIX STATUS MONITORING ---
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Lost connection to Database Matrix. Attempting recovery...');
});

mongoose.connection.on('error', (err) => {
  console.error('🔥 Matrix Runtime Error:', err.message);
});

module.exports = connectDB;