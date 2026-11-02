import { demoData } from "@/lib/demo";
import { getPrivateDataset } from "@/lib/db";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { groundedAnswer } from "@/lib/core.mjs";
import { z } from "zod";

const questionSchema = z.object({ question: z.string().trim().min(3).max(400),
  role: z.enum(["engineering", "product", "support", "marketing"]),
  workspace: z.enum(["demo", "private"]).default("demo") });
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid question, role, or workspace" }, { status: 400 });
  if (parsed.data.workspace === "private" && !isAuthorized(request.headers)) return unauthorized();
  if (parsed.data.workspace === "private" && !process.env.DATABASE_URL) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const data = parsed.data.workspace === "private" ? await getPrivateDataset() : demoData;
    return Response.json(groundedAnswer(data.knowledge, data.sources, parsed.data.question, parsed.data.role),
      { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to retrieve knowledge" }, { status: 500 });
  }
}
