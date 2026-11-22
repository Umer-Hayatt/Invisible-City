/** Pakistani mobile numbers in the `+92 3xx xxxxxxx` format. Accepts common typings and returns the canonical form. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-()]/g, "");
  const m = digits.match(/^(?:\+92|0092|92|0)(3\d{2})(\d{7})$/);
  return m ? `+92 ${m[1]} ${m[2]}` : null;
}

export function validateProfile(input: { displayName?: unknown; phone?: unknown }) {
  const displayName = String(input.displayName ?? "").trim().replace(/\s+/g, " ");
  if (displayName.length < 2 || displayName.length > 80) return { error: "invalid_name" as const };
  const phone = normalizePhone(String(input.phone ?? ""));
  if (!phone) return { error: "invalid_phone" as const };
  return { displayName, phone };
}
