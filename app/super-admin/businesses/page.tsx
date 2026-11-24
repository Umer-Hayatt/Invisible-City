"use client";

import { Building2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Gate from "@/components/Gate";
import { Card, Empty, ListSkeleton, PageHeader, btn } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

interface Business {
  id: number;
  name: string;
  department: string;
  sector: string;
  is_private: boolean;
  workers: number;
  email: string | null;
  active: number;
  fixes: number;
  revoked_at: string | null;
}

export default function BusinessesPage() {
  return (
    <Gate roles={["super_admin"]} next="/super-admin/businesses">
      <Businesses />
    </Gate>
  );
}

/** Every Business, government or private, with its email and work, and revoking any of them. */
function Businesses() {
  const [rows, setRows] = useState<Business[] | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const load = useCallback(() => {
    api<{ businesses: Business[] }>("/api/super-admin/businesses")
      .then((d) => setRows(d.businesses))
      .catch((e) => setError(errorText((e as Error).message)));
  }, []);
  useEffect(load, [load]);

  async function revoke(b: Business) {
    if (!window.confirm(t("superadmin.revokeBusinessConfirm", { name: b.name, n: b.active }))) return;
    setError("");
    setNote("");
    try {
      const d = await api<{ reopened: number }>(`/api/super-admin/businesses/${b.id}`, { method: "DELETE" });
      setNote(t("superadmin.businessRevoked", { name: b.name, n: d.reopened }));
    } catch (e) {
      setError(errorText((e as Error).message));
    }
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.offices")} sub={t("superadmin.businessesSub")} />
      {error && <div className="rounded-[6px] bg-danger-50 px-4 py-3 text-base font-medium text-danger-ink">{error}</div>}
      {note && <div className="rounded-[6px] bg-sunken px-4 py-3 text-base font-medium">{note}</div>}
      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <Empty icon={Building2} title={t("superadmin.noBusinesses")} />
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <Card key={b.id} className={`flex flex-wrap items-center justify-between gap-4 p-4 ${b.revoked_at ? "opacity-60" : ""}`}>
              <div className="min-w-0">
                <div className="text-lg font-semibold">
                  {b.name}
                  <span className="ms-2 rounded-[4px] bg-sunken px-2 py-0.5 text-sm font-medium text-ink-2">
                    {b.is_private ? t("offices.private") : t("offices.government")}
                  </span>
                </div>
                <div className="text-base text-ink-2">
                  {[b.department, b.sector, b.workers ? t("offices.workers", { n: b.workers }) : t("offices.noWorkers")].join(" · ")}
                </div>
                <div className="text-sm text-muted" dir="auto">
                  {[b.email ?? t("superadmin.noEmail"), t("superadmin.businessWork", { active: b.active, fixes: b.fixes })].join(" · ")}
                  {b.revoked_at && <> · {t("superadmin.revokedOn", { when: timeAgo(b.revoked_at) })}</>}
                </div>
              </div>
              {!b.revoked_at && (
                <button type="button" onClick={() => revoke(b)} className={btn.ghost}>
                  {t("superadmin.revoke")}
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
