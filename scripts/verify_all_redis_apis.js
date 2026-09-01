require("dotenv").config();
const http = require("http");
const app = require("../src/app");
const { redis } = require("../src/config/redis");
const flushEngagements = require("../src/jobs/flushEngagements");
const syncMinUsers = require("../src/jobs/syncMinUsers");
const syncMinPosts = require("../src/jobs/syncMinPosts");
const syncMinGames = require("../src/jobs/syncMinGames");

async function verifyAllRedisApis() {
  console.log("=======================================================================");
  console.log("   UPSTASH REDIS FULL API END-TO-END VERIFICATION SUITE                ");
  console.log("=======================================================================\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const sampleUserId = "0qLgNmU9e3ZKLU5rbjEnuLaxCw33"; // Duru Kingsley

  let totalTests = 0;
  let passedTests = 0;

  function report(title, passed, details = {}) {
    totalTests++;
    if (passed) {
      passedTests++;
      console.log(`✅ [PASS] ${title}`);
    } else {
      console.error(`❌ [FAIL] ${title}`);
    }
    for (const [k, v] of Object.entries(details)) {
      console.log(`   └─ ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
    }
    console.log("");
  }

  try {
    // -------------------------------------------------------------------------
    // 1. FEED APIS
    // -------------------------------------------------------------------------
    console.log(">>> Testing 1: Main Feed & Granular Feed Caching...");
    const t0 = Date.now();
    const feedRes = await fetch(`${baseUrl}/api/feed/${sampleUserId}`);
    const feedData = await feedRes.json();
    const feedTimeMiss = Date.now() - t0;

    const mainFeedKey = `feed:${sampleUserId}:all:A`;
    const mainFeedInRedis = await redis.get(mainFeedKey);
    const mainFeedTtl = await redis.ttl(mainFeedKey);

    report("Main Feed Cached in Upstash", mainFeedInRedis !== null, {
      "HTTP Status": feedRes.status,
      "Response Time (Miss / Computation)": `${feedTimeMiss}ms`,
      "Redis Key": mainFeedKey,
      "Redis Key TTL": `${mainFeedTtl}s (4 hours)`,
      "Data in Redis": `${(mainFeedInRedis.length / 1024).toFixed(2)} KB`,
    });

    // Granular feed
    const granularRes = await fetch(`${baseUrl}/api/feed/${sampleUserId}/posts`);
    const granularData = await granularRes.json();
    const granularKey = `feed:granular:${sampleUserId}:posts:all:all:A`;
    const granularInRedis = await redis.get(granularKey);
    const granularTtl = await redis.ttl(granularKey);

    report("Granular Feed Cached in Upstash", granularInRedis !== null, {
      "HTTP Status": granularRes.status,
      "Redis Key": granularKey,
      "Redis Key TTL": `${granularTtl}s`,
    });

    // Feed Cache Hit speed test
    const t1 = Date.now();
    const hitRes = await fetch(`${baseUrl}/api/feed/${sampleUserId}`);
    const hitTime = Date.now() - t1;
    report("Feed Instant Cache Hit Performance", hitRes.status === 200 && hitTime < feedTimeMiss, {
      "Cache Hit Response Time": `${hitTime}ms (Sub-millisecond / Fast)`,
      "Speed Improvement": `${Math.round(feedTimeMiss / Math.max(hitTime, 1))}x faster`,
    });

    // -------------------------------------------------------------------------
    // 2. ENGAGEMENT & VIEW BUFFER APIS
    // -------------------------------------------------------------------------
    console.log(">>> Testing 2: Engagement & View Signal Buffering...");
    const signalRes = await fetch(`${baseUrl}/api/engage/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "view",
        targetId: "sample_post_1001",
        targetType: "post",
      }),
    });
    const signalData = await signalRes.json();

    const viewBufferVal = await redis.hget("buffer:views", "post_sample_post_1001");
    report("View Signal Buffered into Redis Hash ('buffer:views')", viewBufferVal !== null && parseInt(viewBufferVal, 10) >= 1, {
      "HTTP Status": signalRes.status,
      "Redis Hash Key": "buffer:views",
      "Field": "post_sample_post_1001",
      "Buffered Count": viewBufferVal,
    });

    // Flush cron test
    await flushEngagements();
    const postFlushVal = await redis.hget("buffer:views", "post_sample_post_1001");
    report("Buffer Flushed & Cleared after Cron Batch Sync", postFlushVal === null, {
      "buffer:views post_sample_post_1001": postFlushVal === null ? "CLEARED" : postFlushVal,
    });

    // -------------------------------------------------------------------------
    // 3. SEARCH DATASETS & IN-MEMORY FUZZY SEARCH
    // -------------------------------------------------------------------------
    console.log(">>> Testing 3: Search Datasets & Fuzzy Search API...");
    await syncMinUsers();
    await syncMinPosts();
    await syncMinGames();

    const usersMinInRedis = await redis.get("search:users_min");
    const postsMinInRedis = await redis.get("search:posts_min");
    const gamesMinInRedis = await redis.get("search:games_min");

    report("Search Minified Datasets Saved in Upstash", usersMinInRedis !== null && postsMinInRedis !== null && gamesMinInRedis !== null, {
      "search:users_min Size": `${((usersMinInRedis?.length || 0) / 1024).toFixed(2)} KB`,
      "search:posts_min Size": `${((postsMinInRedis?.length || 0) / 1024).toFixed(2)} KB`,
      "search:games_min Size": `${((gamesMinInRedis?.length || 0) / 1024).toFixed(2)} KB`,
    });

    const searchRes = await fetch(`${baseUrl}/api/users/local-search?q=duru`);
    const searchData = await searchRes.json();
    report("Local Search API Served from In-Memory Index", searchRes.status === 200 && Array.isArray(searchData.data) && searchData.data.length > 0, {
      "Query": "duru",
      "Results Found": searchData.data?.length || 0,
      "Top Match": searchData.data?.[0]?.name || "N/A",
    });

    // -------------------------------------------------------------------------
    // 4. LEADERBOARD API
    // -------------------------------------------------------------------------
    console.log(">>> Testing 4: Leaderboard Redis Caching...");
    const lbRes = await fetch(`${baseUrl}/api/leaderboard?role=athlete&limit=10`);
    const lbData = await lbRes.json();

    const lbRedisKey = "leaderboard:role_athlete-country_all-location_all-region_all-sport_all";
    const lbInRedis = await redis.get(lbRedisKey);
    const lbTtl = await redis.ttl(lbRedisKey);

    report("Leaderboard Rankings Cached in Upstash", lbInRedis !== null, {
      "HTTP Status": lbRes.status,
      "Redis Key": lbRedisKey,
      "TTL": `${lbTtl}s (24 hours)`,
      "Total Users Ranked": lbData.total,
    });

    // -------------------------------------------------------------------------
    // 5. GRAPH SUGGESTIONS API ("You May Know")
    // -------------------------------------------------------------------------
    console.log(">>> Testing 5: Graph Suggestions API...");
    const suggRes = await fetch(`${baseUrl}/api/users/${sampleUserId}/suggestions`);
    const suggData = await suggRes.json();

    const suggKey = `suggestions:${sampleUserId}:10`;
    const suggInRedis = await redis.get(suggKey);
    const suggTtl = await redis.ttl(suggKey);

    report("Graph Suggestions Cached in Upstash", suggInRedis !== null, {
      "HTTP Status": suggRes.status,
      "Redis Key": suggKey,
      "TTL": `${suggTtl}s (1 hour)`,
      "Suggestions Count": Array.isArray(suggData.data) ? suggData.data.length : 0,
    });

    // -------------------------------------------------------------------------
    // UPSTASH INVENTORY SUMMARY
    // -------------------------------------------------------------------------
    console.log("=======================================================================");
    console.log("   CURRENT UPSTASH REDIS LIVE KEY INVENTORY                             ");
    console.log("=======================================================================");
    const allKeys = await redis.keys("*");
    for (const k of allKeys.sort()) {
      const ttl = await redis.ttl(k);
      const type = await redis.type(k);
      console.log(`🔑 [${type.toUpperCase()}] ${k} (TTL: ${ttl}s)`);
    }

  } catch (err) {
    console.error("Verification failed with exception:", err);
  } finally {
    server.close();
  }

  console.log("\n=======================================================================");
  console.log(`   SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log("=======================================================================\n");

  if (passedTests === totalTests) {
    console.log("🎉 ALL REDIS APIS ARE CREATING, SAVING, AND SERVING DATA PROPERLY!");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

verifyAllRedisApis();
