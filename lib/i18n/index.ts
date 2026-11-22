import { en, MessageKey } from "./en";

export type { MessageKey };

/** Looks up on-screen text. `{name}` placeholders are filled from `vars`. Only English exists today; another language is another file. */
export function t(key: MessageKey, vars: Record<string, string | number> = {}): string {
  return en[key].replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

/** Turns an API error code into text for the person; unknown codes fall back to a generic message. */
export function errorText(code: string): string {
  const key = `error.${code}` as MessageKey;
  return key in en ? t(key) : t("error.generic");
}
