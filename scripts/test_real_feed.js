require("dotenv").config();
const http = require("http");
const app = require("../src/app");
const { redis } = require("../src/config/redis");

async function testRealUserFeed() {
  const userId = "0qLgNmU9e3ZKLU5rbjEnuLaxCw33"; // Duru Kingsley
  console.log("Starting test with user ID:", userId);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const url = `${baseUrl}/api/feed/${userId}`;
  console.log("Fetching:", url);

  const res = await fetch(url);
  const data = await res.json();
  console.log("Response status HTTP:", res.status);
  console.log("Response body status field:", data.status);
  console.log("Feed items count:", {
    posts: data.posts ? Object.keys(data.posts) : 0,
    games: data.games ? data.games.length : 0,
  });

  // Check Redis keys
  console.log("Checking Redis keys in Upstash matching feed:* ...");
  const keys = await redis.keys("feed:*");
  console.log("Found Redis feed keys in Upstash:", keys);

  for (const k of keys) {
    const ttl = await redis.ttl(k);
    console.log(`Key: ${k}, TTL: ${ttl}s`);
  }

  server.close();
  // Don't delete the key so user can see it in console!
  process.exit(0);
}

testRealUserFeed();
