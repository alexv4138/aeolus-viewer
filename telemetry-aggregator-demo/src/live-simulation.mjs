import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulateStep, STEP_MS, WINDOW_MS } from './simulator.mjs';

const IDS = [1, 2, 3, 4];
const key = row => `${row.IDLocatie}:${row.DataOra}`;

export async function advanceSimulation(destination, now = Date.now(), archiveDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data')) {
  const end = Math.floor(now / STEP_MS) * STEP_MS;
  const archive = path.join(archiveDir, 'simulated-telemetry.archive.jsonl');
  await mkdir(path.dirname(destination), { recursive: true });
  await mkdir(archiveDir, { recursive: true });
  let rows;
  try {
    rows = JSON.parse(await readFile(destination, 'utf8'));
    if (!Array.isArray(rows)) throw new Error('Simulation snapshot is not an array.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    rows = [];
  }

  const latestByTurbine = new Map();
  for (const row of rows) {
    const prior = latestByTurbine.get(row.IDLocatie);
    if (!prior || row.DataOra > prior.DataOra) latestByTurbine.set(row.IDLocatie, row);
  }
  const first = rows.length ? null : end - WINDOW_MS;
  const additions = [];
  for (const IDLocatie of IDS) {
    const previous = latestByTurbine.get(IDLocatie);
    let energy = previous?.Energie ?? 700 + IDLocatie * 120;
    let overspeed = Boolean(previous?.Alarma);
    const next = previous ? Date.parse(previous.DataOra) + STEP_MS : first;
    for (let at = next; at <= end; at += STEP_MS) {
      const step = simulateStep(at, IDLocatie, energy, overspeed);
      additions.push(step.row);
      energy = step.energy;
      overspeed = step.overspeed;
    }
  }
  if (!additions.length) return { added: 0, visible: rows.length, end: new Date(end).toISOString() };
  // Durable append-only archive: a later restart can catch up from the last snapshot.
  await appendFile(archive, additions.map(row => JSON.stringify(row)).join('\n') + '\n', 'utf8');
  const cutoff = end - WINDOW_MS;
  rows = [...rows, ...additions].filter(row => Date.parse(row.DataOra) >= cutoff);
  const deduped = new Map(rows.map(row => [key(row), row]));
  rows = [...deduped.values()].sort((a, b) => a.IDLocatie - b.IDLocatie || a.DataOra.localeCompare(b.DataOra));
  // A historical occurrence stays in history, but it is active only while its turbine is still in the incident.
  for (const IDLocatie of IDS) {
    const turbineRows = rows.filter(row => row.IDLocatie === IDLocatie);
    const last = turbineRows.at(-1);
    for (const row of turbineRows) for (const alert of row.alerts ?? []) alert.status = last?.Alarma && !turbineRows.some(candidate => candidate.DataOra > row.DataOra && !candidate.Alarma) ? 'active' : 'resolved';
  }
  const tmp = `${destination}.tmp`;
  await writeFile(tmp, JSON.stringify(rows), 'utf8');
  await rename(tmp, destination);
  return { added: additions.length, visible: rows.length, end: new Date(end).toISOString() };
}
