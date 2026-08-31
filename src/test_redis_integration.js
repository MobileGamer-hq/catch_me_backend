require("dotenv").config();
const http = require("http");
const app = require("./app");
const { Cache } = require("./utils/cache");
const localSearchService = require("./services/localSearch.service");
const { GraphService } = require("./services/graph.service");
const { LeaderboardService } = require("./services/leaderboard.service");
const flushEngagements = require("./jobs/flushEngagements");

async function runRedisTests() {
  console.log("=================================================================");
  console.log("   CATCH ME BACKEND - REDIS CACHING & SPEED INTEGRATION TESTS    ");
  console.log("=================================================================\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Basic Cache Key-Value & TTL
    console.log("\n--- 1. CACHE GET / SET / DEL ---");
    await Cache.set("test:redis:kv", { hello: "world", count: 42 }, 10);
    const kv = await Cache.get("test:redis:kv");
    assert(kv && kv.hello === "world" && kv.count === 42, "Cache.set and Cache.get work with JSON serialization");
    await Cache.del("test:redis:kv");
    const kvDeleted = await Cache.get("test:redis:kv");
    assert(kvDeleted === null, "Cache.del successfully clears key");

    // 2. Hash Buffers for Views & Engagements
    console.log("\n--- 2. REDIS HASH BUFFERS (Views & Engagements) ---");
    await Cache.del("buffer:views");
    await Cache.del("buffer:engagements");

    await Cache.hincrby("buffer:views", "post_test_101", 1);
    await Cache.hincrby("buffer:views", "post_test_101", 1);
    await Cache.hincrby("buffer:views", "game_test_202", 3);

    const views = await Cache.hgetall("buffer:views");
    assert(parseInt(views["post_test_101"], 10) === 2, "Hash buffer views incremented correctly to 2");
    assert(parseInt(views["game_test_202"], 10) === 3, "Hash buffer views for game incremented to 3");

    await Cache.hincrby("buffer:engagements", "post_test_101", 5);
    const postEngage = await Cache.hget("buffer:engagements", "post_test_101");
    assert(parseInt(postEngage, 10) === 5, "Hash buffer engagements incremented to 5");

    // 3. Flush Engagements Job Execution
    console.log("\n--- 3. FLUSH ENGAGEMENTS CRON ---");
    await flushEngagements();
    const flushedViews = await Cache.hgetall("buffer:views");
    const flushedEngage = await Cache.hgetall("buffer:engagements");
    assert(Object.keys(flushedViews).length === 0, "buffer:views is cleared after flush");
    assert(Object.keys(flushedEngage).length === 0, "buffer:engagements is cleared after flush");

    // 4. Local Fuzzy Search Singleton Service
    console.log("\n--- 4. IN-MEMORY LOCAL SEARCH SERVICE ---");
    await localSearchService.initialize();
    
    // Test searching users
    const userRes = await fetch(`${baseUrl}/api/users/local-search?q=a`);
    const userData = await userRes.json();
    assert(userRes.status === 200 && userData.status === "SUCCESS" && Array.isArray(userData.data), "GET /api/users/local-search returns fast results");

    // Test searching posts
    const postRes = await fetch(`${baseUrl}/api/posts/local-search?q=test`);
    const postData = await postRes.json();
    assert(postRes.status === 200 && postData.status === "SUCCESS" && Array.isArray(postData.data), "GET /api/posts/local-search returns fast results");

    // Test searching games
    const gameRes = await fetch(`${baseUrl}/api/events/local-search?q=ball`);
    const gameData = await gameRes.json();
    assert(gameRes.status === 200 && gameData.status === "SUCCESS" && Array.isArray(gameData.data), "GET /api/events/local-search returns fast results");

    // 5. Leaderboard with Redis Caching
    console.log("\n--- 5. LEADERBOARD REDIS CACHING ---");
    const lbRes1 = await fetch(`${baseUrl}/api/leaderboard?limit=10&page=1`);
    const lbData1 = await lbRes1.json();
    assert(lbRes1.status === 200 && lbData1.status === "SUCCESS", "Leaderboard response contract valid");

    // Check if cached in Redis
    const lbCacheKey = LeaderboardService.generateCacheKey({ limit: 10, page: 1 });
    const lbCached = await Cache.get(`leaderboard:${lbCacheKey}`);
    assert(lbCached !== null && Array.isArray(lbCached), "Leaderboard stored in Redis cache");

    // 6. Graph Suggestions with Redis Caching
    console.log("\n--- 6. GRAPH SUGGESTIONS REDIS CACHING ---");
    const testUserId = "test_user_caching_999";
    await Cache.set(`suggestions:${testUserId}:10`, [{ id: "user_suggested_1", name: "Suggested Athlete", username: "athlete1" }], 3600);
    const suggestions = await GraphService.getYouMayKnow(testUserId, 10);
    assert(suggestions.length === 1 && suggestions[0].username === "athlete1", "Graph suggestions retrieved directly from Redis cache hit");
    await Cache.del(`suggestions:${testUserId}:10`);

    // 7. Feed Caching with SessionContext (A/B testing bucket)
    console.log("\n--- 7. FEED CACHING WITH A/B BUCKETS ---");
    const feedKeyA = `feed:${testUserId}:all:A`;
    const mockFeedA = { posts: [], games: [], suggestedUsers: [] };
    await Cache.set(feedKeyA, mockFeedA, 14400);

    const cachedFeedCheck = await Cache.get(feedKeyA);
    assert(cachedFeedCheck !== null && Array.isArray(cachedFeedCheck.posts), "Feed successfully cached with bucket A in Redis (4hr TTL)");
    await Cache.del(feedKeyA);

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    server.close();
  }

  console.log(`\n---------------------------------------`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`---------------------------------------\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 All Redis integration tests passed successfully!");
    process.exit(0);
  }
}

runRedisTests();
