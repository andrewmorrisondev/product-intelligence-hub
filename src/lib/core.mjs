// Pure functions: no frameworks, database calls, or secrets. Tested via Node's built-in test runner.
export const VALID_ROLES = ["engineering", "product", "support", "marketing"];

export function normalizeRole(role) {
  return VALID_ROLES.includes(role) ? role : "support";
}

export function canRead(entry, role) {
  return entry.status === "approved" && entry.audiences.includes(normalizeRole(role));
}

function tokens(text) {
  return new Set(String(text).toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
}

export function rankAuthorized(entries, question, role) {
  const q = tokens(question);
  return entries.filter((e) => canRead(e, role))
    .map((entry) => {
      const title = tokens(entry.title);
      const body = tokens(`${entry.summary} ${entry.category}`);
      let score = 0;
      for (const word of q) {
        if (title.has(word)) score += 5;
        if (body.has(word)) score += 1;
      }
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
}

export function groundedAnswer(entries, sources, question, role) {
  const ranked = rankAuthorized(entries, question, role);
  if (ranked.length === 0) {
    return { answer: "I couldn't find approved information available to this role that answers that question. This isn't evidence that a feature doesn't exist.", citations: [], matchedEntry: null, evidenceCount: 0, method: "grounded-extract" };
  }
  const entry = ranked[0].entry;
  // Only claim content explicitly stored in approved entries, not text invented by a model.
  const statements = entry.claims.map((c) => c.text).filter(Boolean);
  const sourceIdSet = new Set(entry.claims.flatMap((c) => c.sourceIds));
  const byId = new Map(sources.map((s) => [s.id, s]));
  const citations = [...sourceIdSet].map((id) => byId.get(id)).filter(Boolean).map((s) => ({ sourceId: s.id, label: s.label, url: s.url }));
  if (!citations.length) {
    return { answer: "I found a relevant approved record, but its source references are unavailable, so I can't substantiate an answer.", citations: [], matchedEntry: entry.id, evidenceCount: 0, method: "grounded-extract" };
  }
  return { answer: statements.join(" ") || entry.summary, citations, matchedEntry: entry.id, evidenceCount: citations.length, method: "grounded-extract" };
}

export function classifyTitle(title, body) {
  const value = `${title} ${body}`.toLowerCase();
  const category = /fix|bug|error|repair|patch/.test(value) ? "Bug fix"
    : /refactor|cleanup|chore|dependencies|upgrade/.test(value) ? "Maintenance"
      : /incident|rollback|outage/.test(value) ? "Incident" : "Feature";
  return { category, releaseState: "unknown", summary: `Proposed ${category.toLowerCase()} based on PR: ${title}. Merge status does not establish customer availability.`, claims: [{ text: `Pull request proposes: ${title}.`, sourceIds: [] }], audiences: ["engineering"], method: "rules" };
}
