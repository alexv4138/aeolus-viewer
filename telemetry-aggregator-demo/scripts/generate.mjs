import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { advanceSimulation } from '../src/live-simulation.mjs';
import { pushBacklog } from '../src/push-backlog.mjs';
import { STEP_MS } from '../src/simulator.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');
const destination = path.resolve(root, process.argv.slice(2).find(arg => arg !== '--watch') ?? 'output/simulated-telemetry.json');
const archiveDir = path.join(root, 'data');
const localEnv = path.join(root, '.env.local');
if (existsSync(localEnv)) process.loadEnvFile(localEnv);

async function tick() {
  const result = await advanceSimulation(destination, Date.now(), archiveDir);
  console.log(`${new Date().toISOString()} added=${result.added} visible=${result.visible} latest=${result.end}`);
  if (process.env.TELEMETRY_ENDPOINT && process.env.TELEMETRY_INGEST_KEY) {
    const upload = await pushBacklog({ archivePath: path.join(archiveDir, 'simulated-telemetry.archive.jsonl'), cursorPath: path.join(archiveDir, 'push-offset.json'), endpoint: process.env.TELEMETRY_ENDPOINT, apiKey: process.env.TELEMETRY_INGEST_KEY });
    if (upload.sent) console.log(`Uploaded ${upload.sent} backlog rows.`);
  }
}

await tick();
if (watch) {
  // Check every minute; only new completed 30-minute timestamps are generated.
  const timer = setInterval(() => tick().catch(error => console.error('Simulation tick failed:', error)), 60_000);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { clearInterval(timer); process.exit(0); });
  console.log(`Watching system time continuously; cadence=${STEP_MS / 60_000} minutes.`);
}
