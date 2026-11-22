import { addEvent, getIssue, nearestOffice, setAssignment } from "@/lib/db";
import { nowIso } from "@/lib/clock";
import { dataWorld, requireRole } from "@/lib/roles";
import { STATUSES, Status, TEAMS } from "@/lib/types";

export async function GET(_req: Request, ctx: RouteContext<"/api/issues/[id]">) {
  const { id } = await ctx.params;
  const data = await getIssue(Number(id), (await dataWorld()).demo);
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(data);
}

// Until the Authority screens (PLAN step 5), the old Authority screen still picks a team.
// A team now means "the nearest Office of that Department".
const TEAM_DEPARTMENT: Record<(typeof TEAMS)[number], string> = {
  "Road Maintenance Unit": "Roads",
  "Sanitation Crew": "Sanitation",
  "Electrical Works": "Electrical",
  "Water & Sewerage": "Water & Sewerage",
  "Accessibility Task Force": "Accessibility",
  "General Maintenance": "General Maintenance",
};

/** Admin: assign an Office and/or move the issue through the workflow. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/issues/[id]">) {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  const { id } = await ctx.params;
  const current = await getIssue(Number(id), actor.isDemo);
  if (!current) return Response.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { status?: string; assigned_team?: string };
  const now = nowIso();
  const issue = current.issue;

  let officeId = issue.office_id;
  let officeName = issue.assigned_team;
  if (body.assigned_team !== undefined) {
    if (!(TEAMS as readonly string[]).includes(body.assigned_team))
      return Response.json({ error: "Unknown team" }, { status: 400 });
    const office = await nearestOffice(
      TEAM_DEPARTMENT[body.assigned_team as (typeof TEAMS)[number]],
      issue.lat,
      issue.lng,
      actor.isDemo,
    );
    if (!office) return Response.json({ error: "No Office for that team" }, { status: 400 });
    officeId = office.id;
    officeName = office.name;
  }
  let status: Status = issue.status;
  if (body.status !== undefined) {
    if (!(STATUSES as readonly string[]).includes(body.status) || body.status === "resolved")
      return Response.json({ error: "Use the resolve endpoint to resolve an issue" }, { status: 400 });
    status = body.status as Status;
  }
  const newOffice = officeId !== issue.office_id;
  if (newOffice && status === "open") status = "assigned";

  await setAssignment(issue.id, officeId, status);

  if (newOffice) await addEvent(issue.id, "assigned", `Assigned to ${officeName}`, now);
  const autoAssigned = status === "assigned" && newOffice;
  if (status !== issue.status && !autoAssigned) {
    const label: Record<Status, string> = {
      open: issue.status === "resolved" ? "Re-opened" : "Moved back to open",
      assigned: "Waiting for crew",
      in_progress: "Repair work started",
      resolved: "Resolved",
    };
    await addEvent(issue.id, status, label[status], now);
  }
  return Response.json(await getIssue(issue.id, actor.isDemo));
}
