"use client";

import { Inbox } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Gate from "@/components/Gate";
import { Card, Empty, ListSkeleton, PageHeader, btn } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

interface Req {
  id: number;
  name: string;
  department: string | null;
  area: string | null;
  official_email: string;
  phone: string | null;
  decision: "pending" | "approved" | "declined";
  decided_by: string | null;
  created_at: string;
}

function Requests() {
  const [rows, setRows] = useState<Req[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    api<{ requests: Req[] }>("/api/access-requests")
      .then((d) => setRows(d.requests))
      .catch((e) => setError(errorText((e as Error).message)));
  }, []);
  useEffect(load, [load]);

  async function decide(id: number, decision: "approved" | "declined") {
    setError("");
    try {
      await api(`/api/access-requests/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
      load();
    } catch (e) {
      setError(errorText((e as Error).message));
      load();
    }
  }

  const pending = rows?.filter((r) => r.decision === "pending") ?? [];
  const done = rows?.filter((r) => r.decision !== "pending") ?? [];

  const row = (r: Req) => (
    <Card key={r.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <div className="text-lg font-semibold">{r.name}</div>
        <div className="text-base text-ink-2">
          {[r.department, r.area ?? t("access.wholeCity"), r.official_email, r.phone].filter(Boolean).join(", ")}
        </div>
        <div className="text-sm text-muted">{t("superadmin.requestedOn", { when: timeAgo(r.created_at) })}</div>
      </div>
      {r.decision === "pending" ? (
        <div className="flex gap-2">
          <button onClick={() => decide(r.id, "approved")} className={btn.primary}>
            {t("superadmin.approve")}
          </button>
          <button onClick={() => decide(r.id, "declined")} className={btn.ghost}>
            {t("superadmin.decline")}
          </button>
        </div>
      ) : (
        <span className="text-sm font-semibold text-ink-2">{t(r.decision === "approved" ? "superadmin.approved" : "superadmin.declined")}</span>
      )}
    </Card>
  );

  return (
    <div>
      <PageHeader title={t("superadmin.title")} sub={t("superadmin.sub")} />
      {error && <div className="mb-4 rounded-[6px] bg-danger-50 px-4 py-3 text-base font-medium text-danger-ink">{error}</div>}
      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <Empty icon={Inbox} title={t("superadmin.empty")} />
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">{t("superadmin.pending")}</h2>
              {pending.map(row)}
            </section>
          )}
          {done.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">{t("superadmin.decided")}</h2>
              {done.map(row)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function SuperAdminPage() {
  return (
    <Gate roles={["super_admin"]} next="/super-admin">
      <Requests />
    </Gate>
  );
}
