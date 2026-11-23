"use client";

import { LogIn } from "lucide-react";
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
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-on-brand">
          <LogIn size={22} />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">{t("signin.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("signin.sub")}</p>
        {!loading && me && (
          <p className="mt-4 rounded-xl bg-sunken px-3 py-2 text-sm">
            {t("signin.signedInAs", { name: me.displayName || me.email || t(`role.${me.role}`) })}
          </p>
        )}
        <button onClick={google} disabled={busy} className={`${btn.primary} mt-6 w-full py-3`}>
          {busy ? t("signin.working") : t("signin.google")}
        </button>
        {error && <div className="mt-3 text-sm font-medium text-red-600">{error}</div>}
        <p className="mt-4 text-xs text-muted">{t("signin.public")}</p>
        <Link href="/request-access" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
          {t("nav.requestAccess")}
        </Link>
      </Card>

      {demoMode && (
        <Card className="p-6">
          <h2 className="text-base font-extrabold">{t("signin.demoTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("signin.demoSub")}</p>
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
