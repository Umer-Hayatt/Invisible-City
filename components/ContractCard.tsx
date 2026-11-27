"use client";

import { ArrowUpRight, Banknote, CircleCheck, Clock, Download, FileSignature, MessagesSquare, Undo2, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import JobChat from "@/components/JobChat";
import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";
import { ViewTabs, useView } from "@/components/ViewTabs";
import { StaggerContainer, StaggerItem } from "@/components/animate";
import { Card, CriticalTag, Empty, ListSkeleton, PageHeader, btn, field } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { errorText, formatDate, t } from "@/lib/i18n";
import type { Category, Severity } from "@/lib/types";

export interface Contract {
  id: number;
  issue_id: number;
  title: string;
  category: Category;
  severity: Severity;
  neighborhood: string;
  office_id: number;
  office: string;
  can_answer: boolean;
  authority_name: string;
  scope: string;
  price_pkr: number | null;
  start_date: string | null;
  finish_date: string;
  payment_terms: string | null;
  status: "sent" | "accepted" | "declined" | "withdrawn" | "ended";
  sent_at: string;
  decided_at: string | null;
  ended_at: string | null;
  decline_reason: string | null;
  issue_status: string;
  paid_at: string | null;
  paid_by: string | null;
  payment_reference: string | null;
}

const day = (d: string) => formatDate(`${d}T00:00:00`);

/** What was agreed, or is being offered. */
export function ContractTerms({ c }: { c: Contract }) {
  const rows: [string, string][] = [
    [t("contract.scope"), c.scope],
    [t("contract.priceShort"), c.price_pkr === null ? t("contract.noPrice") : t("contract.pkr", { n: c.price_pkr.toLocaleString("en-US") })],
    ...(c.start_date ? ([[t("contract.startShort"), day(c.start_date)]] as [string, string][]) : []),
    [t("contract.finish"), day(c.finish_date)],
    ...(c.payment_terms ? ([[t("contract.paymentShort"), c.payment_terms]] as [string, string][]) : []),
  ];
  return (
    <dl className="grid gap-x-4 gap-y-1.5 rounded-[6px] bg-sunken px-3 py-2.5 text-[15px] sm:grid-cols-[auto_minmax(0,1fr)]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-sm font-semibold text-muted sm:pt-0.5">{k}</dt>
          <dd className="mb-1.5 whitespace-pre-wrap break-words sm:mb-0" dir="auto">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Where the contract stands, for either side. */
export function ContractState({ c, side }: { c: Contract; side: "authority" | "office" }) {
  const base = "flex items-start gap-1.5 text-sm font-semibold";
  if (c.status === "accepted")
    return (
      <p className={`${base} text-brand`}>
        <CircleCheck size={15} className="mt-0.5 shrink-0" aria-hidden /> {side === "office" ? t("contract.acceptedByUs") : t("contract.acceptedBy", { office: c.office })}
      </p>
    );
  if (c.status === "sent")
    return (
      <p className={`${base} text-ink-2`}>
        <Clock size={15} className="mt-0.5 shrink-0" aria-hidden /> {side === "office" ? t("contract.waitingForUs") : t("contract.waitingFor", { office: c.office })}
      </p>
    );
  return (
    <div>
      <p className={`${base} text-muted`}>
        <XCircle size={15} className="mt-0.5 shrink-0" aria-hidden />{" "}
        {c.status === "ended"
          ? t("contract.ended")
          : c.status === "withdrawn"
            ? t("contract.withdrawn")
            : side === "office"
              ? t("contract.declinedByUs")
              : t("contract.declinedBy", { office: c.office })}
      </p>
      {c.decline_reason && (
        <p className="mt-1 text-sm text-ink-2" dir="auto">
          “{c.decline_reason}”
        </p>
      )}
    </div>
  );
}

/**
 * Payment for an accepted contract: agreed (the price), then paid. The Authority marks it paid once the Citizen has
 * confirmed the Fix; both sides see when and the reference. Civora records payments; it never moves money.
 */
export function ContractPayment({ c, side, onChanged, onError }: { c: Contract; side: "authority" | "office"; onChanged: () => void; onError: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  if (c.status !== "accepted" && !c.paid_at) return null;
  const amount = c.price_pkr === null ? t("contract.noPrice") : t("contract.pkr", { n: c.price_pkr.toLocaleString("en-US") });
  const resolved = c.issue_status === "resolved";

  async function pay() {
    setBusy(true);
    try {
      await api(`/api/contracts/${c.id}/paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      setOpen(false);
    } catch (e) {
      onError(errorText((e as Error).message));
    }
    setBusy(false);
    onChanged();
  }

  return (
    <div className="rounded-lg border border-line px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Banknote size={16} className="text-muted" aria-hidden />
          <span className="text-muted">{t("contract.payAgreed")}</span>
          <span className="font-semibold text-ink tabular-nums">{amount}</span>
        </div>
        {c.paid_at ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-st-done-50 px-2 py-0.5 text-xs font-semibold text-st-done ring-1 ring-inset ring-st-done/25">
            <CircleCheck size={13} aria-hidden /> {t("contract.paidOn", { date: formatDate(c.paid_at) })}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-st-open-50 px-2 py-0.5 text-xs font-semibold text-st-open ring-1 ring-inset ring-st-open/25">
            <Clock size={13} aria-hidden /> {t("contract.unpaid")}
          </span>
        )}
      </div>
      {c.paid_at ? (
        c.payment_reference && (
          <p className="mt-1.5 text-xs text-muted" dir="auto">
            {t("contract.payReference")}: {c.payment_reference}
          </p>
        )
      ) : (
        <p className="mt-1.5 text-xs text-muted">{resolved ? t("contract.payReady") : t("contract.payAfterFix")}</p>
      )}
      {side === "authority" && !c.paid_at && c.status === "accepted" && resolved && (
        <>
          <Button size="sm" className="mt-2.5" onClick={() => setOpen(true)}>
            <Banknote /> {t("contract.markPaid")}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("contract.markPaidTitle", { n: c.id })}</DialogTitle>
                <DialogDescription>{t("contract.markPaidBody", { amount, office: c.office })}</DialogDescription>
              </DialogHeader>
              <label className="grid gap-1.5 text-sm font-medium text-ink-2">
                {t("contract.payReferenceLabel")}
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  maxLength={120}
                  placeholder={t("contract.payReferencePlaceholder")}
                  className={field}
                />
              </label>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  {t("office.cancel")}
                </Button>
                <Button onClick={pay} disabled={busy}>
                  {t("contract.markPaid")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

/** An Authority takes a waiting contract back. */
export function WithdrawButton({ c, onChanged, onError }: { c: Contract; onChanged: () => void; onError: (text: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function withdraw() {
    setBusy(true);
    try {
      await api(`/api/contracts/${c.id}`, { method: "DELETE" });
    } catch (e) {
      onError(errorText((e as Error).message));
    }
    setBusy(false);
    onChanged();
  }
  return (
    <button type="button" disabled={busy} onClick={withdraw} className={btn.ghost}>
      <Undo2 size={16} aria-hidden /> {t("contract.withdraw")}
    </button>
  );
}

/** A Business accepts (after ticking that it agrees) or declines with a reason. */
function Answer({ c, onChanged, onError }: { c: Contract; onChanged: () => void; onError: (text: string) => void }) {
  const [agreed, setAgreed] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(decision: "accepted" | "declined") {
    setBusy(true);
    onError("");
    try {
      await api(`/api/contracts/${c.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      onChanged();
    } catch (e) {
      onError(errorText((e as Error).message));
    }
    setBusy(false);
  }

  if (declining)
    return (
      <div className="space-y-2">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={t("contract.declineReason")}
          aria-label={t("contract.declineReason")}
          className={field}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => send("declined")} className={btn.dark}>
            {t("contract.declineSend")}
          </button>
          <button type="button" disabled={busy} onClick={() => setDeclining(false)} className={btn.ghost}>
            {t("office.cancel")}
          </button>
        </div>
      </div>
    );
  return (
    <div className="space-y-3">
      <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-[15px]">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 size-4 shrink-0 accent-brand" />
        <span>{t("contract.agree", { office: c.office })}</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || !agreed} onClick={() => send("accepted")} className={btn.primary}>
          <CircleCheck size={16} aria-hidden /> {t("contract.accept")}
        </button>
        <button type="button" disabled={busy} onClick={() => setDeclining(true)} className={btn.ghost}>
          {t("superadmin.decline")}
        </button>
      </div>
    </div>
  );
}

function ContractCard({ c, side, onChanged, onError }: { c: Contract; side: "authority" | "office"; onChanged: () => void; onError: (text: string) => void }) {
  const [chat, setChat] = useState(false);
  return (
    <Card className="space-y-4 p-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <CriticalTag severity={c.severity} />
          <span className="text-sm text-muted">
            {t("contract.number", { n: c.id })} · {c.neighborhood} · {timeAgo(c.sent_at)}
          </span>
        </div>
        <Link href={`/issues/${c.issue_id}`} className="mt-1.5 flex items-start gap-1 text-lg font-semibold leading-snug hover:underline">
          {c.title} <ArrowUpRight size={16} className="mt-1 shrink-0 rtl:-scale-x-100" aria-hidden />
        </Link>
        <p className="mt-1 text-sm text-ink-2">
          {side === "office" ? t("contract.from", { name: c.authority_name }) : t("contract.between", { name: c.authority_name, office: c.office })}
        </p>
      </div>
      <ContractTerms c={c} />
      <ContractState c={c} side={side} />
      <ContractPayment c={c} side={side} onChanged={onChanged} onError={onError} />
      <a href={`/api/contracts/${c.id}/pdf`} download className={btn.ghost}>
        <Download size={16} aria-hidden /> {t("contract.downloadPdf")}
      </a>
      {c.status === "sent" && side === "office" && <Answer c={c} onChanged={onChanged} onError={onError} />}
      {c.status === "sent" && side === "authority" && (
        <>
          {!c.can_answer && <p className="text-sm text-ink-2">{t("contract.noAccount")}</p>}
          <WithdrawButton c={c} onChanged={onChanged} onError={onError} />
        </>
      )}
      {c.status !== "withdrawn" && (
        <div>
          <button
            type="button"
            onClick={() => setChat(!chat)}
            aria-expanded={chat}
            className="flex min-h-11 items-center gap-2 text-[15px] font-semibold text-brand hover:underline"
          >
            <MessagesSquare size={16} aria-hidden /> {chat ? t("chat.hide") : side === "office" ? t("chat.withAuthority") : t("chat.withBusiness")}
          </button>
          {chat && <JobChat issueId={c.issue_id} officeId={side === "authority" ? c.office_id : undefined} />}
        </div>
      )}
    </Card>
  );
}

/** The tabs of the Contracts page. Ended contracts were accepted first; withdrawn ones never got an answer. */
const VIEWS = ["pending", "accepted", "declined"] as const;
type View = (typeof VIEWS)[number];
const viewOf = (c: Contract): View => (c.status === "sent" ? "pending" : c.status === "accepted" || c.status === "ended" ? "accepted" : "declined");

/** Every contract of one side, one tab per answer. Must sit inside <Suspense> (the tab is in the address). */
export default function ContractList({ side }: { side: "authority" | "office" }) {
  const [rows, setRows] = useState<Contract[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    api<{ contracts: Contract[] }>("/api/contracts")
      .then((d) => setRows(d.contracts))
      .catch((e) => {
        setError(errorText((e as Error).message));
        setRows([]);
      });
  }, []);
  useEffect(load, [load]);

  const counts = rows && (Object.fromEntries(VIEWS.map((v) => [v, rows.filter((c) => viewOf(c) === v).length])) as Record<View, number>);
  const [view, setView] = useView(VIEWS, counts);
  const shown = rows?.filter((c) => viewOf(c) === view) ?? [];
  const label: Record<View, string> = {
    pending: t("contract.tabPending"),
    accepted: t("contract.tabAccepted"),
    declined: t("contract.tabDeclined"),
  };
  const empty: Record<View, string> = {
    pending: t("contract.noneWaiting"),
    accepted: t("contract.noneAccepted"),
    declined: t("contract.noneDeclined"),
  };

  return (
    <div>
      <PageHeader title={t("contract.title")} sub={side === "office" ? t("contract.subOffice") : t("contract.subAuthority")} />
      {error && <div className="mb-5 rounded-[6px] bg-danger-50 px-4 py-3 text-base font-medium text-danger-ink">{error}</div>}
      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <Empty icon={FileSignature} title={t("contract.empty")} />
      ) : (
        <>
          <ViewTabs label={t("contract.title")} value={view} onChange={setView} tabs={VIEWS.map((v) => ({ value: v, label: label[v], count: counts![v] }))} />
          {shown.length === 0 ? (
            <Empty icon={FileSignature} title={empty[view]} />
          ) : (
            <StaggerContainer now key={view} className="grid items-start gap-5 xl:grid-cols-2">
              {shown.map((c) => (
                <StaggerItem key={c.id}>
                  <ContractCard c={c} side={side} onChanged={load} onError={setError} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </>
      )}
    </div>
  );
}
