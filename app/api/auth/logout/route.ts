import { deleteSession, expiredSessionCookie } from "@/lib/server-auth";

export async function POST(request: Request) {
  await deleteSession(request);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": expiredSessionCookie(), "Cache-Control": "no-store" } });
}
