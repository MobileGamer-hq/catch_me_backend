require("dotenv").config();
const http = require("http");
const app = require("../src/app");
const { redis } = require("../src/config/redis");

async function testSingleUserAndBatch() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const userId = "0qLgNmU9e3ZKLU5rbjEnuLaxCw33"; // Duru Kingsley

  console.log("1. Calling GET /api/users/:id for userId:", userId);
  const getRes = await fetch(`${baseUrl}/api/users/${userId}`);
  const getData = await getRes.json();
  console.log("GET status:", getRes.status, "User name:", getData.name);

  console.log("2. Calling POST /api/users/batch for userId:", userId);
  const batchRes = await fetch(`${baseUrl}/api/users/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [userId] }),
  });
  const batchData = await batchRes.json();
  console.log("BATCH status:", batchRes.status, "Count:", batchData.count);

  console.log("3. Inspecting Upstash Redis keys matching user:* and users:* ...");
  const userKeys = await redis.keys("user*");
  console.log("Found keys in Upstash matching 'user*':", userKeys);
  for (const k of userKeys) {
    const ttl = await redis.ttl(k);
    console.log(`- ${k} (TTL: ${ttl}s)`);
  }

  const allKeys = await redis.keys("*");
  console.log("ALL keys in Upstash right now:", allKeys);

  server.close();
  process.exit(0);
}

testSingleUserAndBatch();
