export const CATEGORIES = [
  "road_damage",
  "garbage",
  "streetlight",
  "water_leak",
  "drainage",
  "electrical_hazard",
  "building_damage",
  "blocked_footpath",
  "accessibility",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const STATUSES = ["open", "assigned", "in_progress", "resolved"] as const;
export type Status = (typeof STATUSES)[number];

export const TEAMS = [
  "Road Maintenance Unit",
  "Sanitation Crew",
  "Electrical Works",
  "Water & Sewerage",
  "Accessibility Task Force",
  "General Maintenance",
] as const;

export const CATEGORY_META: Record<
  Category,
  { label: string; team: (typeof TEAMS)[number] }
> = {
  road_damage: { label: "Road damage / pothole", team: "Road Maintenance Unit" },
  garbage: { label: "Garbage overflow", team: "Sanitation Crew" },
  streetlight: { label: "Broken streetlight", team: "Electrical Works" },
  water_leak: { label: "Water leak", team: "Water & Sewerage" },
  drainage: { label: "Blocked drain / flooding", team: "Water & Sewerage" },
  blocked_footpath: { label: "Blocked footpath", team: "General Maintenance" },
  accessibility: { label: "Accessibility barrier", team: "Accessibility Task Force" },
  electrical_hazard: { label: "Electrical hazard", team: "Electrical Works" },
  building_damage: { label: "Building damage", team: "General Maintenance" },
  other: { label: "Other", team: "General Maintenance" },
};

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export interface AIAnalysis {
  is_civic_issue: boolean;
  category: Category;
  severity: Severity;
  confidence: number;
  title: string;
  summary: string;
  hazards: string[];
  source: "claude" | "groq" | "heuristic";
}

export interface Issue {
  id: number;
  category: Category;
  severity: Severity;
  title: string;
  summary: string;
  lat: number;
  lng: number;
  neighborhood: string;
  status: Status;
  priority: number;
  assigned_team: string | null; // the assigned Office's name
  office_id: number | null;
  department: string;
  constituency: string | null;
  report_count: number;
  cover_image: string | null;
  after_image: string | null;
  resolution_note: string | null;
  recurrence_of: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface Report {
  id: number;
  issue_id: number;

  reporter_name: string | null;
  description: string;
  image: string | null;
  image_hash: string | null;
  lat: number;
  lng: number;
  ai_category: Category;
  ai_severity: Severity;
  ai_confidence: number;
  ai_summary: string;
  ai_source: string;
  duplicate_score: number | null;
  created_at: string;
}

export interface IssueEvent {
  id: number;
  issue_id: number;
  kind: string;
  message: string;
  created_at: string;
}
