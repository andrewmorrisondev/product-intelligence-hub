import { prisma } from "@/lib/db";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { z } from "zod";
const schema = z.object({ entryId: z.string().min(1), version: z.number().int().positive(),
  decision: z.enum(["approved", "rejected"]) });
export async function POST(req: Request) {
  if (!isAuthorized(req.headers)) return unauthorized();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid review payload" }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.knowledgeEntry.findUnique({ where: { id: parsed.data.entryId },
        include: { revisions: { where: { version: parsed.data.version }, take: 1 } } });
      if (!entry || entry.currentVersion !== parsed.data.version || entry.revisions[0]?.status !== "draft") {
        return { ok: false, message: "Entry changed or is not awaiting review" };
      }
      const current = entry.revisions[0];
      const nextVersion = entry.currentVersion + 1;
      const update = await tx.knowledgeEntry.updateMany({
        where: { id: entry.id, currentVersion: entry.currentVersion }, data: { currentVersion: nextVersion },
      });
      if (update.count !== 1) return { ok: false, message: "Concurrent review; reload and try again" };
      await tx.knowledgeRevision.create({ data: { entryId: entry.id, version: nextVersion,
        summary: current.summary, category: current.category, releaseState: current.releaseState,
        audiences: current.audiences, claims: JSON.parse(JSON.stringify(current.claims ?? [])),
        status: parsed.data.decision, method: current.method,
        approvedBy: parsed.data.decision === "approved" ? "workspace-admin" : null,
        approvedAt: parsed.data.decision === "approved" ? new Date() : null } });
      return { ok: true, version: nextVersion, decision: parsed.data.decision };
    });
    return Response.json(result, { status: result.ok ? 200 : 409 });
  } catch { return Response.json({ error: "Unable to save review" }, { status: 500 }); }
}
