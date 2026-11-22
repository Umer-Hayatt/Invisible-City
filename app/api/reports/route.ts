import { analyzeReport } from "@/lib/ai";
import {
  duplicateCandidates,
  getIssue,
  recentlyResolvedNearby,
  recordReport,
  reportsByReporter,
} from "@/lib/db";
import { constituencyFor, haversineMeters, nearestNeighborhood } from "@/lib/geo";
import { contributors } from "@/lib/insights";
import { requireRole } from "@/lib/roles";
import { checkImage, photoStore } from "@/lib/photo-store";
import { findDuplicate } from "@/lib/scoring";
import { CATEGORIES, CATEGORY_META, Category } from "@/lib/types";

/** A Citizen's own Reports. Who is asking always comes from the session, never from a parameter. */
export async function GET() {
  const actor = await requireRole("citizen");
  if (actor instanceof Response) return actor;
  return Response.json({
    reports: await reportsByReporter(actor.authId),
    impact: (await contributors(actor.isDemo, actor.authId))[0] ?? null,
  });
}

export async function POST(req: Request) {
  const actor = await requireRole("citizen");
  if (actor instanceof Response) return actor;
  if (actor.suspended) return Response.json({ error: "suspended" }, { status: 403 });
  if (!actor.profileComplete) return Response.json({ error: "profile_incomplete" }, { status: 403 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
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
    return Response.json({ error: "A valid location is required" }, { status: 400 });
  if (!(image instanceof File && image.size > 0) && !description.trim())
    return Response.json({ error: "Add a photo or a description" }, { status: 400 });

  let bytes: Buffer | null = null;
  let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg";
  let photoUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    try {
      checkImage(image);
      bytes = Buffer.from(await image.arrayBuffer());
      mediaType = image.type as typeof mediaType;
      photoUrl = await photoStore().upload(bytes, { mediaType });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  // 1. AI: classify + estimate severity
  const ai = await analyzeReport({
    imageBase64: bytes ? bytes.toString("base64") : null,
    mediaType,
    description,
    categoryHint,
  });

  // 2. AI: duplicate detection against open issues
  const match = findDuplicate(await duplicateCandidates(actor.isDemo), { lat, lng, category: ai.category, hash: imageHash });

  // 3. Recurrence: same problem re-appearing where a repair was made recently
  const recurrence = match
    ? null
    : (await recentlyResolvedNearby(ai.category, actor.isDemo)).find((i) => haversineMeters(lat, lng, i.lat, i.lng) < 60) ?? null;

  const neighborhood = nearestNeighborhood(lat, lng);
  const issueId = await recordReport({
    reporterId: actor.personId,
    isDemo: actor.isDemo,
    description,
    image: photoUrl,
    imageHash,
    lat,
    lng,
    neighborhood,
    constituency: constituencyFor(neighborhood),
    ai,
    categoryLabel: CATEGORY_META[ai.category].label,
    match,
    recurrenceOf: recurrence?.id ?? null,
  });

  return Response.json({
    issueId,
    analysis: ai,
    duplicate: match
      ? {
          issueId: match.issue.id,
          title: match.issue.title,
          score: match.score,
          distance: match.distance,
          imageSimilarity: match.imageSimilarity,
        }
      : null,
    recurrenceOf: recurrence?.id ?? null,
    issue: (await getIssue(issueId, actor.isDemo))?.issue,
  });
}
