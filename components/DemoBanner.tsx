"use client";

import { api } from "@/lib/client";
import { t } from "@/lib/i18n";
import { sessionChanged, useMe } from "@/lib/me";

const LABEL: Record<string, string> = {
  citizen: t("demo.accountCitizen"),
  authority: t("demo.accountAuthority"),
  office: t("demo.accountOffice"),
  officeSanitation: t("demo.accountOfficeSanitation"),
  officeElectrical: t("demo.accountOfficeElectrical"),
  superAdmin: t("demo.accountSuperAdmin"),
};

/**
 * Shown while the visitor is in the Demo world: signed out while Demo mode is on, or signed in as a Demo account.
 * A real Google sign-in sees real data and no banner. The switcher signs in as one of the four Demo accounts.
 */
export default function DemoBanner() {
  const { loading, me, demoMode, demoAccounts } = useMe();
  if (loading || !demoMode || (me && !me.isDemo)) return null;

  async function pick(account: string | null) {
    await api("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account }) });
    sessionChanged();
  }

  return (
    <div data-demo-banner className="on-dark sticky top-0 z-[1001] h-(--banner) bg-navy text-on-dark-2">
      <div className="flex h-full items-center justify-between gap-4 px-4 text-xs font-medium sm:px-6">
        <span className="truncate">{t("demo.banner")}</span>
        <label className="flex shrink-0 items-center gap-2">
          {t("demo.switchTo")}
          <select
            value={me?.demoKey ?? ""}
            onChange={(e) => pick(e.target.value || null)}
            className="min-h-7 rounded-md border border-navy-line bg-navy px-2 text-xs text-on-dark"
          >
            <option value="">{me ? t("demo.leave") : t("demo.none")}</option>
            {demoAccounts.map((a) => (
              <option key={a.key} value={a.key}>
                {LABEL[a.key] ?? a.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
