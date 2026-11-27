"use client";

import { Languages } from "lucide-react";
import { getLocale, LANG_COOKIE, t } from "@/lib/i18n";

/** Switches between English and Urdu. The choice is a cookie; reloading lets the layout set `lang` and `dir`. */
export default function LanguageSwitch({ className = "" }: { className?: string }) {
  const next = getLocale() === "ur" ? "en" : "ur";
  function change() {
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }
  return (
    <button
      type="button"
      onClick={change}
      lang={next}
      title={t("lang.switchTitle")}
      className={`inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink ${className}`}
    >
      <Languages size={15} aria-hidden /> {next === "ur" ? "اردو" : "English"}
    </button>
  );
}
