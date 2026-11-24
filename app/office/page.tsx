"use client";

import { ArrowUpRight, CircleCheck, Clock, ImagePlus, Inbox, MessageSquareWarning, MessagesSquare, Undo2, Wrench } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import Gate from "@/components/Gate";
import JobChat from "@/components/JobChat";
import { Card, CriticalTag, Empty, IssueThumb, ListSkeleton, PageHeader, StatusBadge, btn, field } from "@/components/ui";
import { api, prepareImage } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import type { Category, Severity, Status } from "@/lib/types";
import { imageUrl } from "@/lib/uploads-url";

interface Job {
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

function Jobs() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const load = useCallback(() => {
    api<{ jobs: Job[] }>("/api/office/jobs")
      .then((d) => setJobs(d.jobs))
      .catch(() => setJobs([]));
  }, []);
  useEffect(load, [load]);
  return (
    <div>
      <PageHeader title={t("office.title")} sub={t("office.sub")} />
      {jobs === null ? (
        <ListSkeleton />
      ) : jobs.length === 0 ? (
        <Empty icon={Inbox} title={t("office.empty")} />
      ) : (
        // Jobs re-sort as they move on (In progress first); `layout` glides each card to its new place.
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <AnimatePresence initial={false}>
            {jobs.map((j) => (
              <m.div key={j.id} layout exit={{ opacity: 0, scale: 0.97 }}>
                <JobCard job={j} onChanged={load} />
              </m.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function JobCard({ job, onChanged }: { job: Job; onChanged: () => void }) {
  const [mode, setMode] = useState<"idle" | "sendBack" | "fix">("idle");
  const [chat, setChat] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [after, setAfter] = useState<{ file: File; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

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
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        <IssueThumb src={imageUrl(job.cover_image)} category={job.category} className="h-24 w-24 shrink-0 rounded-[6px] sm:w-32" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-lg font-semibold leading-snug">{job.title}</div>
              <div className="mt-0.5 text-[15px] text-muted">
                #{job.id}, {job.neighborhood}, {t("office.reports", { n: job.report_count })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CriticalTag severity={job.severity} status={job.status} />
              <StatusBadge status={job.status} />
            </div>
          </div>
          <Link href={`/issues/${job.id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            {t("office.details")} <ArrowUpRight size={14} className="rtl:-scale-x-100" />
          </Link>
        </div>
      </div>

      {job.rejection && (
        <div className="mx-4 mb-3 flex gap-2 rounded-[6px] bg-danger-50 px-3 py-2 text-[15px] text-danger-ink">
          <MessageSquareWarning size={16} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">{t("office.rejected")}</div>
            <div>{job.rejection}</div>
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-line px-4 py-3">
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
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("office.sendBackReason")} rows={2} className={field} />
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
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("office.fixNote")} className={field} />
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
        <button type="button" onClick={() => setChat(!chat)} aria-expanded={chat} className="flex min-h-11 items-center gap-2 text-[15px] font-semibold text-brand hover:underline">
          <MessagesSquare size={16} aria-hidden /> {chat ? t("chat.hide") : t("chat.withAuthority")}
        </button>
        {chat && <JobChat issueId={job.id} />}
      </div>
    </Card>
  );
}

export default function OfficePage() {
  return (
    <Gate roles={["office"]} next="/office">
      <Jobs />
    </Gate>
  );
}
