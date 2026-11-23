import { nowMs } from "./clock";
import { haversineMeters } from "./geo";
import { Category, Issue, SEVERITY_WEIGHT, Severity } from "./types";

const HAZARD_BONUS: Partial<Record<Category, number>> = {
  road_damage: 6,
  water_leak: 5,
  drainage: 5,
  accessibility: 6,
  streetlight: 3,
};

/** Priority 0-100: severity dominates, corroborating reports and age push it up. */
export function computePriority(issue: {
  severity: Severity;
  category: Category;
  report_count: number;
  created_at: string;
  status: string;
  recurrence_of?: number | null;
}) {
  if (issue.status === "resolved" || issue.status === "closed_unconfirmed") return 0;
  const sev = SEVERITY_WEIGHT[issue.severity] * 15; // 15..60
  const crowd = Math.min(20, 8 * Math.log2(Math.max(1, issue.report_count))); // 0..20
  const ageDays = (nowMs() - new Date(issue.created_at).getTime()) / 86_400_000;
  const age = Math.min(10, Math.max(0, ageDays) * 0.4); // 0..10
  const hazard = HAZARD_BONUS[issue.category] ?? 0;
  const recurring = issue.recurrence_of ? 4 : 0;
  return Math.round(Math.min(100, sev + crowd + age + hazard + recurring));
}

export function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_WEIGHT[a] >= SEVERITY_WEIGHT[b] ? a : b;
}

/** Hamming distance between two 64-bit hex dHashes. */
export function hamming(a: string, b: string) {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

const RELATED: Category[][] = [
  ["water_leak", "drainage"],
  ["blocked_footpath", "accessibility"],
];
function categoryScore(a: Category, b: Category) {
  if (a === b) return 1;
  if (RELATED.some((g) => g.includes(a) && g.includes(b))) return 0.6;
  return 0;
}

export interface DuplicateMatch {
  issue: Issue;
  score: number;
  distance: number;
  imageSimilarity: number | null;
}

export const DUPLICATE_RADIUS_M = 150;
export const DUPLICATE_THRESHOLD = 0.6;

/**
 * Combines location proximity, category agreement and perceptual-image similarity
 * into one 0-1 duplicate score and returns the best matching open issue.
 */
export function findDuplicate(
  candidates: (Issue & { hashes: string[] })[],
  report: { lat: number; lng: number; category: Category; hash: string | null },
): DuplicateMatch | null {
  let best: DuplicateMatch | null = null;
  for (const issue of candidates) {
    const distance = haversineMeters(report.lat, report.lng, issue.lat, issue.lng);
    if (distance > DUPLICATE_RADIUS_M) continue;
    const geo = Math.max(0, 1 - distance / DUPLICATE_RADIUS_M);
    const cat = categoryScore(report.category, issue.category);

    let imageSimilarity: number | null = null;
    if (report.hash && issue.hashes.length) {
      const bestHam = Math.min(...issue.hashes.map((h) => hamming(report.hash!, h)));
      imageSimilarity = Math.max(0, 1 - bestHam / 24);
    }
    const score =
      imageSimilarity === null
        ? 0.6 * geo + 0.4 * cat
        : 0.45 * geo + 0.3 * cat + 0.25 * imageSimilarity;

    if (score >= DUPLICATE_THRESHOLD && (!best || score > best.score)) {
      best = { issue, score: Math.round(score * 100) / 100, distance: Math.round(distance), imageSimilarity };
    }
  }
  return best;
}
