require("dotenv").config();
const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "rediss://default:gQAAAAAAA0vuAAIgcDI4OTE0MjU0YmQ3N2Y0ODBiOTc5NWVjZjVmYmEyMGU3Ng@capital-louse-216046.upstash.io:6379";

console.log("Connecting to:", redisUrl.replace(/:[^:@]+@/, ":****@"));

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return 1000;
  }
});

async function test() {
  try {
    await redis.set("test_connectivity", "hello_upstash_ok", "EX", 60);
    const val = await redis.get("test_connectivity");
    console.log("Redis response:", val);
    await redis.quit();
    console.log("Connection verified successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Redis connection error:", err.message);
    process.exit(1);
  }
}

test();
