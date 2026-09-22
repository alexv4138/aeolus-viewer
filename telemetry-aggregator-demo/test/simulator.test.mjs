import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateTelemetry } from '../src/simulator.mjs';

test('30-minute rows align overspeed event with curtailment', () => {
  const rows = simulateTelemetry();
  assert.equal(rows.length, 4 * (21 * 48 + 1));
  const first = rows.find(row => row.alerts.some(alert => alert.code === 'ERR-001'));
  assert.ok(first, 'expected a gust-triggered alert');
  assert.equal(first.Alarma, 1);
  assert.ok(first.Turatie <= 120);
  assert.ok(first.Putere <= 1600 * 0.48);
  assert.ok(first.VitVant > 7.5);
  assert.equal(first.alerts[0].occurredAt, first.DataOra);
  assert.equal(Date.parse(rows[1].DataOra) - Date.parse(rows[0].DataOra), 30 * 60 * 1000);
});

test('every turbine gets every catalogue code repeatedly across the 21-day demo window', () => {
  const rows = simulateTelemetry();
  const expected = new Set(Array.from({ length: 22 }, (_, i) => `ERR-${String(i + 1).padStart(3, '0')}`));
  for (const id of [1, 2, 3, 4]) {
    const seen = new Set(rows.filter(row => row.IDLocatie === id).flatMap(row => row.alerts.map(alert => alert.code)));
    assert.deepEqual(seen, expected);
  }
});
