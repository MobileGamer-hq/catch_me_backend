const Redis = require("ioredis");

let redisUrl = process.env.REDIS_URL;

if (!redisUrl && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const host = process.env.UPSTASH_REDIS_REST_URL.replace(/^https?:\/\//, "");
  redisUrl = `rediss://default:${process.env.UPSTASH_REDIS_REST_TOKEN}@${host}:6379`;
}

if (!redisUrl) {
  redisUrl = "redis://localhost:6379";
}

let redis = null;
let isRedisAvailable = false;

try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    retryStrategy: (times) => {
      if (times > 5) {
        console.warn("⚠️ Redis connection failed after 5 retries. Switching to in-memory fallback.");
        return null; // Stop retrying
      }
      return Math.min(times * 100, 3000);
    },
  });

  redis.on("connect", () => {
    console.log("✅ Redis connected successfully");
    isRedisAvailable = true;
  });

  redis.on("ready", () => {
    isRedisAvailable = true;
  });

  redis.on("close", () => {
    isRedisAvailable = false;
  });

  redis.on("reconnecting", () => {
    console.log("🔄 Redis reconnecting...");
  });

  redis.on("error", (err) => {
    if (isRedisAvailable) {
      console.warn("⚠️ Redis Error:", err.message);
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
