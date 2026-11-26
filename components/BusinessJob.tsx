"use client";

import { CircleCheck, Clock, FileSignature, Hand, ImagePlus, MessageSquareWarning, MessagesSquare, Undo2, Wrench, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import JobChat from "@/components/JobChat";
import { Card, btn, field } from "@/components/ui";
import { api, prepareImage } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import type { Category, Severity, Status } from "@/lib/types";

/** A job the Business has agreed to fix (from /api/office/jobs). */
export interface OfficeJob {
  id: number;
  title: string;
  status: Status;
  severity: Severity;
  category: Category;
  neighborhood: string;
  report_count: number;
  cover_image: string | null;
  after_image: string | null;
  fix_note: string | null;
  rejection: string | null;
}

/** An open Issue the Business could ask for (from /api/office/available). */
export interface AvailableJob {
  id: number;
  title: string;
  category: Category;
  severity: Severity;
  neighborhood: string;
  report_count: number;
  cover_image: string | null;
  created_at: string;
  request: "pending" | "accepted" | "declined" | null;
  contract: boolean;
}

/** Asked for, or offered a contract: the Business is waiting on the Authority, or the Authority on it. */
export const isRequested = (j: AvailableJob) => j.contract || j.request === "pending" || j.request === "accepted";

function ChatToggle({ issueId, chat, setChat }: { issueId: number; chat: boolean; setChat: (open: boolean) => void }) {
  return (
    <>
      <button type="button" onClick={() => setChat(!chat)} aria-expanded={chat} className="flex min-h-11 items-center gap-2 text-[15px] font-semibold text-brand hover:underline">
        <MessagesSquare size={16} aria-hidden /> {chat ? t("chat.hide") : t("chat.withAuthority")}
      </button>
      {chat && <JobChat issueId={issueId} />}
    </>
  );
}

/** What a Business can do with one of its jobs: start or send it back, record the Fix, and talk to the Authority. */
export function JobActions({ job, onChanged }: { job: OfficeJob; onChanged: () => void }) {
  const [mode, setMode] = useState<"idle" | "sendBack" | "fix">("idle");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [after, setAfter] = useState<{ file: File; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [chat, setChat] = useState(false);

  async function send(path: string, init: RequestInit) {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/issues/${job.id}/${path}`, { method: "POST", ...init });
      setMode("idle");
      onChanged();
    } catch (e) {
      setErr(errorText((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  const jsonBody = (data: unknown) => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  function recordFix() {
    const fd = new FormData();
    if (after) fd.append("afterImage", after.file);
    fd.append("note", note);
    send("fix", { body: fd });
  }

  return (
    <div className="space-y-3">
      {job.rejection && (
        <div className="flex gap-2 rounded-[6px] bg-danger-50 px-3 py-2 text-[15px] text-danger-ink">
          <MessageSquareWarning size={16} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">{t("office.rejected")}</div>
            <div>{job.rejection}</div>
          </div>
        </div>
      )}
      {job.status === "assigned" && mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => send("start", jsonBody({}))} className={btn.primary}>
            <Wrench size={16} /> {t("office.start")}
          </button>
          <button disabled={busy} onClick={() => setMode("sendBack")} className={btn.ghost}>
            <Undo2 size={16} /> {t("office.sendBack")}
          </button>
        </div>
      )}
      {mode === "sendBack" && (
        <div className="space-y-2">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("office.sendBackReason")} aria-label={t("office.sendBackReason")} rows={2} className={field} />
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => send("send-back", jsonBody({ reason }))} className={btn.dark}>
              {t("office.sendBackSend")}
            </button>
            <button disabled={busy} onClick={() => setMode("idle")} className={btn.ghost}>
              {t("office.cancel")}
            </button>
          </div>
        </div>
      )}

      {job.status === "in_progress" && mode === "idle" && (
        <button disabled={busy} onClick={() => setMode("fix")} className={btn.primary}>
          <CircleCheck size={16} /> {t("office.markFixed")}
        </button>
      )}
      {mode === "fix" && (
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-[6px] border border-dashed border-muted bg-surface p-2.5 transition-colors hover:border-brand focus-within:border-brand">
            {after ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={after.preview} alt="" className="h-14 w-20 rounded-[4px] object-cover" />
            ) : (
              <span className="flex h-14 w-20 items-center justify-center rounded-[4px] bg-brand-50 text-brand">
                <ImagePlus size={20} />
              </span>
            )}
            <span className="text-sm font-medium text-ink-2">{after ? t("office.changePhoto") : t("office.afterPhoto")}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setAfter(await prepareImage(f));
              }}
            />
          </label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("office.fixNote")} aria-label={t("office.fixNote")} className={field} />
          <div className="flex gap-2">
            <button disabled={busy || !after} onClick={recordFix} className={btn.primary}>
              <CircleCheck size={16} /> {t("office.saveFix")}
            </button>
            <button disabled={busy} onClick={() => setMode("idle")} className={btn.ghost}>
              {t("office.cancel")}
            </button>
          </div>
        </div>
      )}

      {job.status === "fixed" && (
        <p className="flex items-center gap-2 text-[15px] text-ink-2">
          <Clock size={15} /> {t("office.waiting")}
        </p>
      )}
      {job.status === "resolved" && (
        <p className="flex items-center gap-2 text-sm font-medium text-brand">
          <CircleCheck size={15} /> {t("office.resolved")}
        </p>
      )}
      {job.status === "closed_unconfirmed" && <p className="text-sm text-muted">{t("office.closedUnconfirmed")}</p>}
      {err && <p className="text-sm font-medium text-danger-ink">{err}</p>}
      <ChatToggle issueId={job.id} chat={chat} setChat={setChat} />
    </div>
  );
}

/** A Business asks the Authority for an open job (with a note), sees where its request stands, and talks it over. */
export function AskActions({ job, onChanged }: { job: AvailableJob; onChanged: () => void }) {
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // Asking opens the chat, so the Business can say more straight away.
  const [chat, setChat] = useState(false);

  async function ask() {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/office/available/${job.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      setAsking(false);
      setChat(true);
      onChanged();
    } catch (e) {
      setErr(errorText((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const status = job.contract ? (
    <Link href="/office/contracts?view=pending" className="flex items-center gap-2 text-[15px] font-semibold text-brand hover:underline">
      <FileSignature size={15} aria-hidden /> {t("contract.offered")}
    </Link>
  ) : job.request === "pending" ? (
    <p className="flex items-center gap-2 text-[15px] font-medium text-ink-2">
      <Clock size={15} aria-hidden /> {t("available.pending")}
    </p>
  ) : job.request === "declined" ? (
    <p className="flex items-center gap-2 text-[15px] text-muted">
      <XCircle size={15} aria-hidden /> {t("available.declined")}
    </p>
  ) : job.request === "accepted" ? (
    <p className="flex items-center gap-2 text-[15px] font-medium text-brand">
      <CircleCheck size={15} aria-hidden /> {t("available.accepted")}
    </p>
  ) : null;

  return (
    <div className="space-y-3">
      {status}
      {job.request !== "pending" && !job.contract && !asking && (
        <button type="button" disabled={busy} onClick={() => setAsking(true)} className={btn.primary}>
          <Hand size={16} aria-hidden /> {t("available.ask")}
        </button>
      )}
      {asking && (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={t("available.notePlaceholder")}
            aria-label={t("available.notePlaceholder")}
            className={field}
          />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={ask} className={btn.primary}>
              {t("available.send")}
            </button>
            <button type="button" disabled={busy} onClick={() => setAsking(false)} className={btn.ghost}>
              {t("office.cancel")}
            </button>
          </div>
        </div>
      )}
      {err && <p className="text-sm font-medium text-danger-ink">{err}</p>}
      <ChatToggle issueId={job.id} chat={chat} setChat={setChat} />
    </div>
  );
}

/**
 * On an Issue's own page, for a Business: the same actions as in its lists, whether the Issue is one of its jobs
 * or an open job it could ask for. Shows nothing for Issues outside its Department and sector.
 */
export function BusinessPanel({ issueId, onChanged }: { issueId: number; onChanged: () => void }) {
  const [state, setState] = useState<{ job?: OfficeJob; available?: AvailableJob } | null>(null);
  const load = useCallback(() => {
    Promise.all([
      api<{ jobs: OfficeJob[] }>("/api/office/jobs").catch(() => ({ jobs: [] as OfficeJob[] })),
      api<{ jobs: AvailableJob[] }>("/api/office/available").catch(() => ({ jobs: [] as AvailableJob[] })),
    ]).then(([mine, open]) => setState({ job: mine.jobs.find((j) => j.id === issueId), available: open.jobs.find((j) => j.id === issueId) }));
  }, [issueId]);
  useEffect(load, [load]);
  const changed = () => {
    load();
    onChanged();
  };

  if (!state || (!state.job && !state.available)) return null;
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-xl font-semibold">{state.job ? t("business.yourJob") : t("business.openJob")}</h2>
      {state.job ? <JobActions job={state.job} onChanged={changed} /> : <AskActions job={state.available!} onChanged={changed} />}
    </Card>
  );
}
