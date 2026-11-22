import { supabaseForRoute } from "@/lib/supabase-server";
import { safeNext } from "@/lib/safe-next";
import { NextResponse } from "next/server";

/** Google sends the person back here (through Supabase) with a one-time code that becomes the session cookie. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const dest = safeNext(url.searchParams.get("next"));
  if (code) {
    const { error } = await (await supabaseForRoute()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(dest, url.origin));
  }
  return NextResponse.redirect(new URL("/signin?error=1", url.origin));
}
