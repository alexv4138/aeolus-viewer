import { userFromRequest } from "@/lib/server-auth";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  return Response.json({ user }, { status: user ? 200 : 401, headers: { "Cache-Control": "no-store" } });
}
