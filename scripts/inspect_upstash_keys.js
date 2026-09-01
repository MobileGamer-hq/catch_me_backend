require("dotenv").config();
const { redis } = require("../src/config/redis");

async function checkAllRedisKeys() {
  const keys = await redis.keys("*");
  console.log("Total keys currently in Upstash:", keys.length);
  for (const k of keys.sort()) {
    const type = await redis.type(k);
    const ttl = await redis.ttl(k);
    console.log(`- [${type}] ${k} (TTL: ${ttl}s)`);
  }
  process.exit(0);
}

checkAllRedisKeys();
