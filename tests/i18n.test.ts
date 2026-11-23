import { afterEach, describe, expect, it } from "vitest";
import { en } from "../lib/i18n/en";
import { ur } from "../lib/i18n/ur";
import { dirOf, errorText, getLocale, isLocale, setLocale, t } from "../lib/i18n";

/** Ticket 08: Urdu covers every on-screen string, and switching the language needs nothing from the screens. */
afterEach(() => setLocale("en"));

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("the Urdu file", () => {
  it("has exactly the English keys", () => {
    expect(Object.keys(ur).sort()).toEqual(Object.keys(en).sort());
  });

  it("keeps every {placeholder} of the English text", () => {
    const wrong = Object.keys(en).filter(
      (k) => placeholders(en[k as keyof typeof en]).join() !== placeholders(ur[k as keyof typeof ur]).join(),
    );
    expect(wrong).toEqual([]);
  });

  it("is written in Urdu script, not copied English", () => {
    // Texts that are only a format, a brand or a number are allowed to match.
    const same = Object.keys(en).filter((k) => en[k as keyof typeof en] === ur[k as keyof typeof ur]);
    expect(same).toEqual(["profile.phonePlaceholder"]);
    const arabicScript = /[؀-ۿ]/;
    const noUrdu = Object.keys(ur).filter((k) => !arabicScript.test(ur[k as keyof typeof ur]));
    expect(noUrdu).toEqual(["profile.phonePlaceholder"]);
  });
});

describe("switching language", () => {
  it("t() and errorText() follow the current language", () => {
    expect(t("nav.map")).toBe("City map");
    setLocale("ur");
    expect(getLocale()).toBe("ur");
    expect(t("nav.map")).toBe("شہر کا نقشہ");
    expect(t("time.days", { n: 3 })).toBe("3 دن پہلے");
    expect(errorText("daily_limit")).toBe(ur["error.daily_limit"]);
    expect(errorText("made_up_code")).toBe(ur["error.generic"]);
  });

  it("Urdu lays out right to left; only known languages are accepted from the cookie", () => {
    expect(dirOf("ur")).toBe("rtl");
    expect(dirOf("en")).toBe("ltr");
    expect(isLocale("ur")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
