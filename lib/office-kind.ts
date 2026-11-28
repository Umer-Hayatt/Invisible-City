import type { MessageKey } from "./i18n/en";

/** What kind of Business an Office is, as the screens name it: a government office, a private firm or an NGO. */
export function officeKind(o: { is_private: boolean; is_ngo?: boolean | null }): MessageKey {
  if (o.is_ngo) return "offices.ngo";
  return o.is_private ? "offices.private" : "offices.government";
}
