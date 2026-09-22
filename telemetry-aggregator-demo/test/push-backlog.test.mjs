import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pushBacklog } from '../src/push-backlog.mjs';

test('retries failed uploads from durable cursor without dropping rows', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sim-push-'));
  try {
    const archivePath = path.join(dir, 'archive.jsonl');
    const cursorPath = path.join(dir, 'cursor.json');
    await writeFile(archivePath, '{"id":1}\n{"id":2}\n');
    let calls = 0;
    const options = { archivePath, cursorPath, endpoint: 'https://example.test/api/telemetry', apiKey: 'x'.repeat(32) };
    await assert.rejects(pushBacklog({ ...options, fetchImpl: async () => { calls++; return { ok: false, status: 503 }; } }), /retained/);
    assert.equal(calls, 1);
    const sent = [];
    const success = await pushBacklog({ ...options, fetchImpl: async (_url, init) => { sent.push(...JSON.parse(init.body).rows); return { ok: true }; } });
    assert.equal(success.sent, 2);
    assert.deepEqual(sent.map(row => row.id), [1, 2]);
    assert.equal(JSON.parse(await readFile(cursorPath, 'utf8')).offset, (await readFile(archivePath)).length);
    assert.equal((await pushBacklog({ ...options, fetchImpl: async () => { throw new Error('unexpected upload'); } })).sent, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
