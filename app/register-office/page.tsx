"use client";

import { Clock, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Gate from "@/components/Gate";
import { Card, ListSkeleton, PageHeader, btn, field } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { NEIGHBORHOODS } from "@/lib/geo";
import { errorText, t } from "@/lib/i18n";

interface Registration {
  id: number;
  name: string;
  department: string;
  sector: string;
  decision: "pending" | "approved" | "declined";
  created_at: string;
}

export default function RegisterOfficePage() {
  return (
    <Gate roles={["citizen"]} next="/register-office">
      <RegisterOffice />
    </Gate>
  );
}

const label = "block text-[15px] font-semibold text-ink-2";

function RegisterOffice() {
  const [data, setData] = useState<{ registration: Registration | null; departments: { id: number; name: string }[] } | null>(null);
  const [again, setAgain] = useState(false);
  const [form, setForm] = useState({ name: "", departmentId: "", sector: "", isPrivate: false, workers: "", contactName: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<NonNullable<typeof data>>("/api/register-office")
      .then(setData)
      .catch((e) => setError(errorText((e as Error).message)));
  }, []);
  useEffect(load, [load]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/register-office", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, departmentId: Number(form.departmentId), workers: Number(form.workers || 0) }),
      });
      setAgain(false);
      load();
    } catch (err) {
      setError(errorText((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  if (!data) return error ? <p className="mt-10 text-center text-danger-ink">{error}</p> : <ListSkeleton />;

  const r = data.registration;
  if (r && !again) {
    // Only Citizens get here, so an approved registration means this account no longer signs in as that Business.
    const Icon = r.decision === "pending" ? Clock : XCircle;
    return (
      <Card className="mx-auto mt-10 max-w-md p-8 text-center">
        <Icon className={`mx-auto ${r.decision === "pending" ? "text-brand" : "text-danger-ink"}`} size={32} aria-hidden />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{r.name}</h1>
        <p className="mt-1 text-base text-ink-2">
          {r.department} · {r.sector}
        </p>
        <p className="mt-4 text-base">{t(`register.${r.decision}`)}</p>
        <p className="mt-2 text-sm text-muted">{t("register.sentOn", { when: timeAgo(r.created_at) })}</p>
        {r.decision !== "pending" && (
          <button type="button" onClick={() => setAgain(true)} className={`${btn.ghost} mt-6`}>
            {t("register.again")}
          </button>
        )}
      </Card>
    );
  }

  return (
    <form onSubmit={send} className="mx-auto max-w-xl">
      <PageHeader title={t("register.title")} sub={t("register.sub")} />
      <Card className="space-y-5 p-6">
        <label className={label}>
          {t("register.name")}
          <input value={form.name} onChange={set("name")} maxLength={120} className={`${field} mt-1.5`} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={label}>
            {t("access.department")}
            <select value={form.departmentId} onChange={set("departmentId")} className={`${field} mt-1.5`}>
              <option value="">{t("access.pickDepartment")}</option>
              {data.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            {t("register.sector")}
            <select value={form.sector} onChange={set("sector")} className={`${field} mt-1.5`}>
              <option value="">{t("register.pickSector")}</option>
              {NEIGHBORHOODS.map((n) => (
                <option key={n.name} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex items-start gap-3 text-base">
          <input type="checkbox" checked={form.isPrivate} onChange={set("isPrivate")} className="mt-1 size-5 accent-[var(--color-lime)]" />
          <span>
            <span className="font-semibold">{t("register.private")}</span>
            <span className="block text-sm text-muted">{t("register.privateHint")}</span>
          </span>
        </label>
        <label className={label}>
          {t("register.workers")}
          <input
            type="number"
            min={0}
            max={10000}
            inputMode="numeric"
            value={form.workers}
            onChange={set("workers")}
            className={`${field} mt-1.5`}
          />
          <span className="mt-1 block text-sm font-normal text-muted">{t("register.workersHint")}</span>
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={label}>
            {t("register.contact")}
            <input value={form.contactName} onChange={set("contactName")} maxLength={80} className={`${field} mt-1.5`} />
          </label>
          <label className={label}>
            {t("access.phone")}
            <input value={form.phone} onChange={set("phone")} placeholder={t("profile.phonePlaceholder")} inputMode="tel" className={`${field} mt-1.5`} />
          </label>
        </div>
        <p className="text-sm text-muted">{t("register.emailNote")}</p>
        {error && <div className="rounded-[6px] bg-danger-50 px-4 py-3 text-base font-medium text-danger-ink">{error}</div>}
        <button disabled={busy} className={`${btn.primary} w-full py-3`}>
          {t("register.send")}
        </button>
      </Card>
    </form>
  );
}
