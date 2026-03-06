const Redis = require("ioredis");

let redis;

if (process.env.REDIS_URL) {
  // Production (Render - Internal)
  redis = new Redis(process.env.REDIS_URL, {
    // 🚨 FIX: Removed tls: {} because your URL is redis:// (not rediss://)
    connectTimeout: 10000, 
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });
} else {
  // Local development
  redis = new Redis({
    host: "127.0.0.1",
    port: 6379
  });
}

redis.on("connect", () => {
  console.log("✅ Redis Connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

module.exports = redis;