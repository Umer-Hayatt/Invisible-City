"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Gate from "@/components/Gate";
import { Card, ListSkeleton, PageHeader, btn, field } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

interface OfficeRow {
  id: number;
  name: string;
  department: string;
  sector: string;
  workers: number;
  is_private: boolean;
  staff: { id: number; email: string }[];
}

interface Registration {
  id: number;
  name: string;
  department: string;
  sector: string;
  is_private: boolean;
  workers: number;
  contact_name: string;
  email: string;
  phone: string | null;
  decision: "pending" | "approved" | "declined";
  revoked_before: boolean;
  created_at: string;
}

const json = (data: unknown) => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

export default function OfficesPage() {
  return (
    <Gate roles={["authority"]} next="/admin/offices">
      <Offices />
    </Gate>
  );
}

function Offices() {
  const [offices, setOffices] = useState<OfficeRow[] | null>(null);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<{ offices: OfficeRow[]; departments: { id: number; name: string }[] }>("/api/offices")
      .then((d) => {
        setOffices(d.offices);
        setDepartments(d.departments);
      })
      .catch((e) => setError(errorText((e as Error).message)));
    api<{ registrations: Registration[] }>("/api/offices/registrations")
      .then((d) => setRegistrations(d.registrations.filter((r) => r.decision === "pending")))
      .catch(() => setRegistrations([]));
  }, []);
  useEffect(load, [load]);

  async function run(call: () => Promise<unknown>) {
    setError("");
    try {
      await call();
      load();
    } catch (e) {
      setError(errorText((e as Error).message));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("offices.title")}
        sub={t("offices.sub")}
        right={
          <Link href="/admin/reports" className={btn.ghost}>
            {t("offices.back")}
          </Link>
        }
      />
      {error && <div className="rounded-[6px] bg-danger-50 px-4 py-3 text-base font-medium text-danger-ink">{error}</div>}

      {registrations.length > 0 && (
        <Registrations
          rows={registrations}
          onDecide={(id, decision) => run(() => api(`/api/offices/registrations/${id}`, { method: "POST", ...json({ decision }) }))}
        />
      )}

      <NewOffice departments={departments} onCreate={(body) => run(() => api("/api/offices", { method: "POST", ...json(body) }))} />

      {offices === null ? (
        <ListSkeleton />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="block w-full text-base lg:table">
              <thead className="hidden text-sm font-semibold text-muted lg:table-header-group">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 text-start">{t("insights.colOffice")}</th>
                  <th className="py-3 text-start">{t("offices.department")}</th>
                  <th className="py-3 text-start">{t("insights.colSector")}</th>
                  <th className="w-[420px] py-3 pe-5 text-start">{t("offices.email")}</th>
                </tr>
              </thead>
              <tbody className="block divide-y divide-line lg:table-row-group">
                {offices.map((o) => (
                  <tr key={o.id} className="block px-5 py-4 lg:table-row">
                    <td className="block font-semibold lg:table-cell lg:px-5 lg:py-3">{o.name}</td>
                    <td className="inline-block pe-3 text-ink-2 lg:table-cell lg:py-3">{o.department}</td>
                    <td className="inline-block text-ink-2 lg:table-cell lg:py-3">
                      {o.sector}
                      <span className="block text-sm text-muted">
                        {[o.workers ? t("offices.workers", { n: o.workers }) : t("offices.noWorkers"), o.is_private ? t("offices.private") : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </td>
                    <td className="mt-2 block lg:table-cell lg:py-2 lg:pe-5">
                      <OfficeEmail office={o} onSave={(email) => run(() => setOfficeEmail(o, email))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/** An Office has one email: it signs in with it and gets the Assignments. The server replaces the old one. */
async function setOfficeEmail(o: OfficeRow, email: string) {
  await api(`/api/offices/${o.id}/staff`, { method: "POST", ...json({ email }) });
}

function OfficeEmail({ office, onSave }: { office: OfficeRow; onSave: (email: string) => Promise<void> }) {
  const current = office.staff.map((s) => s.email).join(", ");
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  if (current && !editing)
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate" dir="ltr">
          {current}
        </span>
        <button type="button" onClick={() => setEditing(true)} className="min-h-11 px-2 text-[15px] font-semibold text-brand hover:underline">
          {t("offices.change")}
        </button>
      </div>
    );
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const next = email.trim().toLowerCase();
        if (!next || office.staff.some((s) => s.email.toLowerCase() === next)) return setEditing(false);
        setBusy(true);
        await onSave(next);
        setBusy(false);
        setEditing(false);
        setEmail("");
      }}
    >
      <input
        type="email"
        dir="ltr"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label={t("offices.email")}
        placeholder={t("offices.emailPlaceholder")}
        className={field}
      />
      <button disabled={busy} className={btn.dark}>
        {t("offices.save")}
      </button>
    </form>
  );
}

/** Offices that registered themselves and wait for an Authority. Approving creates the Office and its sign-in. */
function Registrations({ rows, onDecide }: { rows: Registration[]; onDecide: (id: number, decision: "approved" | "declined") => void }) {
  return (
    <Card className="p-5">
      <h2 className="text-xl font-semibold">{t("offices.registrations", { n: rows.length })}</h2>
      <p className="mt-1 text-base text-ink-2">{t("offices.registrationsSub")}</p>
      <ul className="mt-4 divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold">
                {r.name}
                {r.is_private && <span className="ms-2 rounded-[4px] bg-sunken px-2 py-0.5 text-sm font-medium text-ink-2">{t("offices.private")}</span>}
                {r.revoked_before && <span className="ms-2 rounded-[4px] bg-danger-50 px-2 py-0.5 text-sm font-medium text-danger-ink">{t("offices.revokedBefore")}</span>}
              </div>
              <div className="text-base text-ink-2">
                {[r.department, r.sector, t("offices.workers", { n: r.workers })].join(" · ")}
              </div>
              <div className="text-sm text-muted" dir="auto">
                {[r.contact_name, r.email, r.phone].filter(Boolean).join(", ")} · {timeAgo(r.created_at)}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onDecide(r.id, "approved")} className={btn.primary}>
                {t("superadmin.approve")}
              </button>
              <button type="button" onClick={() => onDecide(r.id, "declined")} className={btn.ghost}>
                {t("superadmin.decline")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NewOffice({ departments, onCreate }: { departments: { id: number; name: string }[]; onCreate: (body: object) => void }) {
  const [f, setF] = useState({ name: "", departmentId: "", sector: "", lat: "33.69", lng: "73.05" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Card className="p-5">
      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.4fr_1fr_1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate({ ...f, departmentId: Number(f.departmentId), lat: Number(f.lat), lng: Number(f.lng) });
          setF({ ...f, name: "", sector: "" });
        }}
      >
        <h2 className="text-xl font-semibold sm:col-span-2 lg:col-span-6">{t("offices.add")}</h2>
        <input required value={f.name} onChange={set("name")} placeholder={t("offices.name")} aria-label={t("offices.name")} className={field} />
        <select required value={f.departmentId} onChange={set("departmentId")} className={field} aria-label={t("offices.department")}>
          <option value="">{t("offices.department")}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input required value={f.sector} onChange={set("sector")} placeholder={t("offices.sector")} aria-label={t("offices.sector")} className={field} />
        <input required value={f.lat} onChange={set("lat")} placeholder={t("offices.lat")} aria-label={t("offices.lat")} inputMode="decimal" className={field} />
        <input required value={f.lng} onChange={set("lng")} placeholder={t("offices.lng")} aria-label={t("offices.lng")} inputMode="decimal" className={field} />
        <button className={btn.primary}>
          <Plus size={16} /> {t("offices.create")}
        </button>
      </form>
    </Card>
  );
}
