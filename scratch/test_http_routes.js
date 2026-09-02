const http = require('http');
const assert = require('assert');
const app = require('../src/app');

function makeRequest(server, path, options = {}) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const bodyBuffer = Buffer.concat(chunks);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: bodyBuffer.toString('utf8'),
            rawBody: bodyBuffer,
          });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runHttpTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`Server listening on port ${port} for route testing...`);

  try {
    // 1. Ping
    console.log('Testing /ping...');
    let res = await makeRequest(server, '/ping');
    assert.strictEqual(res.statusCode, 200);

    // 2. QR Raw URL -> Image PNG
    console.log('Testing GET /api/qr?url=...');
    res = await makeRequest(server, '/api/qr?url=https%3A%2F%2Fapp.catchme.live%2Fprofile%3Fid%3Duser123');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'image/png');
    assert(res.rawBody.length > 100);

    // 3. QR JSON format
    console.log('Testing GET /api/qr?format=json&type=game&id=game-999...');
    res = await makeRequest(server, '/api/qr?format=json&type=game&id=game-999');
    assert.strictEqual(res.statusCode, 200);
    const jsonRes = JSON.parse(res.body);
    assert.strictEqual(jsonRes.status, 'SUCCESS');
    assert.strictEqual(jsonRes.link, 'https://app.catchme.live/game?id=game-999');
    assert(jsonRes.dataUrl.startsWith('data:image/png;base64,'));

    // 4. Entity QR Shortcuts
    console.log('Testing GET /api/qr/profile/athlete-777...');
    res = await makeRequest(server, '/api/qr/profile/athlete-777');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'image/png');

    console.log('Testing GET /api/qr/game/match-888...');
    res = await makeRequest(server, '/api/qr/game/match-888');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'image/png');

    console.log('Testing GET /api/qr/game/match-888/lineup...');
    res = await makeRequest(server, '/api/qr/game/match-888/lineup');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'image/png');

    console.log('Testing GET /api/qr/game/match-888/stats...');
    res = await makeRequest(server, '/api/qr/game/match-888/stats');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'image/png');

    // 5. QR Link Parser
    console.log('Testing GET /api/qr/parse...');
    res = await makeRequest(server, '/api/qr/parse?link=https%3A%2F%2Fapp.catchme.live%2Fprofile%3Fid%3Dscout-star');
    assert.strictEqual(res.statusCode, 200);
    const parseRes = JSON.parse(res.body);
    assert.strictEqual(parseRes.status, 'SUCCESS');
    assert.strictEqual(parseRes.id, 'scout-star');
    assert.strictEqual(parseRes.type, 'profile');

    // 6. Scout & Organizer Tablet HTML Dashboard View
    console.log('Testing GET /api/scout/view...');
    res = await makeRequest(server, '/api/scout/view');
    assert.strictEqual(res.statusCode, 200);
    assert(res.headers['content-type'].includes('text/html'));
    assert(res.body.includes('Catch'));
    assert(res.body.includes('Top Performers'));
    assert(res.body.includes('Disciplinary'));

    // 7. Daily Summary JSON API
    console.log('Testing GET /api/scout/daily-summary...');
    res = await makeRequest(server, '/api/scout/daily-summary');
    assert.strictEqual(res.statusCode, 200);
    const summaryJson = JSON.parse(res.body);
    assert.strictEqual(summaryJson.status, 'SUCCESS');
    assert(summaryJson.kpis !== undefined);

    // 8. Daily Summary PDF Export
    console.log('Testing GET /api/scout/daily-summary/pdf...');
    res = await makeRequest(server, '/api/scout/daily-summary/pdf');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'application/pdf');
    assert(res.rawBody.length > 5000);

    // 9. Daily Summary CSV Export
    console.log('Testing GET /api/scout/daily-summary/csv...');
    res = await makeRequest(server, '/api/scout/daily-summary/csv');
    assert.strictEqual(res.statusCode, 200);
    assert(res.headers['content-type'].includes('text/csv'));
    assert(res.body.includes('CATCH ME PLATFORM'));

    // 10. Organizer Alias
    console.log('Testing GET /api/organizer/view...');
    res = await makeRequest(server, '/api/organizer/view');
    assert.strictEqual(res.statusCode, 200);
    assert(res.headers['content-type'].includes('text/html'));

    console.log('\n=== ALL HTTP ROUTE TESTS PASSED SUCCESSFULLY ===');
    process.exit(0);
  } finally {
    server.close();
  }
}

runHttpTests().catch((err) => {
  console.error('HTTP Route Test Error:', err);
  process.exit(1);
});
