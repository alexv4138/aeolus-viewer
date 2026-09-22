import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { advanceSimulation } from '../src/live-simulation.mjs';
import { STEP_MS } from '../src/simulator.mjs';

test('seeds 21 past days and catches up missed samples without duplicates', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sim-live-'));
  const destination = path.join(dir, 'site', 'simulated-telemetry.json');
  try {
    const now = Date.parse('2026-09-23T10:00:00Z');
    const first = await advanceSimulation(destination, now, path.join(dir, 'private'));
    assert.equal(first.visible, 4 * (21 * 48 + 1));
    const second = await advanceSimulation(destination, now + 3 * STEP_MS, path.join(dir, 'private'));
    assert.equal(second.added, 12);
    assert.equal(second.visible, first.visible);
    const noDuplicate = await advanceSimulation(destination, now + 3 * STEP_MS, path.join(dir, 'private'));
    assert.equal(noDuplicate.added, 0);
    const rows = JSON.parse(await readFile(destination, 'utf8'));
    const times = rows.filter(row => row.IDLocatie === 1).map(row => row.DataOra);
    assert.equal(new Set(times).size, times.length);
    assert.equal(times.at(-1), '2026-09-23T11:30:00.000Z');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
