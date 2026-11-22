import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { DEMO_ACCOUNTS, DemoKey, demoAuthId, isDemoKey } from "./demo-accounts";

/**
 * Session adapter: who is signed in, or nobody. Never trust a client for this.
 * Real: the Demo cookie (only while DEMO_MODE is on) or the Supabase Auth JWT cookie, verified on the server.
 * Fake (tests): `setSession`.
 */
export interface Identity {
  authId: string;
  email: string | null;
  isDemo: boolean;
  /** Set for Demo accounts: which of the four. */
  demoKey?: DemoKey;
}

export const DEMO_COOKIE = "ic_demo";
export const demoMode = () => process.env.DEMO_MODE === "true";

async function realSession(): Promise<Identity | null> {
  const store = await cookies();
  const key = store.get(DEMO_COOKIE)?.value;
  if (demoMode() && isDemoKey(key)) {
    return { authId: demoAuthId(key), email: DEMO_ACCOUNTS[key].email, isDemo: true, demoKey: key };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anon) return null;
  const supabase = createServerClient(url, anon, {
    cookies: { getAll: () => store.getAll(), setAll: () => {} }, // refreshing happens in proxy.ts
  });
  const { data } = await supabase.auth.getClaims(); // verifies the JWT signature
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { authId: claims.sub, email: typeof claims.email === "string" ? claims.email.toLowerCase() : null, isDemo: false };
}

type Resolver = () => Promise<Identity | null>;
const g = globalThis as unknown as { __icSession?: Resolver };

export function session(): Promise<Identity | null> {
  return (g.__icSession ?? realSession)();
}

/** Tests: sign in as this identity (or nobody with null); `undefined` restores the real adapter. */
export function setSession(who: Identity | null | undefined) {
  g.__icSession = who === undefined ? undefined : async () => who;
}
