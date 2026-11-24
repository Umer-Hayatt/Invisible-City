"use client";

import { ArrowUpRight, CircleCheck, Hand, MessagesSquare, Phone, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Gate from "@/components/Gate";
import JobChat from "@/components/JobChat";
import { Card, CategoryChip, CriticalTag, Empty, ListSkeleton, PageHeader, btn } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import type { Category, Severity } from "@/lib/types";

interface JobRequest {
  id: number;
  issue_id: number;
  title: string;
  category: Category;
  severity: Severity;
  neighborhood: string;
  issue_status: string;
  office_id: number;
  office: string;
  department: string;
  is_private: boolean;
  workers: number;
  active: number;
  phone: string | null;
  email: string | null;
  note: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export default function RequestsPage() {
  return (
    <Gate roles={["authority"]} next="/admin/requests">
      <Requests />
    </Gate>
  );
}

/** Businesses asking for jobs in the Authority's area: assign, decline, talk it over, or call. */
function Requests() {
  const [rows, setRows] = useState<JobRequest[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    api<{ requests: JobRequest[] }>("/api/job-requests")
      .then((d) => setRows(d.requests))
      .catch((e) => setError(errorText((e as Error).message)));
  }, []);
  useEffect(load, [load]);

  async function run(call: () => Promise<unknown>) {
    setError("");
    try {
      await call();
    } catch (e) {
      setError(errorText((e as Error).message));
    }
    load();
  }
  const assign = (r: JobRequest) =>
    run(() =>
      api(`/api/issues/${r.issue_id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officeId: r.office_id }),
      }),
    );
  const decline = (r: JobRequest) => run(() => api(`/api/job-requests/${r.id}`, { method: "DELETE" }));

  const waiting = rows?.filter((r) => r.status === "pending") ?? [];
  const decided = rows?.filter((r) => r.status !== "pending") ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={t("requests.title")} sub={t("requests.sub")} />
      {error && <div className="rounded-[6px] bg-danger-50 px-4 py-3 text-base font-medium text-danger-ink">{error}</div>}
      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <Empty icon={Hand} title={t("requests.empty")} />
      ) : (
        <>
          <section className="space-y-3">
            {waiting.length === 0 && <p className="text-muted">{t("requests.noneWaiting")}</p>}
            {waiting.map((r) => (
              <RequestCard key={r.id} r={r} onAssign={() => assign(r)} onDecline={() => decline(r)} />
            ))}
          </section>
          {decided.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xl font-bold">{t("requests.decided")}</h2>
              {decided.map((r) => (
                <RequestCard key={r.id} r={r} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function RequestCard({ r, onAssign, onDecline }: { r: JobRequest; onAssign?: () => void; onDecline?: () => void }) {
  const [chat, setChat] = useState(false);
  const [busy, setBusy] = useState(false);
  const act = (fn?: () => void) => async () => {
    setBusy(true);
    await fn?.();
    setBusy(false);
  };
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip category={r.category} />
            <CriticalTag severity={r.severity} />
            <span className="text-sm text-muted">
              {r.neighborhood} · {timeAgo(r.created_at)}
            </span>
          </div>
          <Link href={`/issues/${r.issue_id}`} className="mt-1.5 flex items-start gap-1 text-lg font-semibold leading-snug hover:underline">
            {r.title} <ArrowUpRight size={16} className="mt-1 shrink-0" aria-hidden />
          </Link>
          <div className="mt-2 text-base">
            <span className="font-semibold">{r.office}</span>
            <span className="ms-2 rounded-[4px] bg-sunken px-2 py-0.5 text-sm font-medium text-ink-2">
              {r.is_private ? t("offices.private") : t("offices.government")}
            </span>
          </div>
          <div className="text-sm text-ink-2">
            {[r.department, r.workers ? t("offices.workers", { n: r.workers }) : t("offices.noWorkers"), t("requests.inHand", { n: r.active })].join(" · ")}
          </div>
          {r.note && (
            <p className="mt-2 rounded-[6px] bg-sunken px-3 py-2 text-[15px]" dir="auto">
              “{r.note}”
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {r.status === "pending" ? (
            <>
              <button type="button" disabled={busy} onClick={act(onAssign)} className={btn.primary}>
                {t("requests.assign")}
              </button>
              <button type="button" disabled={busy} onClick={act(onDecline)} className={btn.ghost}>
                {t("superadmin.decline")}
              </button>
            </>
          ) : r.status === "accepted" ? (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-brand">
              <CircleCheck size={15} aria-hidden /> {t("requests.accepted")}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-muted">
              <XCircle size={15} aria-hidden /> {t("superadmin.declined")}
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
        <button
          type="button"
          onClick={() => setChat(!chat)}
          aria-expanded={chat}
          className="flex min-h-11 items-center gap-2 text-[15px] font-semibold text-brand hover:underline"
        >
          <MessagesSquare size={16} aria-hidden /> {chat ? t("chat.hide") : t("chat.withBusiness")}
        </button>
        {r.phone && (
          <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="flex min-h-11 items-center gap-2 text-[15px] font-semibold text-brand hover:underline">
            <Phone size={16} aria-hidden /> {t("chat.call")} <span dir="ltr">{r.phone}</span>
          </a>
        )}
      </div>
      {chat && (
        <div className="mt-2">
          <JobChat issueId={r.issue_id} officeId={r.office_id} />
        </div>
      )}
    </Card>
  );
}
