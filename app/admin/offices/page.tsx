"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pager, SearchInput, matches, usePaged } from "@/components/DataTools";
import Gate from "@/components/Gate";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/primitives/dialog";
import { Card, ListSkeleton, PageHeader, btn, field } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { NEIGHBORHOODS } from "@/lib/geo";
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
  const [query, setQuery] = useState("");

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

  const shown = useMemo(
    () => (offices ?? []).filter((o) => matches(query, o.name, o.department, o.sector, ...o.staff.map((x) => x.email))),
    [offices, query],
  );
  const paged = usePaged(shown, 10);

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
          <>
            <Link href="/admin/reports" className={btn.ghost}>
              {t("offices.back")}
            </Link>
            <NewOffice departments={departments} onCreate={(body) => run(() => api("/api/offices", { method: "POST", ...json(body) }))} />
          </>
        }
      />
      {error && <Alert tone="error">{error}</Alert>}

      {registrations.length > 0 && (
        <Registrations
          rows={registrations}
          onDecide={(id, decision) => run(() => api(`/api/offices/registrations/${id}`, { method: "POST", ...json({ decision }) }))}
        />
      )}

      {offices === null ? (
        <ListSkeleton />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
            <SearchInput value={query} onChange={setQuery} placeholder={t("offices.search")} />
            <span className="text-sm text-muted">{t("offices.count", { n: shown.length })}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="block w-full text-base lg:table">
              <thead className="hidden bg-sunken/60 text-xs font-medium text-muted lg:table-header-group">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 text-start">{t("insights.colOffice")}</th>
                  <th className="py-3 text-start">{t("offices.department")}</th>
                  <th className="py-3 text-start">{t("insights.colSector")}</th>
                  <th className="py-3 pe-5 text-start">{t("offices.email")}</th>
                </tr>
              </thead>
              <tbody className="block divide-y divide-line lg:table-row-group">
                {paged.slice.map((o) => (
                  <tr key={o.id} className="block px-5 py-4 lg:table-row">
                    <td className="block font-medium text-ink lg:table-cell lg:min-w-48 lg:px-5 lg:py-3">{o.name}</td>
                    <td className="inline-block pe-3 text-ink-2 lg:table-cell lg:py-3">{o.department}</td>
                    <td className="inline-block text-ink-2 lg:table-cell lg:py-3">
                      {o.sector}
                      <span className="block whitespace-nowrap text-xs text-muted">
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
            {shown.length === 0 && <p className="px-4 py-12 text-center text-sm text-muted">{t("data.noMatch")}</p>}
          </div>
          <Pager {...paged} />
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

/**
 * Adding a Business by hand, in a dialog. Choosing the sector fills in its map position (the centre of the sector),
 * which can still be adjusted; the API receives the same fields as before.
 */
function NewOffice({ departments, onCreate }: { departments: { id: number; name: string }[]; onCreate: (body: object) => Promise<void> }) {
  const empty = { name: "", departmentId: "", sector: "", lat: "", lng: "" };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const pickSector = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const hood = NEIGHBORHOODS.find((n) => n.name === e.target.value);
    setF({ ...f, sector: e.target.value, lat: hood ? String(hood.lat) : f.lat, lng: hood ? String(hood.lng) : f.lng });
  };
  const label = "grid gap-1.5 text-sm font-medium text-ink-2";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={btn.primary}>
          <Plus size={16} /> {t("offices.add")}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("offices.add")}</DialogTitle>
          <DialogDescription>{t("offices.addSub")}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            await onCreate({ ...f, departmentId: Number(f.departmentId), lat: Number(f.lat), lng: Number(f.lng) });
            setBusy(false);
            setF(empty);
            setOpen(false);
          }}
        >
          <label className={label}>
            {t("offices.name")}
            <input required minLength={2} maxLength={120} value={f.name} onChange={set("name")} className={field} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>
              {t("offices.department")}
              <select required value={f.departmentId} onChange={set("departmentId")} className={field}>
                <option value="">{t("access.pickDepartment")}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              {t("register.sector")}
              <select required value={f.sector} onChange={pickSector} className={field}>
                <option value="">{t("register.pickSector")}</option>
                {NEIGHBORHOODS.map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>
              {t("offices.lat")}
              <input required type="number" step="any" min={-90} max={90} value={f.lat} onChange={set("lat")} inputMode="decimal" className={field} />
            </label>
            <label className={label}>
              {t("offices.lng")}
              <input required type="number" step="any" min={-180} max={180} value={f.lng} onChange={set("lng")} inputMode="decimal" className={field} />
            </label>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setOpen(false)} className={btn.ghost}>
              {t("office.cancel")}
            </button>
            <button disabled={busy} className={btn.primary}>
              {t("offices.create")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
