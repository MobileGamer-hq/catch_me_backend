const http = require('http');
const assert = require('assert');
const app = require('../src/app');

function makeRequest(server, path) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: 'GET',
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const bodyBuffer = Buffer.concat(chunks);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            rawBody: bodyBuffer,
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function testPdfEndpoints() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const validUserId = 'xfNhoQ65r8cqYL8P8hGt6lw6SJr2';

    console.log(`Testing Scout Profile PDF: GET /api/scout/profile/${validUserId}/pdf...`);
    let res = await makeRequest(server, `/api/scout/profile/${validUserId}/pdf`);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'application/pdf');
    assert(res.rawBody.length > 5000);
    console.log('✓ Scout Profile PDF generated successfully (' + res.rawBody.length + ' bytes)');

    console.log(`Testing User Profile PDF: GET /api/users/${validUserId}/download...`);
    res = await makeRequest(server, `/api/users/${validUserId}/download`);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'application/pdf');
    assert(res.rawBody.length > 5000);
    console.log('✓ User Download PDF generated successfully (' + res.rawBody.length + ' bytes)');

    console.log('Testing Non-existent User PDF: GET /api/users/nonexistent-999/download (expect 404)...');
    res = await makeRequest(server, '/api/users/nonexistent-999/download');
    assert.strictEqual(res.statusCode, 404);
    console.log('✓ Non-existent user correctly returned 404');

    console.log('\n=== ALL PDF DOWNLOAD ROUTE TESTS PASSED ===');
    process.exit(0);
  } finally {
    server.close();
  }
}

testPdfEndpoints().catch((err) => {
  console.error('PDF Endpoint Test Error:', err);
  process.exit(1);
});
