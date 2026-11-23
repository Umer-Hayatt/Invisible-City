import { en, MessageKey } from "./en";
import { ur } from "./ur";

export type { MessageKey };

export const LOCALES = ["en", "ur"] as const;
export type Locale = (typeof LOCALES)[number];
/** The cookie that remembers the chosen language. The root layout reads it to set `lang` and `dir`. */
export const LANG_COOKIE = "lang";

const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, ur };

export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale);
export const dirOf = (l: Locale) => (l === "ur" ? "rtl" : "ltr");

let current: Locale = "en";
/** Set once per page render by `<LocaleSync>` in the root layout; screens never pass a language themselves. */
export function setLocale(l: Locale) {
  current = l;
}
export const getLocale = () => current;

/** Looks up on-screen text in the current language. `{name}` placeholders are filled from `vars`. */
export function t(key: MessageKey, vars: Record<string, string | number> = {}): string {
  const text = MESSAGES[current][key] ?? en[key];
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

/** Turns an API error code into text for the person; unknown codes fall back to a generic message. */
export function errorText(code: string): string {
  const key = `error.${code}` as MessageKey;
  return key in en ? t(key) : t("error.generic");
}

/** Dates and numbers in the current language's conventions (Urdu keeps Western digits, as Pakistani sites do). */
export const formatDate = (iso: string | Date) => new Date(iso).toLocaleDateString(current === "ur" ? "ur-PK" : "en-GB");
export const formatDateTime = (iso: string | Date) =>
  new Date(iso).toLocaleString(current === "ur" ? "ur-PK" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
