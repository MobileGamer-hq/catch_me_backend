require("dotenv").config();
const { redis } = require("../src/config/redis");
const { Cache } = require("../src/utils/cache");

async function testUserCacheWrite() {
  console.log("Writing user profile directly using Cache.set...");

  const sampleUser = {
    id: "0qLgNmU9e3ZKLU5rbjEnuLaxCw33",
    name: "Duru Kingsley",
    username: "durukn",
    role: "Athlete",
  };

  await Cache.set(`user:profile:${sampleUser.id}`, sampleUser, 3600);
  console.log("Successfully called Cache.set for user:profile:0qLgNmU9e3ZKLU5rbjEnuLaxCw33");

  const keys = await redis.keys("user:*");
  console.log("Keys in Upstash matching 'user:*':", keys);

  const data = await redis.get(`user:profile:${sampleUser.id}`);
  console.log("Raw data in Upstash:", data);

  const ttl = await redis.ttl(`user:profile:${sampleUser.id}`);
  console.log("TTL in Upstash:", ttl, "seconds");

  process.exit(0);
}

testUserCacheWrite();
