"use client";

import { Camera, ChevronRight, CircleCheck, HardHat, Inbox, ListTree, ThumbsDown, ThumbsUp, Trophy } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Card, Empty, IssueThumb, ListSkeleton, PageHeader, StatusBadge, btn, field } from "@/components/ui";
import Gate from "@/components/Gate";
import { api, timeAgo } from "@/lib/client";
import { errorText, formatDate, formatDateTime, t, type MessageKey } from "@/lib/i18n";
import type { Contributor } from "@/lib/insights";
import { Category, IssueEvent, Report, Status } from "@/lib/types";
import { imageUrl } from "@/lib/uploads-url";

type Row = Report & {
  issue_status: Status;
  issue_title: string;
  issue_report_count: number;
  issue_after_image: string | null;
  issue_fix_note: string | null;
  issue_fixed_at: string | null;
  issue_team: string | null;
  issue_neighborhood: string;
  issue_events: IssueEvent[];
};

const STEP_LABEL: MessageKey[] = ["track.stepReported", "track.stepAssigned", "track.stepWorking", "track.stepFixed", "track.stepDone"];
const STEP_OF: Record<Status, number> = { open: 0, assigned: 1, in_progress: 2, fixed: 3, closed_unconfirmed: 3, resolved: 4 };
const FIX_ANSWER_DAYS = 7;

export default function TrackPage() {
  return (
    <Gate roles={["citizen"]} next="/track">
      <TrackList />
    </Gate>
  );
}

function TrackList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [impact, setImpact] = useState<Contributor | null>(null);

  const load = useCallback(() => {
    api<{ reports: Row[]; impact: Contributor | null }>("/api/reports")
      .then((d) => {
        setRows(d.reports);
        setImpact(d.impact);
      })
      .catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t("track.eyebrow")} title={t("track.title")} sub={t("track.sub")} />

      {impact && (
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-7">
          <div className="pointer-events-none absolute -end-10 -top-20 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative grid grid-cols-2 gap-6 sm:grid-cols-5">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
                <Trophy size={14} className="text-accent" /> {t("track.impact")}
              </div>
              <div className="mt-1 text-5xl font-extrabold tabular-nums">{impact.score}</div>
            </div>
            <Mini label={t("track.statReports")} v={impact.reports} />
            <Mini label={t("track.statFirst")} v={impact.firstReports} />
            <Mini label={t("track.statBacked")} v={impact.corroborated} />
            <Mini label={t("track.statFixed")} v={impact.resolved} />
          </div>
        </div>
      )}

      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <Card>
          <Empty icon={Inbox} title={t("track.emptyTitle")}>
            {t("track.emptyBody")}
            <div className="mt-4">
              <Link href="/report" className={btn.primary}>
                <Camera size={16} /> {t("nav.reportLong")}
              </Link>
            </div>
          </Empty>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <ReportCard key={r.id} r={r} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({ r, onChanged }: { r: Row; onChanged: () => void }) {
  const [showTimeline, setShowTimeline] = useState(false);
  const step = STEP_OF[r.issue_status];
  return (
    <Card className="rise p-4">
      <Link href={`/issues/${r.issue_id}`} className="group flex gap-4">
        <IssueThumb src={imageUrl(r.image)} category={r.ai_category as Category} className="h-20 w-20 shrink-0 rounded-xl sm:h-24 sm:w-24" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-bold group-hover:underline">{r.issue_title}</div>
              <div className="mt-0.5 text-xs text-muted">
                {t("track.meta", { id: r.issue_id, place: r.issue_neighborhood, when: timeAgo(r.created_at) })} ·{" "}
                {r.issue_report_count > 1 ? t("track.others", { n: r.issue_report_count }) : t("track.onlyYou")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={r.issue_status} />
              <ChevronRight size={18} className="hidden text-muted transition group-hover:translate-x-0.5 sm:block rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-1.5">
            {STEP_LABEL.map((l, i) => (
              <div key={l}>
                <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-sunken"}`} />
                <div className={`mt-1.5 text-[11px] leading-tight ${i <= step ? "font-semibold text-ink" : "text-muted"}`}>{t(l)}</div>
              </div>
            ))}
          </div>
          {r.issue_team && (r.issue_status === "assigned" || r.issue_status === "in_progress") && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-2">
              <HardHat size={13} /> {r.issue_team}
            </div>
          )}
        </div>
      </Link>

      {r.issue_status === "fixed" && <FixAnswer r={r} onChanged={onChanged} />}
      {r.issue_status === "resolved" && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand">
          <CircleCheck size={15} /> {t("track.resolved")}
        </p>
      )}
      {r.issue_status === "closed_unconfirmed" && <p className="mt-3 text-sm text-muted">{t("track.closedUnconfirmed")}</p>}

      <button onClick={() => setShowTimeline((s) => !s)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2 hover:text-ink">
        <ListTree size={14} /> {showTimeline ? t("track.hideTimeline") : t("track.timeline")}
      </button>
      {showTimeline && (
        <ol className="stagger mt-2 space-y-2 border-s border-line ps-4">
          {r.issue_events.map((e) => (
            <li key={e.id} className="text-sm">
              <div className="leading-snug">{e.message}</div>
              <div className="text-xs text-muted">{formatDateTime(e.created_at)}</div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/** A reporting Citizen confirms the Fix (Resolution) or rejects it with a comment (Rejection). */
function FixAnswer({ r, onChanged }: { r: Row; onChanged: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function answer(path: "confirm" | "reject", data: unknown) {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/issues/${r.issue_id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      onChanged();
    } catch (e) {
      setErr(errorText((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const answerBy = r.issue_fixed_at ? new Date(new Date(r.issue_fixed_at).getTime() + FIX_ANSWER_DAYS * 86_400_000) : null;
  return (
    <div className="mt-4 space-y-3 rounded-2xl bg-amber-50 p-3 ring-1 ring-inset ring-amber-200">
      <div className="text-sm font-bold">{t("track.fixedAsk")}</div>
      {r.issue_after_image && (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(r.issue_after_image)!} alt={t("track.afterPhoto")} className="max-h-64 w-full rounded-xl object-cover" />
          {r.issue_fix_note && <figcaption className="mt-1.5 text-sm text-ink-2">{r.issue_fix_note}</figcaption>}
        </figure>
      )}
      {rejecting ? (
        <div className="space-y-2">
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("track.rejectComment")} rows={2} className={field} />
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => answer("reject", { comment })} className={btn.dark}>
              {t("track.rejectSend")}
            </button>
            <button disabled={busy} onClick={() => setRejecting(false)} className={btn.ghost}>
              {t("office.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => answer("confirm", {})} className={btn.primary}>
            <ThumbsUp size={16} /> {t("track.confirm")}
          </button>
          <button disabled={busy} onClick={() => setRejecting(true)} className={btn.ghost}>
            <ThumbsDown size={16} /> {t("track.reject")}
          </button>
        </div>
      )}
      {answerBy && <p className="text-xs text-muted">{t("track.answerBy", { date: formatDate(answerBy) })}</p>}
      {err && <p className="text-sm font-medium text-red-600">{err}</p>}
    </div>
  );
}

function Mini({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="text-xs font-semibold text-white/60">{label}</div>
      <div className="mt-1 text-3xl font-extrabold tabular-nums">{v}</div>
    </div>
  );
}
