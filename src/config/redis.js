const Redis = require("ioredis");

let redis;

if (process.env.REDIS_URL) {
  // Production (Render)
  redis = new Redis(process.env.REDIS_URL, {
    tls: {},
    maxRetriesPerRequest: null
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