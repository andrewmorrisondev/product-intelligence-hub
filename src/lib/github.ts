import { createHash } from "node:crypto";
import { prisma } from "./db";
import { classifyPR } from "./classification";

type GitHubPR = {
  number: number; title: string; body: string | null; html_url: string; state: string;
  merged_at: string | null; updated_at: string; draft: boolean;
};
const ghName = /^[A-Za-z0-9_.-]{1,100}$/;

export async function syncConfiguredRepository() {
  const { GITHUB_OWNER: owner, GITHUB_REPO: repo, GITHUB_TOKEN: token } = process.env;
  if (!owner || !repo || !ghName.test(owner) || !ghName.test(repo)) {
    throw new Error("Configure a valid GITHUB_OWNER and GITHUB_REPO in your environment");
  }
  const url = new URL(`https://api.github.com/repos/${owner}/${repo}/pulls`);
  url.searchParams.set("state", "all");
  url.searchParams.set("sort", "updated");
  url.searchParams.set("direction", "desc");
  url.searchParams.set("per_page", "30");
  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "product-intelligence-hub-mvp", ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`GitHub returned HTTP ${res.status}; check repository access`);
  const pullRequests = await res.json() as GitHubPR[];
  if (!Array.isArray(pullRequests)) throw new Error("Unexpected GitHub API response");
  let created = 0, updated = 0, unchanged = 0;
  for (const pr of pullRequests) {
    const key = `${owner}/${repo}#${pr.number}`;
    const body = `PR #${pr.number}\nTitle: ${pr.title}\nState: ${pr.state}\nMerged: ${pr.merged_at ?? "not merged"}\nDraft: ${pr.draft}\nDescription:\n${pr.body || "(none)"}`;
    const hash = createHash("sha256").update(body).digest("hex");
    const existing = await prisma.sourceDocument.findUnique({ where: { externalKey: key }, include: { entries: true } });
    if (existing?.contentHash === hash && existing.entries.length) { unchanged++; continue; }
    // Save source first, so the new classification can point to an actual persisted source ID.
    const source = await prisma.sourceDocument.upsert({
      where: { externalKey: key },
      create: { provider: "GitHub", externalKey: key, sourceUrl: pr.html_url, title: pr.title,
        body, contentHash: hash, sourceAt: new Date(pr.updated_at) },
      update: { sourceUrl: pr.html_url, title: pr.title, body, contentHash: hash, sourceAt: new Date(pr.updated_at) },
    });
    const classified = await classifyPR(pr.title, pr.body || "", source.id);
    await prisma.$transaction(async (tx) => {
      const entry = await tx.knowledgeEntry.findFirst({ where: { sourceId: source.id } });
      if (entry) {
        const nextVersion = entry.currentVersion + 1;
        await tx.knowledgeEntry.update({ where: { id: entry.id }, data: { currentVersion: nextVersion, title: pr.title } });
        await tx.knowledgeRevision.create({ data: { entryId: entry.id, version: nextVersion,
          summary: classified.summary, category: classified.category, releaseState: classified.releaseState,
          audiences: classified.audiences, claims: classified.claims, status: "draft", method: classified.method } });
      } else {
        await tx.knowledgeEntry.create({ data: { sourceId: source.id, title: pr.title, currentVersion: 1,
          revisions: { create: { version: 1, summary: classified.summary, category: classified.category,
            releaseState: classified.releaseState, audiences: classified.audiences,
            claims: classified.claims, status: "draft", method: classified.method } } } });
      }
    });
    if (existing) updated++; else created++;
  }
  return { repository: `${owner}/${repo}`, checked: pullRequests.length, created, updated, unchanged };
}
