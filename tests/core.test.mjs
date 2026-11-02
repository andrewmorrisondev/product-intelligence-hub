import test from "node:test";
import assert from "node:assert/strict";
import { groundedAnswer, classifyTitle, canRead } from "../src/lib/core.mjs";

const sources = [{ id: "approved-flag", label: "Feature flag", url: null }, { id: "secret", label: "Secret", url: null }];
const entries = [
  { id: "1", title: "Recurring appointments", summary: "Not released", category: "Feature", status: "approved", audiences: ["support", "engineering"], claims: [{ text: "Recurring appointments are not publicly available.", sourceIds: ["approved-flag"] }] },
  { id: "2", title: "Secret AI scheduling assistant", summary: "Confidential", category: "Feature", status: "approved", audiences: ["engineering"], claims: [{ text: "The secret assistant exists.", sourceIds: ["secret"] }] },
  { id: "3", title: "Dashboard release", summary: "Launch Friday", category: "Feature", status: "draft", audiences: ["support", "engineering"], claims: [{ text: "Dashboard launches Friday.", sourceIds: ["approved-flag"] }] }
];

test("support sees grounded approved evidence", () => {
  const result = groundedAnswer(entries, sources, "Can customers use recurring appointments?", "support");
  assert.match(result.answer, /not publicly available/i);
  assert.equal(result.citations[0].sourceId, "approved-flag");
});
test("restricted content is excluded before retrieval", () => {
  const result = groundedAnswer(entries, sources, "secret AI scheduling assistant", "support");
  assert.equal(result.evidenceCount, 0);
  assert.doesNotMatch(result.answer, /secret assistant exists/i);
});
test("engineering can retrieve restricted approved knowledge", () => {
  const result = groundedAnswer(entries, sources, "secret AI scheduling assistant", "engineering");
  assert.match(result.answer, /secret assistant exists/i);
});
test("draft entries cannot answer questions", () => {
  const result = groundedAnswer(entries, sources, "dashboard release", "engineering");
  assert.equal(result.matchedEntry, null);
});
test("unknown roles default to lowest-privilege support", () => {
  assert.equal(canRead(entries[1], "admin"), false);
});
test("missing source yields refusal instead of unsupported claim", () => {
  const result = groundedAnswer([{ ...entries[0], claims: [{ text: "A claim", sourceIds: ["nonexistent"] }] }], sources, "recurring appointments", "support");
  assert.match(result.answer, /can't substantiate/i);
});
test("classifying a merged PR does not infer rollout", () => {
  const result = classifyTitle("Add recurring appointments", "Implemented and merged");
  assert.equal(result.releaseState, "unknown");
  assert.equal(result.audiences[0], "engineering");
});
