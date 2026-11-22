import { listIssues } from "@/lib/db";
import { dataWorld } from "@/lib/roles";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const { demo } = await dataWorld();
  return Response.json({
    issues: await listIssues(demo, {
      status: p.get("status") ?? undefined,
      category: p.get("category") ?? undefined,
      neighborhood: p.get("neighborhood") ?? undefined,
    }),
  });
}
