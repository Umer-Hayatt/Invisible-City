"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, btn } from "@/components/ui";
import { api } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import { sessionChanged, useMe } from "@/lib/me";
import { safeNext } from "@/lib/safe-next";
import { supabaseBrowser } from "@/lib/supabase-browser";

const DEMO_LABEL: Record<string, string> = {
  citizen: t("demo.accountCitizen"),
  authority: t("demo.accountAuthority"),
  office: t("demo.accountOffice"),
  superAdmin: t("demo.accountSuperAdmin"),
};

function SignIn() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { loading, me, demoMode, demoAccounts } = useMe();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") ? t("signin.failed") : "");

  async function google() {
    setBusy(true);
    setError("");
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setError(t("signin.failed"));
      setBusy(false);
    }
  }

  async function demo(account: string) {
    try {
      await api("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account }) });
      sessionChanged(next);
    } catch (e) {
      setError(errorText((e as Error).message));
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-md space-y-4">
      <Card className="p-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("signin.title")}</h1>
        <p className="mt-2 text-base text-ink-2">{t("signin.sub")}</p>
        {!loading && me && (
          <p className="mt-4 rounded-[6px] bg-sunken px-3 py-2 text-base">
            {t("signin.signedInAs", { name: me.displayName || me.email || t(`role.${me.role}`) })}
          </p>
        )}
        <button onClick={google} disabled={busy} className={`${btn.primary} mt-6 w-full py-3`}>
          {busy ? t("signin.working") : t("signin.google")}
        </button>
        {error && <div className="mt-3 text-sm font-medium text-danger-ink">{error}</div>}
        <p className="mt-4 text-sm text-muted">{t("signin.public")}</p>
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-sm font-semibold text-muted">{t("signin.officials")}</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/register-office" className="text-base font-semibold text-brand hover:underline">
              {t("register.title")}
            </Link>
            <Link href="/request-access" className="text-base font-semibold text-brand hover:underline">
              {t("nav.requestAccess")}
            </Link>
          </div>
        </div>
      </Card>

      {demoMode && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold">{t("signin.demoTitle")}</h2>
          <p className="mt-1 text-base text-ink-2">{t("signin.demoSub")}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {demoAccounts.map((a) => (
              <button key={a.key} onClick={() => demo(a.key)} className={btn.ghost}>
                {DEMO_LABEL[a.key] ?? a.name}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignIn />
    </Suspense>
  );
}
