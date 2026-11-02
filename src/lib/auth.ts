import { timingSafeEqual } from "node:crypto";

export function isAuthorized(headers: Headers): boolean {
  const pass = process.env.WORKSPACE_PASSWORD;
  if (!pass || pass.length < 16) return false;
  const provided = headers.get("authorization");
  if (!provided?.startsWith("Basic ")) return false;
  let credentials: string;
  try { credentials = Buffer.from(provided.slice(6), "base64").toString("utf8"); }
  catch { return false; }
  const expected = Buffer.from(`admin:${pass}`);
  const actual = Buffer.from(credentials);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function unauthorized() {
  return new Response(JSON.stringify({ error: "Private workspace authentication required" }),
    { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Product Intelligence - Private"', "content-type": "application/json", "cache-control": "no-store" } });
}
