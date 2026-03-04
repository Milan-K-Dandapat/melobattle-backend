const Redis = require("ioredis");

// This line checks if REDIS_URL exists (on Render). 
// If not, it falls back to your local computer settings.
const redis = new Redis(process.env.REDIS_URL || {
  host: "127.0.0.1",
  port: 6379
});

redis.on("connect", () => {
  console.log("Redis Connected 🚀");
});

redis.on("error", (err) => {
  console.error("Redis Error:", err);
});

module.exports = redis;