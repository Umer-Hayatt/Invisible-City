"use client";

import Image from "next/image";
import Link from "next/link";
import { BlurText, SlideUp } from "@/components/animate";
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
    <div className="mx-auto mt-2 grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-stretch">
      {/* The city it is all for: the road to Faisal Mosque under the Margalla Hills. Decorative beside the form. */}
      <div className="on-dark relative isolate hidden min-h-[560px] overflow-hidden rounded-xl text-on-dark lg:block">
        <Image src="/photos/islamabad/faisal-mosque-road.jpg" alt={t("signin.panelAlt")} fill priority sizes="50vw" className="-z-20 object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(23_43_77/0.1),rgb(23_43_77/0.55)_55%,var(--color-navy))]" />
        <div className="absolute inset-x-0 bottom-0 p-8">
          <BlurText as="p" now text={t("signin.panelTitle")} className="max-w-[18ch] text-3xl font-semibold leading-tight tracking-[-0.03em]" />
          <SlideUp now delay={0.5}>
            <p className="mt-3 max-w-[40ch] text-[15px] text-on-dark-2">{t("signin.panelSub")}</p>
          </SlideUp>
        </div>
      </div>
      <div className="mx-auto w-full max-w-md space-y-4 lg:max-w-none">
      <Card className="p-8">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">{t("signin.title")}</h1>
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
