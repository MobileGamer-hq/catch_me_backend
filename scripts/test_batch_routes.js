require("dotenv").config();
const http = require("http");
const app = require("../src/app");

async function runTests() {
  console.log("🚀 Testing Batch Endpoints with Redis Caching...\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let passed = 0;
  let failed = 0;

  async function test(name, path, body, validator) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const err = validator(res.status, data);
      if (!err) {
        console.log(`✅ [PASS] ${name} (HTTP ${res.status}, status: "${data.status}")`);
        passed++;
      } else {
        console.error(`❌ [FAIL] ${name}: ${err}`);
        failed++;
      }
    } catch (e) {
      console.error(`❌ [FAIL] ${name}: ${e.message}`);
      failed++;
    }
  }

  const sampleIds = ["0qLgNmU9e3ZKLU5rbjEnuLaxCw33"];

  // Test 1: POST /api/users/batch
  await test("POST /api/users/batch", "/api/users/batch", { ids: sampleIds }, (status, data) => {
    if (status !== 200) return `Expected 200, got ${status}`;
    if (data.status !== "SUCCESS") return `Expected status SUCCESS, got ${data.status}`;
    if (!Array.isArray(data.data)) return `Expected data to be an array`;
    return null;
  });

  // Test 2: POST /api/batch/users
  await test("POST /api/batch/users", "/api/batch/users", { ids: sampleIds }, (status, data) => {
    if (status !== 200) return `Expected 200, got ${status}`;
    if (data.status !== "SUCCESS") return `Expected status SUCCESS, got ${data.status}`;
    if (!Array.isArray(data.data)) return `Expected data to be an array`;
    return null;
  });

  // Test 3: POST /api/posts/batch
  await test("POST /api/posts/batch", "/api/posts/batch", { ids: ["post_test_1"] }, (status, data) => {
    if (status !== 200) return `Expected 200, got ${status}`;
    if (data.status !== "SUCCESS") return `Expected status SUCCESS, got ${data.status}`;
    if (!Array.isArray(data.data)) return `Expected data to be an array`;
    return null;
  });

  // Test 4: POST /api/events/batch
  await test("POST /api/events/batch", "/api/events/batch", { ids: ["event_test_1"] }, (status, data) => {
    if (status !== 200) return `Expected 200, got ${status}`;
    if (data.status !== "SUCCESS") return `Expected status SUCCESS, got ${data.status}`;
    if (!Array.isArray(data.data)) return `Expected data to be an array`;
    return null;
  });

  // Test 5: POST /api/batch (Universal multi-entity)
  await test("POST /api/batch (Multi-entity)", "/api/batch", {
    users: sampleIds,
    posts: ["post_test_1"],
    events: ["event_test_1"],
  }, (status, data) => {
    if (status !== 200) return `Expected 200, got ${status}`;
    if (data.status !== "SUCCESS") return `Expected status SUCCESS, got ${data.status}`;
    if (!data.data?.users || !data.data?.posts || !data.data?.events) return `Missing expected entity keys in data`;
    return null;
  });

  // Test 6: Missing / Empty IDs
  await test("POST /api/users/batch (Empty IDs)", "/api/users/batch", { ids: [] }, (status, data) => {
    if (status !== 200) return `Expected 200, got ${status}`;
    if (data.status !== "SUCCESS") return `Expected status SUCCESS, got ${data.status}`;
    if (data.data?.length !== 0) return `Expected empty data array`;
    return null;
  });

  // Test 7: Invalid entity type
  await test("POST /api/batch/invalid_type", "/api/batch/invalid_type", { ids: ["123"] }, (status, data) => {
    if (status !== 500 && status !== 400) return `Expected 400/500, got ${status}`;
    if (data.status !== "FAILED") return `Expected status FAILED, got ${data.status}`;
    return null;
  });

  server.close();

  console.log("\n---------------------------------------");
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log("---------------------------------------");

  if (failed === 0) {
    console.log("🎉 All batch tests passed successfully!");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
