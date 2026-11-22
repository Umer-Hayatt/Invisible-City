import { z } from "zod";
import { AIAnalysis, CATEGORIES, Category, SEVERITIES, Severity } from "./types";

/**
 * Vision AI adapter. Real: Gemini first, then Groq, then an offline keyword guess, so a Report is
 * never blocked by a provider being down. Tests swap the whole thing with `setAnalyzer`.
 */
export interface AnalyzeInput {
  imageBase64: string | null;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  description: string;
  categoryHint?: Category | null;
}

const AnalysisSchema = z.object({
  is_civic_issue: z
    .boolean()
    .describe("False if the photo/text does not show a public infrastructure or civic problem."),
  category: z.enum(CATEGORIES),
  severity: z.enum(SEVERITIES),
  confidence: z.number().describe("0 to 1 confidence in the category."),
  title: z.string().describe("Short title, max 8 words, e.g. 'Deep pothole across left lane'."),
  summary: z
    .string()
    .describe("One or two sentences a city official can act on: what, how big, risk."),
  hazards: z.array(z.string()).describe("Up to 3 concrete risks, e.g. 'motorcycle accidents'."),
});

const SYSTEM_PROMPT = `You are the triage engine for "INvisible City", a civic issue reporting platform for Islamabad, Pakistan.
Citizens submit a photo and/or short description of a problem. Classify it so city departments can prioritise repairs.

Categories:
- road_damage: potholes, cracks, broken asphalt, missing manhole covers on roads
- garbage: overflowing bins, dumped waste, litter piles
- streetlight: broken, dark or damaged street lights, exposed wiring on poles
- water_leak: burst/leaking water pipes, running water from mains
- drainage: blocked drains, sewage overflow, standing flood water
- blocked_footpath: footpaths obstructed by encroachment, debris, parked vehicles, construction
- accessibility: missing ramps, broken tactile paving, barriers that block wheelchair or visually impaired users
- electrical_hazard: exposed or sparking wires, damaged transformers, live cables on the ground
- building_damage: cracked, crumbling or collapsing walls, roofs and public building structures
- other: a genuine civic problem that fits none of the above

Severity rubric (judge from visible size and risk to people):
- low: cosmetic or minor inconvenience
- medium: noticeable, degrading, should be fixed within weeks
- high: likely to cause injury, vehicle damage, health risk, or blocks access
- critical: immediate danger to life (open manhole, live wires, large sinkhole, sewage in homes)

If the image is unrelated to civic infrastructure (selfie, meme, indoor object), set is_civic_issue=false, category=other, severity=low.
Write the title and summary in plain English.`;

const geminiEnabled = () => Boolean(process.env.GEMINI_API_KEY);
const groqEnabled = () => Boolean(process.env.GROQ_API_KEY);

export function aiProvider(): "gemini" | "groq" | "heuristic" {
  return geminiEnabled() ? "gemini" : groqEnabled() ? "groq" : "heuristic";
}

let override: ((input: AnalyzeInput) => Promise<AIAnalysis>) | null = null;
/** Tests only: replace the Vision AI with a scripted reading. Pass null to restore the real chain. */
export function setAnalyzer(fn: ((input: AnalyzeInput) => Promise<AIAnalysis>) | null) {
  override = fn;
}

export async function analyzeReport(input: AnalyzeInput): Promise<AIAnalysis> {
  if (override) return override(input);
  const hasInput = Boolean(input.imageBase64 || input.description.trim());
  if (hasInput && geminiEnabled()) {
    try {
      return await analyzeWithGemini(input);
    } catch (err) {
      console.error("[ai] Gemini analysis failed - trying Groq", err);
    }
  }
  if (hasInput && groqEnabled()) {
    try {
      return await analyzeWithGroq(input);
    } catch (err) {
      console.error("[ai] Groq analysis failed - using heuristic", err);
    }
  }
  return heuristicAnalysis(input.description, input.categoryHint ?? null);
}

const userText = (input: AnalyzeInput) =>
  [
    `Citizen description: ${input.description.trim() || "(none provided)"}`,
    input.categoryHint ? `Citizen's suggested category: ${input.categoryHint}` : "",
    "Classify this report.",
  ]
    .filter(Boolean)
    .join("\n");

