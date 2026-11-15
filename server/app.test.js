import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import test from 'node:test';
import { createApp } from './app.js';

async function listen(t, server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return `http://127.0.0.1:${server.address().port}`;
}

for (const status of [200, 422, 502]) {
  test(`forwards payload and status ${status}`, async (t) => {
    const payload = status === 200 ? { crops: [{ crop: 'rice', score: 0.8 }] } : { detail: 'upstream error' };
    let received;
    const upstream = await listen(t, http.createServer(async (req, res) => {
      let body = '';
      for await (const chunk of req) body += chunk;
      received = { path: req.url, method: req.method, body: JSON.parse(body) };
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    }));
    const proxy = await listen(t, http.createServer(createApp({ mlUrl: upstream })));
    const response = await fetch(`${proxy}/api/recommend`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 27.6, lon: 84.35, ignored: true }),
    });
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), payload);
    assert.deepEqual(received, { path: '/predict', method: 'POST', body: { lat: 27.6, lon: 84.35 } });
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
  });
}

for (const mode of ['timeout', 'connection refusal']) {
  test(`returns 503 on ${mode}`, async (t) => {
    const server = http.createServer(() => {});
    const upstream = await listen(t, server);
    if (mode === 'connection refusal') await new Promise(resolve => server.close(resolve));
    const proxy = await listen(t, http.createServer(createApp({ mlUrl: upstream, timeoutMs: 30 })));
    const response = await fetch(`${proxy}/api/recommend`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { detail: 'Prediction service unavailable' });
  });
}
