const http = require("http");
const app = require("../src/app");

async function testEndpoints() {
  console.log("=== STARTING AUDIT HTTP ENDPOINT TESTS ===");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Test server running on port ${port}`);

  let pass = 0;
  let fail = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`✅ PASS: ${msg}`);
      pass++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      fail++;
    }
  }

  try {
    // 1. Test POST /api/audit/run?dryRun=true
    console.log("\n--- Testing POST /api/audit/run?dryRun=true ---");
    const runRes = await fetch(`http://localhost:${port}/api/audit/run?dryRun=true`, {
      method: "POST",
    });
    const runData = await runRes.json();
    assert(runRes.status === 200, `POST /api/audit/run status is 200 (received ${runRes.status})`);
    assert(runData.status === "SUCCESS", "Response status is SUCCESS");
    assert(runData.meta && runData.meta.isDryRun === true, "Response meta isDryRun is true");

    // 2. Test GET /api/audit/history
    console.log("\n--- Testing GET /api/audit/history ---");
    const historyRes = await fetch(`http://localhost:${port}/api/audit/history`);
    const historyData = await historyRes.json();
    assert(historyRes.status === 200, `GET /api/audit/history status is 200`);
    assert(historyData.status === "SUCCESS", "History status is SUCCESS");

    // 3. Test GET /api/audit/report (may be 200 if report exists or 404 if clean)
    console.log("\n--- Testing GET /api/audit/report ---");
    const reportRes = await fetch(`http://localhost:${port}/api/audit/report`);
    const reportData = await reportRes.json();
    assert(
      reportRes.status === 200 || reportRes.status === 404,
      `GET /api/audit/report returned valid HTTP status (${reportRes.status})`
    );

    console.log("\n==================================================");
    console.log(`HTTP Endpoint Test Summary: ${pass} Passed, ${fail} Failed`);
    console.log("==================================================");
  } catch (err) {
    console.error("HTTP test error:", err);
    fail++;
  } finally {
    server.close();
    process.exit(fail > 0 ? 1 : 0);
  }
}

testEndpoints();
