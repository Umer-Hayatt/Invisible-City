"use client";

import { ArrowUpRight, CircleCheck, Clock, Hand, MessagesSquare, SearchCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Gate from "@/components/Gate";
import JobChat from "@/components/JobChat";
import { Card, CategoryChip, CriticalTag, Empty, IssueThumb, ListSkeleton, PageHeader, btn, field } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import type { Category, Severity } from "@/lib/types";
import { imageUrl } from "@/lib/uploads-url";

interface Job {
  id: number;
  title: string;
  category: Category;
  severity: Severity;
  neighborhood: string;
  report_count: number;
  cover_image: string | null;
  created_at: string;
  request: "pending" | "accepted" | "declined" | null;
}

export default function AvailablePage() {
  return (
    <Gate roles={["office"]} next="/office/available">
      <Available />
    </Gate>
  );
}

/** Open Issues of the Business's Department in its sector. It asks for one, then talks it over with the Authority. */
function Available() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const load = useCallback(() => {
    api<{ jobs: Job[] }>("/api/office/available")
      .then((d) => setJobs(d.jobs))
      .catch(() => setJobs([]));
  }, []);
  useEffect(load, [load]);

  return (
    <div>
      <PageHeader title={t("available.title")} sub={t("available.sub")} />
      {jobs === null ? (
        <ListSkeleton />
      ) : jobs.length === 0 ? (
        <Empty icon={SearchCheck} title={t("available.empty")} />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {jobs.map((j) => (
            <AvailableCard key={j.id} job={j} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function AvailableCard({ job, onChanged }: { job: Job; onChanged: () => void }) {
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
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

  const status =
    job.request === "pending" ? (
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
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        <IssueThumb src={imageUrl(job.cover_image)} category={job.category} className="h-24 w-28 shrink-0 rounded-[6px]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip category={job.category} />
            <CriticalTag severity={job.severity} />
          </div>
          <Link href={`/issues/${job.id}`} className="mt-1.5 flex items-start gap-1 text-lg font-semibold leading-snug hover:underline">
            {job.title} <ArrowUpRight size={16} className="mt-1 shrink-0" aria-hidden />
          </Link>
          <p className="mt-1 text-sm text-muted">
            {job.neighborhood} · {t("office.reports", { n: job.report_count })} · {timeAgo(job.created_at)}
          </p>
        </div>
      </div>
      <div className="space-y-3 border-t border-line p-4">
        {status}
        {job.request !== "pending" && !asking && (
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
        <button
          type="button"
          onClick={() => setChat(!chat)}
          aria-expanded={chat}
          className="flex min-h-11 items-center gap-2 text-[15px] font-semibold text-brand hover:underline"
        >
          <MessagesSquare size={16} aria-hidden /> {chat ? t("chat.hide") : t("chat.withAuthority")}
        </button>
        {chat && <JobChat issueId={job.id} />}
      </div>
    </Card>
  );
}
