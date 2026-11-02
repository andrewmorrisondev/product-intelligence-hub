import type { Knowledge, Source, Role, Answer, Claim } from "./types";
export const VALID_ROLES: Role[];
export function normalizeRole(role: string): Role;
export function canRead(entry: Knowledge, role: string): boolean;
export function rankAuthorized(entries: Knowledge[], question: string, role: string): {entry: Knowledge;score:number}[];
export function groundedAnswer(entries: Knowledge[], sources: Source[], question: string, role: string): Answer;
export function classifyTitle(title: string, body: string): { category: string; releaseState: string; summary: string; claims: Claim[]; audiences: Role[]; method: "rules" };
