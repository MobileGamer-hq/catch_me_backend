const app = require("./app");
const http = require("http");
const { db } = require("./config/firebase");

async function runVerification() {
  console.log("=================================================================");
  console.log("   CATCH ME BACKEND - COMPLETE API ROUTE VERIFICATION SUITE      ");
  console.log("=================================================================\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let passed = 0;
  let failed = 0;

  async function testRoute({ name, method, path, body = null, expectedHttp, expectedStatus, validator }) {
    const fullUrl = `${baseUrl}${path}`;
    const options = {
      method,
      headers: {},
    };

    if (body) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(fullUrl, options);
      const contentType = res.headers.get("content-type") || "";

      let data;
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else if (contentType.includes("application/pdf")) {
        const buf = await res.arrayBuffer();
        data = { isPdf: true, byteLength: buf.byteLength };
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { rawText: text };
        }
      }

      const errors = [];

      // Check HTTP Status
      if (Array.isArray(expectedHttp)) {
        if (!expectedHttp.includes(res.status)) {
          errors.push(`Expected HTTP status [${expectedHttp.join(",")}], got ${res.status}`);
        }
      } else if (res.status !== expectedHttp) {
        errors.push(`Expected HTTP status ${expectedHttp}, got ${res.status}`);
      }

      // Check Body status field
      if (expectedStatus && data.status !== expectedStatus) {
        errors.push(`Expected body status "${expectedStatus}", got "${data.status}"`);
      }

      // Custom validation
      if (validator) {
        const valRes = validator(data, res);
        if (valRes !== true) {
          errors.push(`Custom validation failed: ${valRes}`);
        }
      }

      if (errors.length === 0) {
        console.log(`✅ [PASS] ${method.padEnd(6)} ${path.padEnd(42)} -> HTTP ${res.status} | status: "${data.status || 'N/A'}"`);
        passed++;
      } else {
        console.error(`❌ [FAIL] ${method.padEnd(6)} ${path.padEnd(42)} -> ${errors.join(" | ")}`);
        console.error(`          Response:`, JSON.stringify(data));
        failed++;
      }
    } catch (err) {
      console.error(`❌ [ERROR] ${method.padEnd(6)} ${path.padEnd(42)} -> Fetch error: ${err.message}`);
      failed++;
    }
  }

  console.log("--- 1. SYSTEM & HEALTH CHECK ROUTES ---");
  await testRoute({
    name: "Root Info",
    method: "GET",
    path: "/",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => d.message === "Catch Me Backend" || "Invalid root message",
  });

  await testRoute({
    name: "Ping Health Check",
    method: "GET",
    path: "/ping",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => d.message === "Pong!" || "Invalid ping message",
  });

  await testRoute({
    name: "404 Catch-All",
    method: "GET",
    path: "/api/unknown-route-check",
    expectedHttp: 404,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Route not found" || "Invalid 404 message",
  });

  console.log("\n--- 2. USERS ROUTES (/api/users) ---");
  await testRoute({
    name: "Get All Users",
    method: "GET",
    path: "/api/users",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => Array.isArray(d.data) || "Expected data array",
  });

  await testRoute({
    name: "Local Fuzzy Search Users (Valid)",
    method: "GET",
    path: "/api/users/local-search?q=john",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => Array.isArray(d.data) || "Expected data array",
  });

  await testRoute({
    name: "Local Fuzzy Search Users (Missing query)",
    method: "GET",
    path: "/api/users/local-search",
    expectedHttp: 400,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Missing search query" || "Invalid error message",
  });

  await testRoute({
    name: "Search Users Prefix (Valid)",
    method: "GET",
    path: "/api/users/search?q=a",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => Array.isArray(d.data) || "Expected data array",
  });

  await testRoute({
    name: "Search Users Prefix (Missing query)",
    method: "GET",
    path: "/api/users/search",
    expectedHttp: 400,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Missing search query" || "Invalid error message",
  });

  await testRoute({
    name: "Get User Suggestions",
    method: "GET",
    path: "/api/users/sample_user_id/suggestions",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => Array.isArray(d.data) || "Expected data array",
  });

  await testRoute({
    name: "Get User by ID (Not Found)",
    method: "GET",
    path: "/api/users/nonexistent_user_9999",
    expectedHttp: 404,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "User not found" || "Invalid error message",
  });

  await testRoute({
    name: "Delete User (Not Found)",
    method: "DELETE",
    path: "/api/users/nonexistent_user_9999",
    expectedHttp: 404,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "User not found" || "Invalid error message",
  });

  console.log("\n--- 3. EVENTS ROUTES (/api/events) ---");
  await testRoute({
    name: "Get All Events",
    method: "GET",
    path: "/api/events",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => Array.isArray(d.data) || "Expected data array",
  });

  await testRoute({
    name: "Local Fuzzy Search Events (Valid)",
    method: "GET",
    path: "/api/events/local-search?q=basketball",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => Array.isArray(d.data) || "Expected data array",
  });

  await testRoute({
    name: "Local Fuzzy Search Events (Missing query)",
    method: "GET",
    path: "/api/events/local-search",
    expectedHttp: 400,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Missing search query" || "Invalid error message",
  });

  await testRoute({
    name: "Get Event by ID (Not Found)",
    method: "GET",
    path: "/api/events/nonexistent_event_9999",
    expectedHttp: 404,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Event not found" || "Invalid error message",
  });

  await testRoute({
    name: "Delete Event (Not Found)",
    method: "DELETE",
    path: "/api/events/nonexistent_event_9999",
    expectedHttp: 404,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Event not found" || "Invalid error message",
  });

  console.log("\n--- 4. GAMES ROUTES (/api/games) ---");
  await testRoute({
    name: "Get All Games",
    method: "GET",
    path: "/api/games",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => Array.isArray(d.data) || "Expected data array",
  });

  await testRoute({
    name: "Get Game by ID (Not Found)",
    method: "GET",
    path: "/api/games/nonexistent_game_9999",
    expectedHttp: 404,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Game not found" || "Invalid error message",
  });

  await testRoute({
    name: "Standardize Game (Not Found)",
    method: "POST",
    path: "/api/games/nonexistent_game_9999/standardize",
    expectedHttp: 404,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Game not found" || "Invalid error message",
  });

  await testRoute({
    name: "End Game (Not Found)",
    method: "POST",
    path: "/api/games/nonexistent_game_9999/end",
    expectedHttp: 404,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Game not found" || "Invalid error message",
  });

  await testRoute({
    name: "Export Game PDF Link",
    method: "POST",
    path: "/api/games/sample_game_123/export",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => typeof d.downloadUrl === "string" || "Expected downloadUrl",
  });

  await testRoute({
    name: "Download Game PDF (Not Found)",
    method: "GET",
    path: "/api/games/nonexistent_game_9999/download",
    expectedHttp: 404,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Game not found" || "Invalid error message",
  });

  await testRoute({
    name: "Create AI Summary (Not Found)",
    method: "POST",
    path: "/api/games/nonexistent_game_9999/summary",
    expectedHttp: 404,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Game not found" || "Invalid error message",
  });

  await testRoute({
    name: "Update AI Summary (Not Found)",
    method: "PUT",
    path: "/api/games/nonexistent_game_9999/summary",
    expectedHttp: 404,
    expectedStatus: "FAILED",
    validator: (d) => typeof d.error === "string" || "Invalid error message",
  });

  await testRoute({
    name: "Delete AI Summary",
    method: "DELETE",
    path: "/api/games/sample_game_123/summary",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => typeof d.message === "string" || "Expected message",
  });

  console.log("\n--- 5. FEED ROUTES (/api/feed) ---");
  await testRoute({
    name: "Get User Feed (Not Found User Error)",
    method: "GET",
    path: "/api/feed/nonexistent_user_9999",
    expectedHttp: 500,
    expectedStatus: "FAILED",
    validator: (d) => typeof d.error === "string" || "Expected error",
  });

  await testRoute({
    name: "Get Granular Feed (Posts)",
    method: "GET",
    path: "/api/feed/nonexistent_user_9999/posts",
    expectedHttp: 500,
    expectedStatus: "FAILED",
    validator: (d) => typeof d.error === "string" || "Expected error",
  });

  await testRoute({
    name: "Get Granular Feed (Games)",
    method: "GET",
    path: "/api/feed/nonexistent_user_9999/games",
    expectedHttp: 500,
    expectedStatus: "FAILED",
    validator: (d) => typeof d.error === "string" || "Expected error",
  });

  await testRoute({
    name: "Get Granular Feed (Popular)",
    method: "GET",
    path: "/api/feed/nonexistent_user_9999/popular",
    expectedHttp: 500,
    expectedStatus: "FAILED",
    validator: (d) => typeof d.error === "string" || "Expected error",
  });

  console.log("\n--- 6. POSTS ROUTES (/api/posts) ---");
  await testRoute({
    name: "Local Fuzzy Search Posts (Valid)",
    method: "GET",
    path: "/api/posts/local-search?q=highlight",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => Array.isArray(d.data) || "Expected data array",
  });

  await testRoute({
    name: "Local Fuzzy Search Posts (Missing query)",
    method: "GET",
    path: "/api/posts/local-search",
    expectedHttp: 400,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Missing search query" || "Invalid error message",
  });

  await testRoute({
    name: "Delete Post (Not Found)",
    method: "DELETE",
    path: "/api/posts/nonexistent_post_9999",
    expectedHttp: 404,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Post not found" || "Invalid error message",
  });

  console.log("\n--- 7. ENGAGEMENT ROUTES (/api/engage) ---");
  await testRoute({
    name: "Record Engagement Signal (Missing Fields)",
    method: "POST",
    path: "/api/engage/signal",
    body: {},
    expectedHttp: 400,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Missing required fields" || "Invalid error message",
  });

  console.log("\n--- 8. LEADERBOARD ROUTES (/api/leaderboard) ---");
  await testRoute({
    name: "Get Leaderboard (Default)",
    method: "GET",
    path: "/api/leaderboard",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => Array.isArray(d.data) || "Expected data array",
  });

  await testRoute({
    name: "Get Leaderboard (Filtered)",
    method: "GET",
    path: "/api/leaderboard?role=athlete&limit=5",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => Array.isArray(d.data) && d.limit === 5 || "Expected filtered data with limit 5",
  });

  console.log("\n--- 9. NOTIFICATIONS ROUTES (/api/notifications) ---");
  await testRoute({
    name: "Send Notification (Missing recipient)",
    method: "POST",
    path: "/api/notifications/send",
    body: {},
    expectedHttp: 400,
    expectedStatus: "FAILED",
    validator: (d) => typeof d.message === "string" || "Expected error message",
  });

  await testRoute({
    name: "Send Notification to All",
    method: "POST",
    path: "/api/notifications/send-all",
    body: {
      notification: {
        title: "Test Broadcast",
        body: "Test Body",
      },
    },
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => typeof d.message === "string" || "Invalid broadcast message",
  });

  console.log("\n--- 10. SEARCH ROUTES (/api/search) ---");
  await testRoute({
    name: "Global Search (Valid query)",
    method: "GET",
    path: "/api/search?q=football",
    expectedHttp: 200,
    expectedStatus: "SUCCESS",
    validator: (d) => Array.isArray(d.users) && Array.isArray(d.teams) && Array.isArray(d.hashtags) || "Expected users, teams, hashtags",
  });

  await testRoute({
    name: "Global Search (Missing query)",
    method: "GET",
    path: "/api/search",
    expectedHttp: 400,
    expectedStatus: "FAILED",
    validator: (d) => d.error === "Missing search query" || "Invalid error message",
  });

  server.close();

  console.log("\n=================================================================");
  console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=================================================================\n");

  if (failed > 0) {
    console.error(`💥 Verification finished with ${failed} failure(s).`);
    process.exit(1);
  } else {
    console.log("🎉 ALL ROUTES PASSED VERIFICATION WITH VALID RESPONSES & STATUSES!");
    process.exit(0);
  }
}

runVerification();
