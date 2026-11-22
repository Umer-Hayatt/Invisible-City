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
import { checkImage, photoStore } from "@/lib/photo-store";
import { findDuplicate } from "@/lib/scoring";
import { CATEGORIES, CATEGORY_META, Category } from "@/lib/types";

export async function GET(req: Request) {
  const reporterId = new URL(req.url).searchParams.get("reporterId");
  if (!reporterId) return Response.json({ error: "reporterId required" }, { status: 400 });
  return Response.json({
    reports: await reportsByReporter(reporterId),
    impact: (await contributors(reporterId))[0] ?? null,
  });
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  }
  const description = String(form.get("description") ?? "").slice(0, 2000);
  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  const reporterId = String(form.get("reporterId") ?? "").slice(0, 64) || "anonymous";
  const reporterName = String(form.get("reporterName") ?? "").slice(0, 80) || null;
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
  const match = findDuplicate(await duplicateCandidates(), { lat, lng, category: ai.category, hash: imageHash });

  // 3. Recurrence: same problem re-appearing where a repair was made recently
  const recurrence = match
    ? null
    : (await recentlyResolvedNearby(ai.category)).find((i) => haversineMeters(lat, lng, i.lat, i.lng) < 60) ?? null;

  const neighborhood = nearestNeighborhood(lat, lng);
  const issueId = await recordReport({
    reporterAuthId: reporterId,
    reporterName,
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
    issue: (await getIssue(issueId))?.issue,
  });
}
