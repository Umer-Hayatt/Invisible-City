import { isDemoKey } from "@/lib/demo-accounts";
import { DEMO_COOKIE, demoMode } from "@/lib/session";
import { cookies } from "next/headers";

/** Demo mode role switcher. `{ account: "authority" }` signs in as that Demo account; `{ account: null }` leaves Demo. */
export async function POST(req: Request) {
  if (!demoMode()) return Response.json({ error: "forbidden" }, { status: 403 });
  const { account } = (await req.json().catch(() => ({}))) as { account?: unknown };
  const store = await cookies();
  if (account === null) {
    store.delete(DEMO_COOKIE);
    return Response.json({ ok: true });
  }
  if (!isDemoKey(account)) return Response.json({ error: "unknown_account" }, { status: 400 });
  store.set(DEMO_COOKIE, account, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return Response.json({ ok: true });
}
