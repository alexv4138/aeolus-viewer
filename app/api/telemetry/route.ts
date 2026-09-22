import { env } from "cloudflare:workers";
import { userFromRequest } from "@/lib/server-auth";
import type { WorkbookTelemetry } from "@/app/fleet-data";

const NO_STORE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const FIELDS = ["TempC", "PresAtm", "Umiditate", "VitVant", "RadSolara", "Turatie", "Voltaj", "Amperaj", "Putere", "Energie", "Vibratii", "CupluMec", "TempInfas"] as const;

async function authorized(provided: string | null, expected: string | undefined) {
  if (!expected || expected.length < 32 || !provided) return false;
  const digest = async (text: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  const [a, b] = await Promise.all([digest(provided), digest(expected)]);
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

function validRow(value: unknown): value is WorkbookTelemetry {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (!Number.isInteger(row.IDLocatie) || Number(row.IDLocatie) < 1 || Number(row.IDLocatie) > 4) return false;
  if (typeof row.DataOra !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(row.DataOra) || !Number.isFinite(Date.parse(row.DataOra))) return false;
  if (Date.parse(row.DataOra) > Date.now() + 10 * 60_000) return false;
  if (typeof row.DirectieVant !== "string" || row.DirectieVant.length > 8) return false;
  if (row.Alarma !== 0 && row.Alarma !== 1) return false;
  if (!FIELDS.every((field) => typeof row[field] === "number" && Number.isFinite(row[field]))) return false;
  if (!Array.isArray(row.alerts) || row.alerts.length > 8) return false;
  return row.alerts.every((alert: unknown) => {
    if (!alert || typeof alert !== "object") return false;
    const item = alert as Record<string, unknown>;
    return typeof item.code === "string" && /^ERR-\d{3}$/.test(item.code)
      && ["info", "low", "medium", "high", "critical"].includes(String(item.severity))
      && ["active", "resolved"].includes(String(item.status))
      && item.occurredAt === row.DataOra
      && (item.reading === undefined || (typeof item.reading === "string" && item.reading.length <= 120))
      && (item.action === undefined || (typeof item.action === "string" && item.action.length <= 240));
  });
}

async function ensureTable() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS telemetry_ingest (location_id INTEGER NOT NULL, data_ora TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(location_id, data_ora))").run();
}

async function readLimitedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 100_000) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(body);
}

export async function POST(request: Request) {
  if (!await authorized(request.headers.get("x-api-key"), env.TELEMETRY_INGEST_KEY)) return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  const body = await readLimitedBody(request);
  if (body === null) return Response.json({ error: "Payload too large" }, { status: 413, headers: NO_STORE });
  let payload: unknown;
  try { payload = JSON.parse(body); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE }); }
  const rows = (payload as { rows?: unknown })?.rows;
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 50 || !rows.every(validRow)) return Response.json({ error: "Expected 1–50 valid telemetry rows" }, { status: 400, headers: NO_STORE });
  await ensureTable();
  await env.DB.batch(rows.map((row: WorkbookTelemetry) => env.DB.prepare("INSERT OR IGNORE INTO telemetry_ingest (location_id, data_ora, payload) VALUES (?, ?, ?)").bind(row.IDLocatie, row.DataOra, JSON.stringify(row))));
  return Response.json({ accepted: rows.length }, { status: 202, headers: NO_STORE });
}

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  await ensureTable();
  const cutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
  const query = user.master
    ? env.DB.prepare("SELECT payload FROM telemetry_ingest WHERE data_ora >= ? ORDER BY location_id, data_ora LIMIT 5000").bind(cutoff)
    : env.DB.prepare("SELECT payload FROM telemetry_ingest WHERE location_id = ? AND data_ora >= ? ORDER BY data_ora LIMIT 1100").bind(user.locationId, cutoff);
  const result = await query.all<{ payload: string }>();
  const rows = result.results.map((row) => JSON.parse(row.payload) as WorkbookTelemetry);
  const latestByLocation = new Map<number, WorkbookTelemetry>();
  for (const row of rows) latestByLocation.set(row.IDLocatie, row);
  for (const row of rows) {
    const latest = latestByLocation.get(row.IDLocatie);
    for (const alert of row.alerts ?? []) alert.status = latest?.Alarma && !rows.some((candidate) => candidate.IDLocatie === row.IDLocatie && candidate.DataOra > row.DataOra && candidate.Alarma === 0) ? "active" : "resolved";
  }
  return Response.json({ rows }, { headers: NO_STORE });
}
