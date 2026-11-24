"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Gate from "@/components/Gate";
import { Card, PageHeader, btn, field } from "@/components/ui";
import { api } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import { sessionChanged, useMe, type Me } from "@/lib/me";
import { safeNext } from "@/lib/safe-next";
import { ROLES } from "@/lib/roles-list";

function ProfileForm({ me }: { me: Me }) {
  const params = useSearchParams();
  const next = params.has("next") ? safeNext(params.get("next")) : "";
  const [name, setName] = useState(me.displayName ?? "");
  const [phone, setPhone] = useState(me.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, phone }),
      });
      setSaved(true);
      sessionChanged(next || undefined);
    } catch (err) {
      setError(errorText((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-xl">
      <PageHeader title={t("profile.title")} sub={t("profile.sub")} />
      <Card className="space-y-5 p-6">
        <label className="block text-[15px] font-semibold text-ink-2">
          {t("profile.email")}
          <input value={me.email ?? ""} readOnly className={`${field} mt-1.5 bg-sunken`} />
        </label>
        <label className="block text-[15px] font-semibold text-ink-2">
          {t("profile.name")}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("profile.namePlaceholder")} maxLength={80} className={`${field} mt-1.5`} />
        </label>
        <label className="block text-[15px] font-semibold text-ink-2">
          {t("profile.phone")}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("profile.phonePlaceholder")} inputMode="tel" className={`${field} mt-1.5`} />
          <span className="mt-1 block text-sm font-normal text-muted">{t("profile.phoneHint")}</span>
        </label>
        {error && <div className="rounded-[6px] bg-danger-50 px-4 py-3 text-base font-medium text-danger-ink">{error}</div>}
        {saved && !next && <div className="text-sm font-medium text-brand">{t("profile.saved")}</div>}
        <button disabled={busy} className={`${btn.primary} w-full py-3`}>
          {t("profile.save")}
        </button>
      </Card>
    </form>
  );
}

function Loaded() {
  const { me } = useMe();
  return me ? <ProfileForm me={me} /> : null;
}

export default function ProfilePage() {
  return (
    <Gate roles={[...ROLES]} next="/profile">
      <Suspense fallback={null}>
        <Loaded />
      </Suspense>
    </Gate>
  );
}
