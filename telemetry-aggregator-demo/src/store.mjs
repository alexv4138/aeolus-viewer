import { mkdir, appendFile, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const isoDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));

export function validateReading(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Body must be a JSON object.');
  if (typeof body.turbineId !== 'string' || !/^[\w.-]{1,80}$/.test(body.turbineId)) throw new Error('turbineId is required (1–80 letters, digits, ., _, or -).');
  if (typeof body.sensorId !== 'string' || !/^[\w.-]{1,80}$/.test(body.sensorId)) throw new Error('sensorId is required (1–80 letters, digits, ., _, or -).');
  if (!isoDate(body.observedAt) || !/(Z|[+-]\d{2}:?\d{2})$/i.test(body.observedAt)) throw new Error('observedAt must be an ISO-8601 timestamp with timezone, e.g. 2026-09-23T12:30:00+03:00.');
  if (!body.readings || typeof body.readings !== 'object' || Array.isArray(body.readings) || !Object.keys(body.readings).length) throw new Error('readings must be a non-empty object of metric names to numeric values or { value, unit }.');
  const readings = {};
  for (const [key, raw] of Object.entries(body.readings)) {
    if (!/^[\w.-]{1,80}$/.test(key)) throw new Error(`Invalid metric name: ${key}`);
    const value = typeof raw === 'number' ? raw : raw?.value;
    const unit = typeof raw === 'object' && raw !== null ? raw.unit : undefined;
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Reading ${key} must have a finite numeric value.`);
    if (unit !== undefined && (typeof unit !== 'string' || unit.length > 32)) throw new Error(`Unit for ${key} must be a string of at most 32 characters.`);
    readings[key] = unit === undefined ? { value } : { value, unit };
  }
  if (body.sequence !== undefined && (!Number.isSafeInteger(body.sequence) || body.sequence < 0)) throw new Error('sequence must be a non-negative safe integer.');
  if (body.eventId !== undefined && (typeof body.eventId !== 'string' || body.eventId.length < 1 || body.eventId.length > 128)) throw new Error('eventId must be a string up to 128 characters.');
  return { turbineId: body.turbineId, sensorId: body.sensorId, observedAt: body.observedAt, readings,
    ...(body.sequence === undefined ? {} : { sequence: body.sequence }), eventId: body.eventId ?? randomUUID() };
}

export class TelemetryStore {
  #queue = Promise.resolve();
  #ids = new Set();
  #snapshot = { schemaVersion: 1, updatedAt: null, turbines: {} };

  constructor(dataDir) { this.dataDir = dataDir; this.eventsPath = path.join(dataDir, 'events.jsonl'); this.snapshotPath = path.join(dataDir, 'snapshot.json'); }

  async init() {
    await mkdir(this.dataDir, { recursive: true });
    try {
      const content = await readFile(this.eventsPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        if (!line) continue;
        try { const event = JSON.parse(line); this.#apply(event); } catch { /* Ignore only malformed/torn historical lines; new writes are atomic per line. */ }
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    return this;
  }

  #apply(event) {
    if (this.#ids.has(event.eventId)) return;
    this.#ids.add(event.eventId);
    const turbine = this.#snapshot.turbines[event.turbineId] ??= { sensors: {} };
    const sensor = turbine.sensors[event.sensorId] ??= { metrics: {} };
    for (const [metric, reading] of Object.entries(event.readings)) {
      const prior = sensor.metrics[metric];
      if (!prior || Date.parse(event.observedAt) >= Date.parse(prior.observedAt)) sensor.metrics[metric] = { ...reading, observedAt: event.observedAt, ...(event.sequence === undefined ? {} : { sequence: event.sequence }) };
    }
    if (!this.#snapshot.updatedAt || Date.parse(event.receivedAt) > Date.parse(this.#snapshot.updatedAt)) this.#snapshot.updatedAt = event.receivedAt;
  }

  ingest(input) {
    const event = validateReading(input);
    const job = this.#queue.then(async () => {
      if (this.#ids.has(event.eventId)) return { accepted: false, duplicate: true, eventId: event.eventId };
      const stored = { ...event, receivedAt: new Date().toISOString() };
      await appendFile(this.eventsPath, `${JSON.stringify(stored)}\n`, 'utf8');
      this.#apply(stored);
      const tmp = `${this.snapshotPath}.tmp`;
      await writeFile(tmp, `${JSON.stringify(this.#snapshot, null, 2)}\n`, 'utf8');
      await rename(tmp, this.snapshotPath);
      return { accepted: true, duplicate: false, eventId: event.eventId, receivedAt: stored.receivedAt };
    });
    this.#queue = job.catch(() => undefined);
    return job;
  }

  async snapshot() { await this.#queue; return structuredClone(this.#snapshot); }

  async history({ turbineId, since, limit = 100 } = {}) {
    await this.#queue;
    const safeLimit = Math.max(1, Math.min(Number.isInteger(limit) ? limit : 100, 1000));
    let text;
    try { text = await readFile(this.eventsPath, 'utf8'); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    return text.split(/\r?\n/).filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } })
      .filter(event => (!turbineId || event.turbineId === turbineId) && (!since || Date.parse(event.observedAt) >= Date.parse(since)))
      .slice(-safeLimit).reverse();
  }
}
