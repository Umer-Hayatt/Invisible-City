import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { AIAnalysis, CATEGORIES, Category, SEVERITIES, Severity } from "./types";

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

let client: Anthropic | null = null;
function claudeEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
function groqEnabled() {
  return Boolean(process.env.GROQ_API_KEY);
}
export function aiProvider(): "claude" | "groq" | "heuristic" {
  return claudeEnabled() ? "claude" : groqEnabled() ? "groq" : "heuristic";
}
export function aiEnabled() {
  return claudeEnabled() || groqEnabled();
}
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export async function analyzeReport(input: {
  imageBase64: string | null;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  description: string;
  categoryHint?: Category | null;
}): Promise<AIAnalysis> {
  const hasInput = Boolean(input.imageBase64 || input.description.trim());
  if (hasInput && claudeEnabled()) {
    try {
      return await analyzeWithClaude(input);
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        console.error(`[ai] Claude API error ${err.status}: ${err.message}`);
      } else {
        console.error("[ai] Claude analysis failed", err);
      }
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

async function analyzeWithGroq(input: {
  imageBase64: string | null;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  description: string;
  categoryHint?: Category | null;
}): Promise<AIAnalysis> {
  const content: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [
    {
      type: "text",
      text: [
        `Citizen description: ${input.description.trim() || "(none provided)"}`,
        input.categoryHint ? `Citizen's suggested category: ${input.categoryHint}` : "",
        "Classify this report.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
  if (input.imageBase64) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${input.mediaType};base64,${input.imageBase64}` },
    });
  }

  const schemaHint = JSON.stringify(z.toJSONSchema(AnalysisSchema));
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
      temperature: 0.2,
      max_completion_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\nRespond ONLY with a JSON object matching this JSON Schema:\n${schemaHint}`,
        },
        { role: "user", content },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Groq API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no content");
  const out = AnalysisSchema.parse(JSON.parse(text));
  return {
    ...out,
    confidence: Math.max(0, Math.min(1, out.confidence)),
    hazards: out.hazards.slice(0, 3),
    source: "groq",
  };
}

async function analyzeWithClaude(input: {
  imageBase64: string | null;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  description: string;
  categoryHint?: Category | null;
}): Promise<AIAnalysis> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (input.imageBase64) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: input.mediaType, data: input.imageBase64 },
    });
  }
  content.push({
    type: "text",
    text: [
      `Citizen description: ${input.description.trim() || "(none provided)"}`,
      input.categoryHint ? `Citizen's suggested category: ${input.categoryHint}` : "",
      "Classify this report.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const response = await getClient().beta.messages.parse({
    model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(AnalysisSchema) },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`No structured output (stop_reason=${response.stop_reason})`);
  }
  const out = response.parsed_output;
  return {
    ...out,
    confidence: Math.max(0, Math.min(1, out.confidence)),
    hazards: out.hazards.slice(0, 3),
    source: "claude",
  };
}

// ---------------------------------------------------------------------------
// Offline fallback so the demo works without an API key.
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
    title: description.trim()
      ? description.trim().split(/[.!?\n]/)[0].slice(0, 60)
      : `Reported ${label}`,
    summary: description.trim() || `Citizen reported a ${label} issue.`,
    hazards: [],
    source: "heuristic",
  };
}
