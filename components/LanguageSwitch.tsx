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
      className={`inline-flex h-10 items-center gap-1.5 rounded-[6px] border border-char-line px-3 text-[15px] font-medium text-on-dark transition-colors hover:border-on-dark-2 hover:text-lime ${className}`}
    >
      <Languages size={15} aria-hidden /> {next === "ur" ? "اردو" : "English"}
    </button>
  );
}
