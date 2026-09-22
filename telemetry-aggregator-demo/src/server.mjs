import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TelemetryStore } from './store.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 8787);
const store = await new TelemetryStore(process.env.DATA_DIR ?? path.resolve(here, '../data')).init();
const localOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

function send(res, status, data, extra = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 64 * 1024) throw Object.assign(new Error('Request body exceeds 64 KiB.'), { status: 413 }); }
  try { return JSON.parse(body); } catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }); }
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !localOrigin.test(origin)) return send(res, 403, { error: 'Only local browser origins are allowed.' });
  if (origin) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'Origin');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');
  }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url ?? '/', `http://${host}:${port}`);
  try {
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true, service: 'turbine-telemetry-aggregator-demo' });
    if (req.method === 'GET' && url.pathname === '/v1/snapshot') return send(res, 200, await store.snapshot());
    if (req.method === 'GET' && url.pathname === '/v1/history') {
      const limit = Number(url.searchParams.get('limit') ?? 100);
      const since = url.searchParams.get('since');
      if (!Number.isInteger(limit) || limit < 1 || limit > 1000) return send(res, 400, { error: 'limit must be an integer from 1 to 1000.' });
      if (since && !Number.isFinite(Date.parse(since))) return send(res, 400, { error: 'since must be a valid date.' });
      const events = await store.history({ turbineId: url.searchParams.get('turbineId') ?? undefined, since: since ?? undefined, limit });
      return send(res, 200, { events });
    }
    if (req.method === 'POST' && url.pathname === '/v1/readings') return send(res, 202, await store.ingest(await readJson(req)));
    return send(res, 404, { error: 'Not found.' });
  } catch (error) { return send(res, error.status ?? 400, { error: error.message }); }
});

server.listen(port, host, () => console.log(`Local telemetry aggregator listening at http://${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
