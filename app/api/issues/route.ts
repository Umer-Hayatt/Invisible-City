import { listIssues } from "@/lib/db";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  return Response.json({
    issues: await listIssues({
      status: p.get("status") ?? undefined,
      category: p.get("category") ?? undefined,
      neighborhood: p.get("neighborhood") ?? undefined,
    }),
  });
}
