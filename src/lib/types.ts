export type Role = "engineering" | "product" | "support" | "marketing";
export type Status = "approved" | "draft" | "rejected";
export type Claim = { text: string; sourceIds: string[] };
export type Source = {
  id: string;
  provider: string;
  title: string;
  url: string | null;
  body: string;
  updatedAt: string;
  label: string;
};
export type Knowledge = {
  id: string;
  title: string;
  summary: string;
  category: string;
  releaseState: string;
  version: number;
  status: Status;
  audiences: Role[];
  claims: Claim[];
  sourceIds: string[];
  updatedAt: string;
  method: "rules" | "llm" | "curated";
};
export type Dataset = {
  company: string;
  workspace: "demo" | "private";
  sources: Source[];
  knowledge: Knowledge[];
};
export type Answer = {
  answer: string;
  citations: { sourceId: string; label: string; url: string | null }[];
  matchedEntry: string | null;
  evidenceCount: number;
  method: "grounded-extract";
};
