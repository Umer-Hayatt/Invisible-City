/** Where to go after sign-in: only a path on this same site, never another origin (`/\evil.com` and `//evil.com` are refused). */
export function safeNext(raw: string | null | undefined, fallback = "/"): string {
  if (!raw || !raw.startsWith("/")) return fallback;
  try {
    const base = "http://same.invalid";
    const u = new URL(raw, base);
    if (u.origin !== base) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
