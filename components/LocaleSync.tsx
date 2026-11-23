"use client";

import { Locale, setLocale } from "@/lib/i18n";

/**
 * Sets the language for everything rendered after it, on the server and in the browser. It sits first in the
 * root layout, which reads the language cookie, so no screen has to know which language is on.
 */
export default function LocaleSync({ lang }: { lang: Locale }) {
  setLocale(lang);
  return null;
}
