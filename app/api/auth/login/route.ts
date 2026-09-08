import { createSession, sessionCookie, verifyCredentials } from "@/lib/server-auth";

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cerere invalidă." }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username.trim().slice(0, 160) : "";
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  if (!username || !password) return Response.json({ error: "Completează utilizatorul și parola." }, { status: 400 });
  const user = await verifyCredentials(username, password);
  if (!user) return Response.json({ error: "Verifică numele de utilizator și parola." }, { status: 401 });
  const token = await createSession(user.username);
  return Response.json({ user }, { headers: { "Set-Cookie": sessionCookie(token), "Cache-Control": "no-store" } });
}
