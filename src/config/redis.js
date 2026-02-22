const Redis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redis = null;
let isRedisAvailable = false;

try {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn(
          "⚠️ Redis connection failed. Switching to in-memory fallback.",
        );
        return null; // Stop retrying
      }
      return Math.min(times * 50, 2000);
    },
  });

  redis.on("connect", () => {
    console.log("✅ Redis connected");
    isRedisAvailable = true;
  });

  redis.on("error", (err) => {
    // Suppress initial connection errors to avoid console spam if Redis isn't running
    if (isRedisAvailable) {
      console.error("Redis Error:", err.message);
    }
    isRedisAvailable = false;
  });
} catch (error) {
  console.warn("⚠️ Could not initialize Redis client:", error.message);
}

module.exports = {
  redis,
  isRedisAvailable: () => isRedisAvailable,
};
