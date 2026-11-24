import { listIssues } from "@/lib/db";
import { currentActor } from "@/lib/roles";
import { demoMode } from "@/lib/session";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const actor = await currentActor();
  const demo = actor ? actor.isDemo : demoMode();
  // An Authority registered for one area works on that area only; everyone else sees the whole city.
  const area = actor?.role === "authority" ? actor.area : null;
  return Response.json({
    issues: await listIssues(demo, {
      status: p.get("status") ?? undefined,
      category: p.get("category") ?? undefined,
      neighborhood: area ?? p.get("neighborhood") ?? undefined,
    }),
    area,
  });
}
