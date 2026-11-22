import { DEMO_COOKIE } from "@/lib/session";
import { supabaseForRoute } from "@/lib/supabase-server";
import { cookies } from "next/headers";

export async function POST() {
  (await cookies()).delete(DEMO_COOKIE);
  try {
    await (await supabaseForRoute()).auth.signOut();
  } catch {
    // no Supabase session to end
  }
  return Response.json({ ok: true });
}
