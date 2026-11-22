import { analyzeReport } from "@/lib/ai";
import { getIssue, reportsByReporter } from "@/lib/db";
import { constituencyFor, nearestNeighborhood } from "@/lib/geo";
import { contributors } from "@/lib/insights";
import { requireRole } from "@/lib/roles";
import { checkImage, MAX_UPLOAD_BYTES, photoStore } from "@/lib/photo-store";
import { DAILY_REPORT_LIMIT, reportsInLastDay, submitReport, wouldBeAlreadyReported } from "@/lib/reporting";
import { CATEGORIES, CATEGORY_META, Category } from "@/lib/types";

export const maxDuration = 30;

/** A Citizen's own Reports. Who is asking always comes from the session, never from a parameter. */
export async function GET() {
  const actor = await requireRole("citizen");
  if (actor instanceof Response) return actor;
  return Response.json({
    reports: await reportsByReporter(actor.authId),
    impact: (await contributors(actor.isDemo, actor.authId))[0] ?? null,
  });
}

/** Rules run in the order of the spec: who you are, the daily limit, photo and civic check, duplicate, then merge or create. */
export async function POST(req: Request) {
  // 1. Signed in, profile complete, not suspended
  const actor = await requireRole("citizen");
  if (actor instanceof Response) return actor;
  if (actor.suspended) return Response.json({ error: "suspended" }, { status: 403 });
  if (!actor.profileComplete) return Response.json({ error: "profile_incomplete" }, { status: 403 });

  // 2. Fewer than 10 Reports in the last 24 hours (Demo accounts too)
  if ((await reportsInLastDay(actor.personId)) >= DAILY_REPORT_LIMIT)
    return Response.json({ error: "daily_limit" }, { status: 429 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const description = String(form.get("description") ?? "").slice(0, 2000);
  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  const hashRaw = String(form.get("imageHash") ?? "");
  const imageHash = /^[0-9a-f]{16}$/.test(hashRaw) ? hashRaw : null;
  const hintRaw = String(form.get("categoryHint") ?? "");
  const categoryHint = (CATEGORIES as readonly string[]).includes(hintRaw) ? (hintRaw as Category) : null;
  const image = form.get("image");

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return Response.json({ error: "invalid_location" }, { status: 400 });

  // 3. Photo present, and the Vision AI says it is a civic problem
  if (!(image instanceof File && image.size > 0)) return Response.json({ error: "photo_required" }, { status: 400 });
  let bytes: Buffer;
  try {
    checkImage(image);
    bytes = Buffer.from(await image.arrayBuffer());
  } catch {
    return Response.json({ error: image.size > MAX_UPLOAD_BYTES ? "image_too_large" : "unsupported_image" }, { status: 400 });
  }
  const mediaType = image.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  const reading = await analyzeReport({ imageBase64: bytes.toString("base64"), mediaType, description, categoryHint });
  if (!reading.is_civic_issue) return Response.json({ error: "not_civic" }, { status: 422 });
  // The Citizen may change the Category before sending; their choice wins over the AI's suggestion.
  const ai = categoryHint ? { ...reading, category: categoryHint } : reading;

  const neighborhood = nearestNeighborhood(lat, lng);
  const draft = {
    reporterId: actor.personId,
    isDemo: actor.isDemo,
    description,
    image: null as string | null,
    imageHash,
    lat,
    lng,
    neighborhood,
    constituency: constituencyFor(neighborhood),
    ai,
    categoryLabel: CATEGORY_META[ai.category].label,
  };

  // 4. Already reported? Refused before the photo is stored.
  if (await wouldBeAlreadyReported(draft)) return Response.json({ error: "already_reported" }, { status: 409 });

  let photoUrl: string;
  try {
    photoUrl = await photoStore().upload(bytes, { mediaType });
  } catch {
    return Response.json({ error: "upload_failed" }, { status: 502 });
  }

  // 5. Recurrence check, then merge or create, in one transaction (the duplicate rule is re-checked inside it)
  const out = await submitReport({ ...draft, image: photoUrl });
  if (out.status === "daily_limit") return Response.json({ error: "daily_limit" }, { status: 429 });
  if (out.status === "already_reported") return Response.json({ error: "already_reported" }, { status: 409 });

  return Response.json({
    issueId: out.issueId,
    analysis: ai,
    duplicate: out.match
      ? {
          issueId: out.match.issue.id,
          title: out.match.issue.title,
          score: out.match.score,
          distance: out.match.distance,
          imageSimilarity: out.match.imageSimilarity,
        }
      : null,
    recurrenceOf: out.recurrenceOf,
    issue: (await getIssue(out.issueId, actor.isDemo))?.issue,
  });
}
