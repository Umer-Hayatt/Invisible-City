import { contractPdfFor } from "@/lib/contract-pdf";
import { requireRole } from "@/lib/roles";

type Ctx = { params: Promise<{ id: string }> };

/** The contract as a PDF: for the Authority of the Issue's area (or of the whole city) and the Business it is for. */
export async function GET(_req: Request, ctx: Ctx) {
  const actor = await requireRole("authority", "office");
  if (actor instanceof Response) return actor;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "not_found" }, { status: 404 });
  const pdf = await contractPdfFor(actor, id);
  if (!pdf) return Response.json({ error: "not_found" }, { status: 404 });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="contract-${id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
