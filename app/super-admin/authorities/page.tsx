"use client";

import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Gate from "@/components/Gate";
import { Card, Empty, ListSkeleton, PageHeader, btn } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

interface Authority {
  email: string;
  name: string;
  department: string | null;
  area: string | null;
  phone: string | null;
  approved_at: string | null;
  revoked_at: string | null;
}

export default function AuthoritiesPage() {
  return (
    <Gate roles={["super_admin"]} next="/super-admin/authorities">
      <Authorities />
    </Gate>
  );
}

/** Every Authority, the area each works for, and revoking any of them. */
function Authorities() {
  const [rows, setRows] = useState<Authority[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    api<{ authorities: Authority[] }>("/api/super-admin/authorities")
      .then((d) => setRows(d.authorities))
      .catch((e) => setError(errorText((e as Error).message)));
  }, []);
  useEffect(load, [load]);

  async function revoke(a: Authority) {
    if (!window.confirm(t("superadmin.revokeAuthorityConfirm", { name: a.name }))) return;
    setError("");
    try {
      await api(`/api/super-admin/authorities?email=${encodeURIComponent(a.email)}`, { method: "DELETE" });
    } catch (e) {
      setError(errorText((e as Error).message));
    }
    load();
  }

  const active = rows?.filter((r) => !r.revoked_at) ?? [];
  const revoked = rows?.filter((r) => r.revoked_at) ?? [];

  const card = (a: Authority) => (
    <Card key={a.email} className="flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <div className="text-lg font-semibold">
          {a.name}
          <span className="ms-2 rounded-[4px] bg-sunken px-2 py-0.5 text-sm font-medium text-ink-2">{a.area ?? t("access.wholeCity")}</span>
        </div>
        <div className="text-base text-ink-2" dir="auto">
          {[a.department, a.email, a.phone].filter(Boolean).join(", ")}
        </div>
        <div className="text-sm text-muted">
          {a.revoked_at
            ? t("superadmin.revokedOn", { when: timeAgo(a.revoked_at) })
            : a.approved_at
              ? t("superadmin.approvedOn", { when: timeAgo(a.approved_at) })
              : null}
        </div>
      </div>
      {!a.revoked_at && (
        <button type="button" onClick={() => revoke(a)} className={btn.ghost}>
          {t("superadmin.revoke")}
        </button>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("superadmin.authorities")} sub={t("superadmin.authoritiesSub")} />
      {error && <div className="rounded-[6px] bg-danger-50 px-4 py-3 text-base font-medium text-danger-ink">{error}</div>}
      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <Empty icon={ShieldCheck} title={t("superadmin.noAuthorities")} />
      ) : (
        <>
          <section className="space-y-3">{active.map(card)}</section>
          {revoked.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xl font-bold">{t("superadmin.revoked")}</h2>
              {revoked.map(card)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
