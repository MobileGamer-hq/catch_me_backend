const app = require("./app");
const http = require("http");

async function runTests() {
  console.log("🚀 Starting Response Status Standardization Tests...\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let passed = 0;
  let failed = 0;

  async function testEndpoint(name, path, options, expectedStatusHttp, expectedStatusField, customValidator) {
    try {
      const res = await fetch(`${baseUrl}${path}`, options);
      const data = await res.json();

      let ok = true;
      const errors = [];

      if (res.status !== expectedStatusHttp) {
        ok = false;
        errors.push(`HTTP status: expected ${expectedStatusHttp}, got ${res.status}`);
      }

      if (data.status !== expectedStatusField) {
        ok = false;
        errors.push(`Body status field: expected "${expectedStatusField}", got "${data.status}"`);
      }

      if (customValidator) {
        const customRes = customValidator(data);
        if (customRes !== true) {
          ok = false;
          errors.push(`Validator failed: ${customRes}`);
        }
      }

      if (ok) {
        console.log(`✅ [PASS] ${name} (HTTP ${res.status}, status: "${data.status}")`);
        passed++;
      } else {
        console.error(`❌ [FAIL] ${name}: ${errors.join(", ")}`);
        console.error("   Response body:", JSON.stringify(data));
        failed++;
      }
    } catch (err) {
      console.error(`❌ [ERROR] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. GET /
  await testEndpoint(
    "Root Service Info",
    "/",
    { method: "GET" },
    200,
    "SUCCESS",
    (body) => body.message === "Catch Me Backend"
  );

  // 2. GET /ping
  await testEndpoint(
    "Ping Health Check",
    "/ping",
    { method: "GET" },
    200,
    "SUCCESS",
    (body) => body.message === "Pong!"
  );

  // 3. GET /api/users/search (Missing Query)
  await testEndpoint(
    "User Search - Missing Query",
    "/api/users/search",
    { method: "GET" },
    400,
    "FAILED",
    (body) => body.error === "Missing search query"
  );

  // 4. GET /api/users/local-search (Missing Query)
  await testEndpoint(
    "User Local Search - Missing Query",
    "/api/users/local-search",
    { method: "GET" },
    400,
    "FAILED",
    (body) => body.error === "Missing search query"
  );

  // 5. GET /api/events/local-search (Missing Query)
  await testEndpoint(
    "Events Local Search - Missing Query",
    "/api/events/local-search",
    { method: "GET" },
    400,
    "FAILED",
    (body) => body.error === "Missing search query"
  );

  // 6. GET /api/posts/local-search (Missing Query)
  await testEndpoint(
    "Posts Local Search - Missing Query",
    "/api/posts/local-search",
    { method: "GET" },
    400,
    "FAILED",
    (body) => body.error === "Missing search query"
  );

  // 7. GET /api/search (Missing Query)
  await testEndpoint(
    "Global Search - Missing Query",
    "/api/search",
    { method: "GET" },
    400,
    "FAILED",
    (body) => body.error === "Missing search query"
  );

  // 8. POST /api/engage/signal (Missing Fields)
  await testEndpoint(
    "Engage Signal - Missing Fields",
    "/api/engage/signal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    400,
    "FAILED",
    (body) => body.error === "Missing required fields"
  );

  // 9. POST /api/notifications/send (Missing Recipient)
  await testEndpoint(
    "Send Notification - Missing Recipient",
    "/api/notifications/send",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    400,
    "FAILED",
    (body) => typeof body.message === "string"
  );

  // 10. 404 Catch-All Route
  await testEndpoint(
    "404 Not Found Catch-All",
    "/api/nonexistent-route-xyz",
    { method: "GET" },
    404,
    "FAILED",
    (body) => body.error === "Route not found"
  );

  // 11. Local search success returns array wrapped in data with status: SUCCESS
  await testEndpoint(
    "User Local Search - Valid Query",
    "/api/users/local-search?q=test",
    { method: "GET" },
    200,
    "SUCCESS",
    (body) => Array.isArray(body.data)
  );

  // 12. Events Local Search - Valid Query
  await testEndpoint(
    "Events Local Search - Valid Query",
    "/api/events/local-search?q=football",
    { method: "GET" },
    200,
    "SUCCESS",
    (body) => Array.isArray(body.data)
  );

  // 13. Posts Local Search - Valid Query
  await testEndpoint(
    "Posts Local Search - Valid Query",
    "/api/posts/local-search?q=game",
    { method: "GET" },
    200,
    "SUCCESS",
    (body) => Array.isArray(body.data)
  );

  server.close();

  console.log(`\n---------------------------------------`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`---------------------------------------\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 All response status tests passed successfully!");
    process.exit(0);
  }
}

runTests();
