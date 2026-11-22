"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Gate from "@/components/Gate";
import { Card, PageHeader, btn, field } from "@/components/ui";
import { api } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

interface OfficeRow {
  id: number;
  name: string;
  department: string;
  sector: string;
  staff: { id: number; email: string }[];
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
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<{ offices: OfficeRow[]; departments: { id: number; name: string }[] }>("/api/offices")
      .then((d) => {
        setOffices(d.offices);
        setDepartments(d.departments);
      })
      .catch((e) => setError(errorText((e as Error).message)));
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
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t("offices.title")} sub={t("offices.sub")} />
      <Link href="/admin" className="text-sm font-semibold text-brand hover:underline">
        {t("offices.back")}
      </Link>
      {error && <div className="text-sm font-medium text-red-600">{error}</div>}

      <NewOffice departments={departments} onCreate={(body) => run(() => api("/api/offices", { method: "POST", ...json(body) }))} />

      {offices === null ? (
        <div className="text-muted">{t("gate.loading")}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {offices.map((o) => (
            <Card key={o.id} className="space-y-3 p-4">
              <div>
                <div className="font-bold">{o.name}</div>
                <div className="text-xs text-muted">
                  {o.department} · {o.sector}
                </div>
              </div>
              {o.staff.length === 0 ? (
                <p className="text-sm text-muted">{t("offices.noStaff")}</p>
              ) : (
                <ul className="space-y-1">
                  {o.staff.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{s.email}</span>
                      <button
                        aria-label={t("offices.remove")}
                        title={t("offices.remove")}
                        onClick={() => run(() => api(`/api/offices/${o.id}/staff/${s.id}`, { method: "DELETE" }))}
                        className="text-muted hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <AddStaff onAdd={(email) => run(() => api(`/api/offices/${o.id}/staff`, { method: "POST", ...json({ email }) }))} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AddStaff({ onAdd }: { onAdd: (email: string) => void }) {
  const [email, setEmail] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (email.trim()) onAdd(email.trim());
        setEmail("");
      }}
    >
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("offices.staffEmail")} className={`${field} py-2`} />
      <button className={btn.dark}>{t("offices.addStaff")}</button>
    </form>
  );
}

function NewOffice({ departments, onCreate }: { departments: { id: number; name: string }[]; onCreate: (body: object) => void }) {
  const [f, setF] = useState({ name: "", departmentId: "", sector: "", lat: "33.69", lng: "73.05" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Card className="p-4">
      <form
        className="grid gap-3 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate({ ...f, departmentId: Number(f.departmentId), lat: Number(f.lat), lng: Number(f.lng) });
          setF({ ...f, name: "", sector: "" });
        }}
      >
        <div className="font-bold md:col-span-3">{t("offices.add")}</div>
        <input required value={f.name} onChange={set("name")} placeholder={t("offices.name")} className={field} />
        <select required value={f.departmentId} onChange={set("departmentId")} className={field} aria-label={t("offices.department")}>
          <option value="">{t("offices.department")}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input required value={f.sector} onChange={set("sector")} placeholder={t("offices.sector")} className={field} />
        <input required value={f.lat} onChange={set("lat")} placeholder={t("offices.lat")} inputMode="decimal" className={field} />
        <input required value={f.lng} onChange={set("lng")} placeholder={t("offices.lng")} inputMode="decimal" className={field} />
        <button className={btn.primary}>
          <Plus size={16} /> {t("offices.create")}
        </button>
      </form>
    </Card>
  );
}
