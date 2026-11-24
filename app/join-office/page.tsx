"use client";

import { CircleCheck, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Gate from "@/components/Gate";
import { Card, ListSkeleton, PageHeader, btn, field } from "@/components/ui";
import { api } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import type { Role } from "@/lib/roles-list";

interface OfficeChoice {
  id: number;
  name: string;
  department: string;
  sector: string;
}
interface JoinRequest {
  office: string;
  decision: "pending" | "approved" | "declined";
}
interface JoinData {
  offices: OfficeChoice[];
  request: JoinRequest | null;
  role: Role;
  displayName: string | null;
  phone: string | null;
}

/** Office staff sign-up: sign in with Google, pick your Office, ask to join; an Authority approves it. */
export default function JoinOfficePage() {
  return (
    <Gate roles={["citizen", "office", "authority", "super_admin"]} next="/join-office">
      <JoinOffice />
    </Gate>
  );
}

function JoinOffice() {
  const [data, setData] = useState<JoinData | null>(null);
  const [form, setForm] = useState({ officeId: "", name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<JoinData>("/api/join-office")
      .then((d) => {
        setData(d);
        setForm((f) => ({ ...f, name: f.name || d.displayName || "", phone: f.phone || d.phone || "" }));
      })
      .catch((e) => setError(errorText((e as Error).message)));
  }, []);
  useEffect(load, [load]);

  // Offices grouped by Department, so staff find theirs quickly.
  const groups = useMemo(() => {
    const m = new Map<string, OfficeChoice[]>();
    for (const o of data?.offices ?? []) m.set(o.department, [...(m.get(o.department) ?? []), o]);
    return [...m.entries()];
  }, [data]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/join-office", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officeId: Number(form.officeId), name: form.name, phone: form.phone }),
      });
      load();
    } catch (err) {
      setError(errorText((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t("join.title")} sub={t("join.sub")} />
      {!data ? (
        error ? <p className="text-sm font-medium text-red-600">{error}</p> : <ListSkeleton rows={1} />
      ) : data.role === "office" ? (
        <Status icon={CircleCheck} tone="good" text={t("join.alreadyStaff")} action={{ href: "/office", label: t("nav.office") }} />
      ) : data.role !== "citizen" ? (
        <Status icon={Clock} tone="muted" text={t("join.alreadyOfficial")} />
      ) : data.request?.decision === "pending" ? (
        <Status icon={Clock} tone="warn" text={t("join.pending", { office: data.request.office })} />
      ) : (
        <>
          {data.request?.decision === "declined" && (
            <div className="mb-6">
              <Status icon={XCircle} tone="muted" text={t("join.declined", { office: data.request.office })} />
            </div>
          )}
          <form onSubmit={send}>
            <Card className="space-y-5 p-6">
              <label className="block text-sm font-bold">
                {t("join.office")}
                <select required value={form.officeId} onChange={set("officeId")} className={`${field} mt-2`}>
                  <option value="">{t("join.pickOffice")}</option>
                  {groups.map(([dept, list]) => (
                    <optgroup key={dept} label={dept}>
                      {list.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} · {o.sector}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold">
                {t("access.name")}
                <input value={form.name} onChange={set("name")} maxLength={80} autoComplete="name" className={`${field} mt-2`} />
              </label>
              <label className="block text-sm font-bold">
                {t("access.phone")}
                <input
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder={t("profile.phonePlaceholder")}
                  inputMode="tel"
                  autoComplete="tel"
                  className={`${field} mt-2`}
                />
              </label>
              <p className="text-sm text-muted">{t("join.emailNote")}</p>
              {error && <p className="text-sm font-medium text-red-600">{error}</p>}
              <button disabled={busy} className={`${btn.primary} w-full py-3`}>
                {t("join.send")}
              </button>
            </Card>
          </form>
        </>
      )}
      <p className="mt-6 text-sm text-muted">
        {t("join.authorityInstead")}{" "}
        <Link href="/request-access" className="font-bold text-brand underline decoration-2 underline-offset-4">
          {t("nav.requestAccess")}
        </Link>
      </p>
    </div>
  );
}

function Status({
  icon: Icon,
  tone,
  text,
  action,
}: {
  icon: typeof Clock;
  tone: "good" | "warn" | "muted";
  text: string;
  action?: { href: string; label: string };
}) {
  const cls = tone === "good" ? "border-brand bg-brand-50" : tone === "warn" ? "border-accent bg-accent-50" : "border-line bg-sunken";
  return (
    <div className={`flex items-start gap-3 rounded-[14px] border-[1.5px] p-5 ${cls}`}>
      <Icon size={22} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold leading-relaxed">{text}</p>
        {action && (
          <Link href={action.href} className={`${btn.primary} mt-4`}>
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