const jsonInstruction = () =>
  `${SYSTEM_PROMPT}\n\nRespond ONLY with a JSON object matching this JSON Schema:\n${JSON.stringify(z.toJSONSchema(AnalysisSchema))}`;

function finish(raw: unknown, source: "gemini" | "groq"): AIAnalysis {
  const out = AnalysisSchema.parse(raw);
  return {
    ...out,
    confidence: Math.max(0, Math.min(1, out.confidence)),
    hazards: out.hazards.slice(0, 3),
    source,
  };
}

async function analyzeWithGemini(input: AnalyzeInput): Promise<AIAnalysis> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [
    { text: userText(input) },
  ];
  if (input.imageBase64) parts.push({ inline_data: { mime_type: input.mediaType, data: input.imageBase64 } });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: jsonInstruction() }] },
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return finish(JSON.parse(text), "gemini");
}

async function analyzeWithGroq(input: AnalyzeInput): Promise<AIAnalysis> {
  const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
    { type: "text", text: userText(input) },
  ];
  if (input.imageBase64) {
    content.push({ type: "image_url", image_url: { url: `data:${input.mediaType};base64,${input.imageBase64}` } });
  }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
      temperature: 0.2,
      max_completion_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: jsonInstruction() },
        { role: "user", content },
      ],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Groq API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no content");
  return finish(JSON.parse(text), "groq");
}

// ---------------------------------------------------------------------------
// Offline fallback so the app works without an API key.
// ---------------------------------------------------------------------------
const KEYWORDS: Record<Exclude<Category, "other">, string[]> = {
  electrical_hazard: ["sparking", "transformer", "exposed wire", "electric shock", "live wire", "short circuit"],
  building_damage: ["building", "wall", "collapse", "crumbling", "roof", "facade", "structure"],
  road_damage: ["pothole", "crack", "road", "asphalt", "manhole", "sinkhole", "bump", "gaddha"],
  garbage: ["garbage", "trash", "waste", "rubbish", "litter", "bin", "dump", "kachra", "smell"],
  streetlight: ["light", "lamp", "dark", "streetlight", "pole", "bulb", "wire"],
  water_leak: ["leak", "pipe", "burst", "water", "tap", "main"],
  drainage: ["drain", "sewage", "sewer", "flood", "nala", "clog", "overflow", "standing water"],
  blocked_footpath: ["footpath", "sidewalk", "pavement", "encroach", "blocked", "parked", "debris"],
  accessibility: ["wheelchair", "ramp", "disabled", "accessib", "blind", "tactile", "stairs", "elderly"],
};
const SEVERE_WORDS = ["dangerous", "accident", "injur", "deep", "huge", "large", "urgent", "children", "live wire", "open manhole", "sewage", "flood"];
const CRITICAL_WORDS = ["live wire", "open manhole", "sinkhole", "electrocut", "collapsed"];

export function heuristicAnalysis(description: string, hint: Category | null): AIAnalysis {
  const text = description.toLowerCase();
  let category: Category = hint ?? "other";
  let bestHits = 0;
  if (!hint) {
    for (const [cat, words] of Object.entries(KEYWORDS)) {
      const hits = words.filter((w) => text.includes(w)).length;
      if (hits > bestHits) {
        bestHits = hits;
        category = cat as Category;
      }
    }
  }
  let severity: Severity = "medium";
  if (CRITICAL_WORDS.some((w) => text.includes(w))) severity = "critical";
  else if (SEVERE_WORDS.some((w) => text.includes(w))) severity = "high";
  else if (/(small|minor|slight)/.test(text)) severity = "low";

  const label = category.replace("_", " ");
  return {
    is_civic_issue: true,
    category,
    severity,
    confidence: hint ? 0.7 : bestHits ? Math.min(0.85, 0.45 + bestHits * 0.15) : 0.3,
    title: description.trim() ? description.trim().split(/[.!?\n]/)[0].slice(0, 60) : `Reported ${label}`,
    summary: description.trim() || `Citizen reported a ${label} issue.`,
    hazards: [],
    source: "heuristic",
  };
}
