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
  is_ngo: boolean;
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

type Kind = "government" | "private" | "ngo";
const KINDS: { value: Kind; label: "register.kindGov" | "register.kindPrivate" | "register.kindNgo" }[] = [
  { value: "government", label: "register.kindGov" },
  { value: "private", label: "register.kindPrivate" },
  { value: "ngo", label: "register.kindNgo" },
];

function RegisterOffice() {
  const [data, setData] = useState<{ registration: Registration | null; departments: { id: number; name: string }[] } | null>(null);
  const [again, setAgain] = useState(false);
  const [form, setForm] = useState({ name: "", departmentId: "", sector: "", workers: "", contactName: "", phone: "", registrationNumber: "", website: "", about: "" });
  // "Register your NGO" links here with ?type=ngo. Only the browser renders this form (Gate waits for the session first).
  const [kind, setKind] = useState<Kind>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("type") === "ngo" ? "ngo" : "government",
  );
  const ngo = kind === "ngo";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<NonNullable<typeof data>>("/api/register-office")
      .then(setData)
      .catch((e) => setError(errorText((e as Error).message)));
  }, []);
  useEffect(load, [load]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/register-office", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          departmentId: Number(form.departmentId),
          workers: Number(form.workers || 0),
          isPrivate: kind === "private",
          isNgo: ngo,
        }),
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
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{r.name}</h1>
        <p className="mt-1 text-base text-ink-2">
          {r.department} · {r.sector}
        </p>
        <p className="mt-4 text-base">{r.is_ngo && r.decision === "pending" ? t("register.pendingNgo") : t(`register.${r.decision}`)}</p>
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
      <PageHeader title={t(ngo ? "register.titleNgo" : "register.title")} sub={t(ngo ? "register.subNgo" : "register.sub")} />
      <Card className="space-y-5 p-6">
        <fieldset>
          <legend className={label}>{t("register.kind")}</legend>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
            {KINDS.map((k) => (
              <label
                key={k.value}
                className={`flex cursor-pointer items-center gap-2 rounded-[6px] border px-3 py-2.5 text-[15px] font-medium transition-colors ${
                  kind === k.value ? "border-brand bg-brand-50 text-brand" : "border-line-strong text-ink-2 hover:border-brand"
                }`}
              >
                <input type="radio" name="kind" value={k.value} checked={kind === k.value} onChange={() => setKind(k.value)} className="accent-[var(--color-action)]" />
                {t(k.label)}
              </label>
            ))}
          </div>
          {kind === "private" && <p className="mt-1.5 text-sm text-muted">{t("register.privateHint")}</p>}
        </fieldset>
        <label className={label}>
          {t(ngo ? "register.ngoName" : "register.name")}
          <input value={form.name} onChange={set("name")} maxLength={120} className={`${field} mt-1.5`} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={label}>
            {t(ngo ? "register.ngoDepartment" : "access.department")}
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
            {t(ngo ? "register.ngoSector" : "register.sector")}
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
        {ngo && (
          <>
            <label className={label}>
              {t("register.regNumber")}
              <input value={form.registrationNumber} onChange={set("registrationNumber")} maxLength={60} dir="ltr" className={`${field} mt-1.5`} />
              <span className="mt-1 block text-sm font-normal text-muted">{t("register.regNumberHint")}</span>
            </label>
            <label className={label}>
              {t("register.website")}
              <input value={form.website} onChange={set("website")} maxLength={200} inputMode="url" dir="ltr" placeholder="https://" className={`${field} mt-1.5`} />
            </label>
            <label className={label}>
              {t("register.about")}
              <textarea value={form.about} onChange={set("about")} maxLength={500} rows={3} className={`${field} mt-1.5`} />
            </label>
          </>
        )}
        <label className={label}>
          {t(ngo ? "register.volunteers" : "register.workers")}
          <input
            type="number"
            min={0}
            max={10000}
            inputMode="numeric"
            value={form.workers}
            onChange={set("workers")}
            className={`${field} mt-1.5`}
          />
          {!ngo && <span className="mt-1 block text-sm font-normal text-muted">{t("register.workersHint")}</span>}
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
        <p className="text-sm text-muted">{t(ngo ? "register.emailNoteNgo" : "register.emailNote")}</p>
        {error && <div className="rounded-[6px] bg-danger-50 px-4 py-3 text-base font-medium text-danger-ink">{error}</div>}
        <button disabled={busy} className={`${btn.primary} w-full py-3`}>
          {t("register.send")}
        </button>
      </Card>
    </form>
  );
}
