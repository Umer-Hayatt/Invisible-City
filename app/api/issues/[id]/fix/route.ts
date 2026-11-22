import { checkImage, MAX_UPLOAD_BYTES, photoStore } from "@/lib/photo-store";
import { requireRole } from "@/lib/roles";
import { canRun, outcomeResponse, recordFix } from "@/lib/workflow";

export const maxDuration = 30;

/** Office staff of the assigned Office: record a Fix with a required after-repair photo and an optional note. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("office");
  if (actor instanceof Response) return actor;
  const issueId = Number((await ctx.params).id);
  if (!Number.isInteger(issueId)) return outcomeResponse("not_found");

  // Refuse before storing a photo that would never be used.
  const allowed = await canRun(actor, issueId, "fix");
  if (allowed !== "ok") return outcomeResponse(allowed);

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "bad_request" }, { status: 400 });
  const note = String(form.get("note") ?? "").trim().slice(0, 1000);
  const image = form.get("afterImage");
  if (!(image instanceof File && image.size > 0)) return Response.json({ error: "photo_required" }, { status: 400 });

  let url: string;
  try {
    checkImage(image);
    url = await photoStore().upload(Buffer.from(await image.arrayBuffer()), { mediaType: image.type });
  } catch (e) {
    if (image.size > MAX_UPLOAD_BYTES) return Response.json({ error: "image_too_large" }, { status: 400 });
    const unsupported = (e as Error).message.startsWith("Only");
    return Response.json({ error: unsupported ? "unsupported_image" : "upload_failed" }, { status: unsupported ? 400 : 502 });
  }
  return outcomeResponse(await recordFix(actor, issueId, url, note));
}
