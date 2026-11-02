import { isAuthorized, unauthorized } from "@/lib/auth";
import { syncConfiguredRepository } from "@/lib/github";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!isAuthorized(request.headers)) return unauthorized();
  if (!process.env.DATABASE_URL) return Response.json({ error: "DATABASE_URL is missing" }, { status: 503 });
  try { return Response.json(await syncConfiguredRepository(), { headers: { "Cache-Control": "no-store" } }); }
  catch (err) { return Response.json({ error: err instanceof Error ? err.message : "Sync failed" }, { status: 502 }); }
}
