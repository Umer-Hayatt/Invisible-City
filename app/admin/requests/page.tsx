"use client";

import { ArrowUpRight, CircleCheck, Clock, FileSignature, Hand, MessagesSquare, Phone, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ContractForm from "@/components/ContractForm";
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
  contract_office_id: number | null;
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

/** Businesses asking for jobs in the Authority's area: send a contract, decline, talk it over, or call. */
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
              <RequestCard key={r.id} r={r} onSent={load} onDecline={() => decline(r)} />
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

function RequestCard({ r, onSent, onDecline }: { r: JobRequest; onSent?: () => void; onDecline?: () => void }) {
  const [writing, setWriting] = useState(false);
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
          {r.status === "pending" && r.contract_office_id === r.office_id ? (
            <Link href="/admin/contracts" className="flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:underline">
              <Clock size={15} className="shrink-0" aria-hidden /> {t("contract.waitingFor", { office: r.office })}
            </Link>
          ) : r.status === "pending" ? (
            <>
              {r.contract_office_id === null && (
                <button type="button" disabled={busy || writing} onClick={() => setWriting(true)} className={btn.primary}>
                  <FileSignature size={16} aria-hidden /> {t("contract.write")}
                </button>
              )}
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
      {r.status === "pending" && r.contract_office_id !== null && r.contract_office_id !== r.office_id && (
        <p className="mt-3 text-sm text-ink-2">{t("contract.waitingElsewhere")}</p>
      )}
      {writing && onSent && (
        <div className="mt-4">
          <ContractForm
            issueId={r.issue_id}
            officeId={r.office_id}
            office={r.office}
            title={r.title}
            onSent={() => {
              setWriting(false);
              onSent();
            }}
            onCancel={() => setWriting(false)}
          />
        </div>
      )}
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
