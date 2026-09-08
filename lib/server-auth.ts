import { env } from "cloudflare:workers";
import { workbookUsers, type WorkbookUser } from "@/app/fleet-data";

const COOKIE_NAME = "urban_lentz_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
// Cloudflare Workers Web Crypto currently accepts at most 100,000 PBKDF2 rounds.
const PBKDF2_ITERATIONS = 100_000;

const credentials: Record<string, { salt: string; hash: string }> = {
  "bogdan@rolix.ro": {
    salt: "ae62b8b86d3e84453d2295637b4a0b83",
    hash: "960a8a53949637c1efe7740ee3fd14d205218db9a043c818c1461be74a57227f",
  },
  "ion.malael@comoti.ro": {
    salt: "69d778d2fc1e778f65f156fd7a6f0c6e",
    hash: "b6a955aa5301f063b7b5a72dfe590edf8de0f99e4e145ee87408de06aac01e28",
  },
  "adrian.pandele@arrows.ro": {
    salt: "9fb06679982ed3463974ac3c507abe04",
    hash: "7de6487720be1bf224d20afe12b55ca044cbca5f9f32b7e6112f691cd32496bd",
  },
  "bogdan.o.duran@gmail.com": {
    salt: "0d4d99b7b223bf8a52ed123e2c78ae6a",
    hash: "e3e3903d55faf6800b98639d031a20479d29478502023cabb4d05353c74bd9a9",
  },
  "dragospreda@yahoo.com": {
    salt: "3e9107a21b0cd2ed94ad98dfa08e0253",
    hash: "bd9f0cca0dc18890e9ba26ede1b35b36bf799dcc8673f361293affd433df72ad",
  },
};

export type AuthenticatedUser = WorkbookUser & { master: boolean };

function bytesFromHex(value: string) {
  return Uint8Array.from(value.match(/.{1,2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

function hexFromBytes(value: ArrayBuffer) {
  return [...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  return hexFromBytes(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hexFromBytes(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: bytesFromHex(salt), iterations: PBKDF2_ITERATIONS },
      key,
      256,
    ),
  );
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function ensureAuthSchema() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY NOT NULL, location_id INTEGER NOT NULL, location TEXT NOT NULL, role INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, updated_at INTEGER NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL REFERENCES users(username), created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY NOT NULL, location_id INTEGER NOT NULL, author_username TEXT NOT NULL REFERENCES users(username), body TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_notes_location_created ON notes(location_id, created_at)"),
  ]);

  const now = Date.now();
  await env.DB.batch(
    workbookUsers.map((user) => {
      const credential = credentials[user.username];
      if (!credential) throw new Error(`Lipsesc datele de autentificare pentru ${user.username}`);
      return env.DB.prepare(
        "INSERT INTO users (username, location_id, location, role, name, phone, password_salt, password_hash, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(username) DO UPDATE SET location_id=excluded.location_id, location=excluded.location, role=excluded.role, name=excluded.name, phone=excluded.phone, password_salt=excluded.password_salt, password_hash=excluded.password_hash, updated_at=excluded.updated_at",
      ).bind(user.username, user.locationId, user.location, user.role, user.name, user.phone, credential.salt, credential.hash, now);
    }),
  );
}

export async function verifyCredentials(username: string, password: string) {
  await ensureAuthSchema();
  const account = await env.DB.prepare(
    "SELECT username, location_id, location, role, name, phone, password_salt, password_hash FROM users WHERE lower(username) = lower(?) LIMIT 1",
  ).bind(username).first<{
    username: string; location_id: number; location: string; role: number; name: string; phone: string;
    password_salt: string; password_hash: string;
  }>();
  if (!account) return null;
  const candidate = await passwordHash(password, account.password_salt);
  if (!constantTimeEqual(candidate, account.password_hash)) return null;
  return {
    username: account.username,
    locationId: account.location_id,
    location: account.location,
    role: account.role,
    name: account.name,
    phone: account.phone,
    master: account.role === 1,
  } satisfies AuthenticatedUser;
}

export async function createSession(username: string) {
  const token = hexFromBytes(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const id = await sha256(token);
  const now = Date.now();
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now).run();
  await env.DB.prepare("INSERT INTO sessions (id, username, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(id, username, now, now + SESSION_SECONDS * 1000).run();
  return token;
}

function cookieToken(request: Request) {
  const cookie = request.headers.get("Cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function userFromRequest(request: Request) {
  await ensureAuthSchema();
  const token = cookieToken(request);
  if (!token) return null;
  const id = await sha256(token);
  const row = await env.DB.prepare(
    "SELECT u.username, u.location_id, u.location, u.role, u.name, u.phone FROM sessions s JOIN users u ON u.username=s.username WHERE s.id=? AND s.expires_at>? LIMIT 1",
  ).bind(id, Date.now()).first<{
    username: string; location_id: number; location: string; role: number; name: string; phone: string;
  }>();
  return row ? {
    username: row.username,
    locationId: row.location_id,
    location: row.location,
    role: row.role,
    name: row.name,
    phone: row.phone,
    master: row.role === 1,
  } satisfies AuthenticatedUser : null;
}

export async function deleteSession(request: Request) {
  const token = cookieToken(request);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE id=?").bind(await sha256(token)).run();
}

export function sessionCookie(token: string) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;
}

export function expiredSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
