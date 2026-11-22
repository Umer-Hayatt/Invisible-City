import { addEvent, getIssue, markResolved } from "@/lib/db";
import { requireRole } from "@/lib/roles";
import { checkImage, photoStore } from "@/lib/photo-store";

/** Authority (temporary, until the Office workflow in PLAN step 6): mark resolved with an after-repair photo (Before vs After proof). */
export async function POST(req: Request, ctx: RouteContext<"/api/issues/[id]/resolve">) {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  const { id } = await ctx.params;
  const current = await getIssue(Number(id), actor.isDemo);
  if (!current) return Response.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  const note = String(form.get("note") ?? "").slice(0, 1000) || "Repair completed.";
  const image = form.get("afterImage");

  let afterUrl: string | null = current.issue.after_image;
  if (image instanceof File && image.size > 0) {
    try {
      checkImage(image);
      afterUrl = await photoStore().upload(Buffer.from(await image.arrayBuffer()), { mediaType: image.type });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 });
    }
  }
  const now = await markResolved(current.issue.id, afterUrl, note);
  await addEvent(current.issue.id, "resolved", `Resolved: ${note}${afterUrl ? " (after-repair photo uploaded)" : ""}`, now);
  return Response.json(await getIssue(current.issue.id, actor.isDemo));
}
