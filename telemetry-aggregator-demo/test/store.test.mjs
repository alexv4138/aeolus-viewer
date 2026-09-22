import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { TelemetryStore, validateReading } from '../src/store.mjs';

const reading = (overrides = {}) => ({ turbineId: 'turbine-01', sensorId: 'sensor-a', observedAt: '2026-09-23T12:30:00+03:00', eventId: 'event-1', readings: { wind: { value: 2.5, unit: 'm/s' } }, ...overrides });

test('validates explicit timezone and numeric readings', () => {
  assert.equal(validateReading(reading()).readings.wind.value, 2.5);
  assert.throws(() => validateReading(reading({ observedAt: '2026-09-23T12:30:00' })), /timezone/);
  assert.throws(() => validateReading(reading({ readings: { wind: { value: 'fast' } } })), /finite numeric/);
});

test('appends readings, ignores duplicate event ids, and keeps newest timestamp per metric', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'turbine-aggregator-'));
  try {
    const store = await new TelemetryStore(dir).init();
    assert.equal((await store.ingest(reading())).accepted, true);
    assert.equal((await store.ingest(reading())).duplicate, true);
    await store.ingest(reading({ eventId: 'event-2', observedAt: '2026-09-23T12:20:00+03:00', readings: { wind: { value: 1, unit: 'm/s' } } }));
    const snapshot = await store.snapshot();
    assert.equal(snapshot.turbines['turbine-01'].sensors['sensor-a'].metrics.wind.value, 2.5);
    assert.equal((await store.history({ turbineId: 'turbine-01', limit: 5 })).length, 2);
    const restarted = await new TelemetryStore(dir).init();
    assert.equal((await restarted.snapshot()).turbines['turbine-01'].sensors['sensor-a'].metrics.wind.value, 2.5);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
