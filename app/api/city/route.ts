import { cityMap } from "@/lib/city";
import { currentActor, dataWorld } from "@/lib/roles";

/** Public: the home page's map, list and figures. No reporter details. */
export async function GET() {
  const [{ demo }, actor] = await Promise.all([dataWorld(), currentActor()]);
  return Response.json(await cityMap(demo, actor));
}
