"use client";

import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { Card, PageHeader, btn, field } from "@/components/ui";
import { api } from "@/lib/client";
import { NEIGHBORHOODS } from "@/lib/geo";
import { errorText, t } from "@/lib/i18n";

const DEPARTMENTS = ["Roads", "Sanitation", "Electrical", "Water & Sewerage", "Accessibility", "Building Control", "General Maintenance"];

export default function RequestAccessPage() {
  const [form, setForm] = useState({ name: "", department: "", area: "", officialEmail: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/access-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setSent(true);
    } catch (err) {
      setError(errorText((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <Card className="mx-auto mt-10 max-w-md p-8 text-center">
        <CircleCheck className="mx-auto text-brand" size={32} />
        <p className="mt-4 text-base">{t("access.sent")}</p>
      </Card>
    );

  return (
    <form onSubmit={send} className="mx-auto max-w-xl">
      <PageHeader title={t("access.title")} sub={t("access.sub")} />
      <Card className="space-y-5 p-6">
        <label className="block text-[15px] font-semibold text-ink-2">
          {t("access.name")}
          <input value={form.name} onChange={set("name")} maxLength={80} className={`${field} mt-1.5`} />
        </label>
        <label className="block text-[15px] font-semibold text-ink-2">
          {t("access.department")}
          <select value={form.department} onChange={set("department")} className={`${field} mt-1.5`}>
            <option value="">{t("access.pickDepartment")}</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="block text-[15px] font-semibold text-ink-2">
          {t("access.area")}
          <select value={form.area} onChange={set("area")} className={`${field} mt-1.5`}>
            <option value="">{t("access.wholeCity")}</option>
            {NEIGHBORHOODS.map((n) => (
              <option key={n.name} value={n.name}>
                {n.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-sm font-normal text-muted">{t("access.areaHint")}</span>
        </label>
        <label className="block text-[15px] font-semibold text-ink-2">
          {t("access.email")}
          <input type="email" value={form.officialEmail} onChange={set("officialEmail")} className={`${field} mt-1.5`} />
        </label>
        <label className="block text-[15px] font-semibold text-ink-2">
          {t("access.phone")}
          <input value={form.phone} onChange={set("phone")} placeholder={t("profile.phonePlaceholder")} inputMode="tel" className={`${field} mt-1.5`} />
        </label>
        {error && <div className="rounded-[6px] bg-danger-50 px-4 py-3 text-base font-medium text-danger-ink">{error}</div>}
        <button disabled={busy} className={`${btn.primary} w-full py-3`}>
          {t("access.send")}
        </button>
      </Card>
    </form>
  );
}
