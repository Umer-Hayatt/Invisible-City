import { listContracts } from "@/lib/contracts";
import { requireRole } from "@/lib/roles";

/** A Business: the contracts offered to it. An Authority: those of its area, or of one Issue with ?issue=. */
export async function GET(req: Request) {
  const actor = await requireRole("authority", "office");
  if (actor instanceof Response) return actor;
  const raw = new URL(req.url).searchParams.get("issue");
  const issueId = raw === null ? null : Number(raw);
  if (issueId !== null && !Number.isInteger(issueId)) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ contracts: await listContracts(actor, issueId) });
}
