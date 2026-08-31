const app = require("../src/app");
const http = require("http");
const fs = require("fs");
const path = require("path");

async function runAllEndpointTests() {
  console.log("🚀 Starting comprehensive endpoint execution test...\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const results = [];

  // Helper to execute request with timeout
  async function callApi(testName, category, method, endpointPath, body = null, headers = {}) {
    const fullUrl = `${baseUrl}${endpointPath}`;
    const reqHeaders = { ...headers };
    if (body && typeof body === "object" && !(body instanceof Buffer)) {
      reqHeaders["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const fetchOptions = {
      method,
      headers: reqHeaders,
      signal: controller.signal,
    };

    if (body) {
      fetchOptions.body = typeof body === "object" ? JSON.stringify(body) : body;
    }

    const startTime = Date.now();
    try {
      const res = await fetch(fullUrl, fetchOptions);
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      const contentType = res.headers.get("content-type") || "";

      let responseBody;
      if (contentType.includes("application/json")) {
        responseBody = await res.json();
      } else if (contentType.includes("application/pdf")) {
        const buffer = await res.arrayBuffer();
        responseBody = `[Binary PDF Buffer: ${buffer.byteLength} bytes]`;
      } else {
        responseBody = await res.text();
      }

      const result = {
        testName,
        category,
        request: {
          method,
          url: endpointPath,
          headers: reqHeaders,
          body: body || null,
        },
        response: {
          statusCode: res.status,
          statusText: res.statusText,
          contentType,
          durationMs,
          body: responseBody,
        },
      };

      results.push(result);
      console.log(`[${res.status}] ${method} ${endpointPath} (${durationMs}ms) - Status: ${responseBody?.status || "N/A"}`);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      const result = {
        testName,
        category,
        request: {
          method,
          url: endpointPath,
          headers: reqHeaders,
          body: body || null,
        },
        response: {
          statusCode: 0,
          statusText: err.name === "AbortError" ? "TIMEOUT" : "FETCH_ERROR",
          error: err.message,
          durationMs,
        },
      };
      results.push(result);
      console.error(`[ERROR] ${method} ${endpointPath}:`, err.message);
      return result;
    }
  }

  // --- 1. System & Health Endpoints ---
  await callApi("Root Service Info", "System", "GET", "/");
  await callApi("Ping Health Check", "System", "GET", "/ping");
  await callApi("404 Route Not Found Catch-All", "System", "GET", "/api/nonexistent-route-xyz");

  // --- 2. User Management Endpoints ---
  await callApi("Get All Users", "Users", "GET", "/api/users");
  await callApi("Get User by ID (Not Found / Sample)", "Users", "GET", "/api/users/user_sample_123");
  await callApi("Search Users Prefix (Valid Query)", "Users", "GET", "/api/users/search?q=alex");
  await callApi("Search Users Prefix (Missing Query)", "Users", "GET", "/api/users/search");
  await callApi("Local Fuzzy Search Users (Valid Query)", "Users", "GET", "/api/users/local-search?q=john");
  await callApi("Local Fuzzy Search Users (Missing Query)", "Users", "GET", "/api/users/local-search");
  await callApi("Get User Suggestions", "Users", "GET", "/api/users/user_sample_123/suggestions");
  await callApi("Delete User", "Users", "DELETE", "/api/users/user_sample_123");

  // --- 3. Events Management Endpoints ---
  await callApi("Get All Events", "Events", "GET", "/api/events");
  await callApi("Get Event by ID", "Events", "GET", "/api/events/event_sample_123");
  await callApi("Get Events by Type (e.g. game)", "Events", "GET", "/api/events/game");
  await callApi("Local Fuzzy Search Events (Valid Query)", "Events", "GET", "/api/events/local-search?q=basketball");
  await callApi("Local Fuzzy Search Events (Missing Query)", "Events", "GET", "/api/events/local-search");
  await callApi("Delete Event", "Events", "DELETE", "/api/events/event_sample_123");

  // --- 4. Games & Match Engine Endpoints ---
  await callApi("Get All Games", "Games", "GET", "/api/games");
  await callApi("Get Game by ID", "Games", "GET", "/api/games/game_sample_123");
  await callApi("Standardize Game Data", "Games", "POST", "/api/games/game_sample_123/standardize");
  await callApi("End Game", "Games", "POST", "/api/games/game_sample_123/end");
  await callApi("Export Game PDF Link", "Games", "POST", "/api/games/game_sample_123/export");
  await callApi("Download Game PDF", "Games", "GET", "/api/games/game_sample_123/download");
  await callApi("Create Game Summary (AI / RTDB)", "Games", "POST", "/api/games/game_sample_123/summary");
  await callApi("Update Game Summary", "Games", "PUT", "/api/games/game_sample_123/summary");
  await callApi("Delete Game Summary", "Games", "DELETE", "/api/games/game_sample_123/summary");

  // --- 5. Feed System Endpoints ---
  await callApi("Get User Feed", "Feed", "GET", "/api/feed/user_sample_123");
  await callApi("Get Granular Feed (Posts)", "Feed", "GET", "/api/feed/user_sample_123/posts");
  await callApi("Get Granular Feed (Games)", "Feed", "GET", "/api/feed/user_sample_123/games");
  await callApi("Get Granular Feed (Popular)", "Feed", "GET", "/api/feed/user_sample_123/popular");

  // --- 6. Posts Management Endpoints ---
  await callApi("Local Fuzzy Search Posts (Valid Query)", "Posts", "GET", "/api/posts/local-search?q=highlight");
  await callApi("Local Fuzzy Search Posts (Missing Query)", "Posts", "GET", "/api/posts/local-search");
  await callApi("Get Post Feed by ID", "Posts", "GET", "/api/posts/user_sample_123");
  await callApi("Delete Post", "Posts", "DELETE", "/api/posts/post_sample_123");

  // --- 7. Engagement Tracking Endpoints ---
  await callApi("Record Engagement Signal (Valid)", "Engagement", "POST", "/api/engage/signal", {
    type: "click",
    targetId: "post_sample_123",
    targetType: "post",
  });
  await callApi("Record Engagement Signal (Missing Fields)", "Engagement", "POST", "/api/engage/signal", {});

  // --- 8. Leaderboard Endpoints ---
  await callApi("Get Leaderboard (Default)", "Leaderboard", "GET", "/api/leaderboard");
  await callApi("Get Leaderboard (Filtered by Role)", "Leaderboard", "GET", "/api/leaderboard?role=athlete&limit=5");

  // --- 9. Notifications Endpoints ---
  await callApi("Send Notification (Missing Recipient)", "Notifications", "POST", "/api/notifications/send", {});
  await callApi("Send Notification (Invalid Token Error)", "Notifications", "POST", "/api/notifications/send", {
    token: "mock_invalid_fcm_token",
    notification: {
      title: "Test Notification",
      body: "Test notification body message",
    },
  });
  await callApi("Send Notification to All", "Notifications", "POST", "/api/notifications/send-all", {
    notification: {
      title: "Broadcast Title",
      body: "Broadcast notification body",
    },
  });

  // --- 10. Global Search Endpoints ---
  await callApi("Global Search (Valid Query)", "Search", "GET", "/api/search?q=football");
  await callApi("Global Search (Missing Query)", "Search", "GET", "/api/search");

  server.close();

  // Save full JSON report
  const reportPath = path.join(__dirname, "endpoint_test_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Finished executing all ${results.length} endpoint test calls.`);
  console.log(`Report saved to: ${reportPath}`);

  process.exit(0);
}

runAllEndpointTests();
