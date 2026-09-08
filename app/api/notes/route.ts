import { env } from "cloudflare:workers";
import { userFromRequest } from "@/lib/server-auth";

type NoteRow = { id: string; location_id: number; author_username: string; author_name: string; body: string; created_at: number };

function allowedLocation(user: Awaited<ReturnType<typeof userFromRequest>>, requested: number) {
  if (!user) return null;
  return user.master ? (Number.isInteger(requested) && requested > 0 ? requested : null) : user.locationId;
}

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sesiune expirată." }, { status: 401 });
  const requested = Number(new URL(request.url).searchParams.get("locationId"));
  const locationId = allowedLocation(user, requested);
  if (!locationId) return Response.json({ error: "Locație invalidă." }, { status: 400 });
  const result = await env.DB.prepare(
    "SELECT n.id, n.location_id, n.author_username, u.name AS author_name, n.body, n.created_at FROM notes n JOIN users u ON u.username=n.author_username WHERE n.location_id=? ORDER BY n.created_at DESC LIMIT 50",
  ).bind(locationId).all<NoteRow>();
  return Response.json({ notes: result.results.map((note) => ({
    id: note.id, locationId: note.location_id, authorUsername: note.author_username,
    authorName: note.author_name, body: note.body, createdAt: note.created_at,
  })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sesiune expirată." }, { status: 401 });
  let payload: { locationId?: unknown; body?: unknown };
  try { payload = await request.json(); } catch { return Response.json({ error: "Cerere invalidă." }, { status: 400 }); }
  const locationId = allowedLocation(user, Number(payload.locationId));
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!locationId) return Response.json({ error: "Locație invalidă." }, { status: 400 });
  if (!body || body.length > 2000) return Response.json({ error: "Nota trebuie să aibă între 1 și 2.000 de caractere." }, { status: 400 });
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await env.DB.prepare("INSERT INTO notes (id, location_id, author_username, body, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, locationId, user.username, body, createdAt).run();
  return Response.json({ note: { id, locationId, authorUsername: user.username, authorName: user.name, body, createdAt } }, { status: 201 });
}
