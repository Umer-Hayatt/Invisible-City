"use client";

import { ArrowUpRight, CircleCheck, Clock, FileSignature, MessagesSquare, Phone, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import ContractForm from "@/components/ContractForm";
import JobChat from "@/components/JobChat";
import { Card, CriticalTag, btn } from "@/components/ui";
import { timeAgo } from "@/lib/client";
import { t } from "@/lib/i18n";
import { officeKind } from "@/lib/office-kind";
import type { Category, Severity } from "@/lib/types";

export interface JobRequest {
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
  is_ngo: boolean;
  workers: number;
  active: number;
  phone: string | null;
  email: string | null;
  note: string | null;
  contract_office_id: number | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

/** A Business asking for a job: send it a contract, decline, talk it over, or call. `compact` leaves out the Issue (on its own page). */
export default function RequestCard({ r, onSent, onDecline, compact = false }: { r: JobRequest; onSent?: () => void; onDecline?: () => void; compact?: boolean }) {
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
          {!compact && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <CriticalTag severity={r.severity} />
                <span className="text-sm text-muted">
                  {r.neighborhood} · {timeAgo(r.created_at)}
                </span>
              </div>
              <Link href={`/issues/${r.issue_id}`} className="mt-1.5 flex items-start gap-1 text-lg font-semibold leading-snug hover:underline">
                {r.title} <ArrowUpRight size={16} className="mt-1 shrink-0 rtl:-scale-x-100" aria-hidden />
              </Link>
            </>
          )}
          <div className={compact ? "text-base" : "mt-2 text-base"}>
            <span className="font-semibold">{r.office}</span>
            <span className="ms-2 rounded-[4px] bg-sunken px-2 py-0.5 text-sm font-medium text-ink-2">
              {t(officeKind(r))}
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
            <Link href="/admin/contracts?view=pending" className="flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:underline">
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
