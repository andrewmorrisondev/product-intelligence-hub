import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { Dataset, Knowledge, Source, Role, Claim } from "./types";

declare global { var __pi_prisma: PrismaClient | undefined }
export const prisma = globalThis.__pi_prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.__pi_prisma = prisma;

const claimSchema = z.array(z.object({ text: z.string(), sourceIds: z.array(z.string()) }));
const roles = new Set<Role>(["engineering", "product", "support", "marketing"]);
const parseRoles = (values: string[]): Role[] => values.filter((v): v is Role => roles.has(v as Role));

export async function getPrivateDataset(): Promise<Dataset> {
  const rows = await prisma.knowledgeEntry.findMany({
    include: { source: true, revisions: { orderBy: { version: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });
  const sources: Source[] = rows.map(({ source }) => ({
    id: source.id, provider: source.provider, title: source.title,
    body: source.body, url: source.sourceUrl, label: `GitHub ${source.externalKey.split("#").at(-1)}`,
    updatedAt: source.updatedAt.toISOString(),
  }));
  const knowledge: Knowledge[] = rows.flatMap((row) => {
    const r = row.revisions[0];
    if (!r) return [];
    const parsed = claimSchema.safeParse(r.claims);
    const claims: Claim[] = parsed.success ? parsed.data : [];
    return [{ id: row.id, title: row.title, summary: r.summary, category: r.category,
      releaseState: r.releaseState, version: r.version,
      status: r.status === "approved" ? "approved" as const : r.status === "rejected" ? "rejected" as const : "draft" as const,
      audiences: parseRoles(r.audiences), claims, sourceIds: [row.sourceId],
      updatedAt: r.createdAt.toISOString(),
      method: r.method === "llm" ? "llm" as const : "rules" as const }];
  });
  return { company: "Morrison Developers", workspace: "private", sources, knowledge };
}
