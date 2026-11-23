"use client";

import {
  ArrowLeft,
  ArrowUp,
  Camera,
  CircleCheck,
  Clock,
  Copy,
  Hammer,
  HardHat,
  Repeat,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  Undo2,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CityMap from "@/components/CityMap";
import { Card, CategoryChip, IssueThumb, PageSkeleton, PriorityMeter, SeverityBadge, StatusBadge } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { errorText, formatDate, formatDateTime, t } from "@/lib/i18n";
import { useMe } from "@/lib/me";
import { Issue, IssueEvent, Report } from "@/lib/types";
import { imageUrl } from "@/lib/uploads-url";

interface IssueData {
  issue: Issue;
  reports: Report[];
  events: IssueEvent[];
}

const EVENT_STYLE: Record<string, { icon: LucideIcon; cls: string }> = {
  created: { icon: Camera, cls: "bg-ink text-canvas" },
  merged: { icon: Copy, cls: "bg-accent text-ink" },
  escalated: { icon: ArrowUp, cls: "bg-orange-500 text-white" },
  assigned: { icon: HardHat, cls: "bg-violet-600 text-white" },
  in_progress: { icon: Wrench, cls: "bg-blue-600 text-white" },
  fixed: { icon: Hammer, cls: "bg-amber-500 text-white" },
  rejected: { icon: ThumbsDown, cls: "bg-red-600 text-white" },
  sent_back: { icon: Undo2, cls: "bg-sunken text-ink" },
  closed_unconfirmed: { icon: Clock, cls: "bg-sunken text-ink" },
  resolved: { icon: CircleCheck, cls: "bg-brand text-on-brand" },
  recurring: { icon: Repeat, cls: "bg-violet-600 text-white" },
  open: { icon: RotateCcw, cls: "bg-sunken text-ink" },
};

export default function IssuePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<IssueData | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const { me } = useMe();
  const isAuthority = me?.role === "authority";

  const load = useCallback(() => {
    api<IssueData>(`/api/issues/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  async function flagSpam(reportId: number) {
    if (!window.confirm(t("review.flagConfirm"))) return;
    try {
      const out = await api<{ issueRemoved: boolean; suspended: boolean }>(`/api/issues/${id}/reports/${reportId}/spam`, { method: "POST" });
      const extra = [out.issueRemoved ? t("review.issueRemoved") : "", out.suspended ? t("review.suspended") : ""].filter(Boolean).join(" ");
      window.alert(t("review.flagged", { extra }));
      if (out.issueRemoved) router.push("/admin");
      else load();
    } catch (e) {
      window.alert(errorText((e as Error).message));
    }
  }

  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return <PageSkeleton />;
  const { issue, reports, events } = data;
  const before = issue.cover_image ?? reports.find((r) => r.image)?.image ?? null;
  const photos = reports.filter((r) => r.image);
  const resolved = issue.status === "resolved";
  // Before/after appears from the moment an Office records a Fix.
  const showFix = issue.status === "fixed" || resolved || issue.status === "closed_unconfirmed";
  const afterDate = issue.resolved_at ?? issue.fixed_at ?? issue.closed_at;
  const finished = resolved || issue.status === "closed_unconfirmed";

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} className="rtl:rotate-180" /> {t("nav.map")}
      </Link>

      {/* Header: over the photo while the Issue is still being worked on; plain once a Fix shows before and after. */}
      <div
        className={`rise relative isolate overflow-hidden rounded-3xl border border-line shadow-card ${showFix ? "bg-surface" : "min-h-[340px] bg-ink"}`}
      >
        {!showFix && before && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(before)!} alt="" className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/50 to-black/10" />
          </>
        )}
        <div className={`flex h-full flex-col justify-end gap-5 p-6 sm:p-8 md:flex-row md:items-end md:justify-between ${showFix ? "" : "min-h-[340px] text-white"}`}>
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-sm font-bold ${showFix ? "text-muted" : "text-white/70"}`}>#{issue.id}</span>
              <CategoryChip category={issue.category} />
              <SeverityBadge severity={issue.severity} />
              <StatusBadge status={issue.status} />
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">{issue.title}</h1>
            <p className={`mt-2 text-sm ${showFix ? "text-muted" : "text-white/75"}`}>
              {t("issue.meta", { place: issue.neighborhood, n: issue.report_count, when: timeAgo(issue.created_at) })}
            </p>
          </div>
          {!finished && (
            <div className={`shrink-0 rounded-2xl px-5 py-3 ${showFix ? "border border-line bg-sunken" : "border border-white/15 bg-white/10 backdrop-blur-md"}`}>
              <div className={`text-xs font-semibold ${showFix ? "text-muted" : "text-white/70"}`}>{t("issue.priority")}</div>
              <div className="mt-1">
                <PriorityMeter value={issue.priority} wide />
              </div>
            </div>
          )}
        </div>
      </div>

      {showFix ? (
        <Card className="overflow-hidden">
          <div className="grid sm:grid-cols-2">
            <figure className="relative">
              <IssueThumb src={imageUrl(before)} category={issue.category} className="h-72 w-full" />
              <figcaption className="absolute start-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-xs font-bold text-canvas backdrop-blur">
                {t("issue.before")} · {formatDate(issue.created_at)}
              </figcaption>
            </figure>
            <figure className="relative">
              {issue.after_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl(issue.after_image)!} alt={t("issue.after")} className="h-72 w-full object-cover" />
              ) : (
                <div className="flex h-72 flex-col items-center justify-center gap-2 bg-brand-50 text-sm font-semibold text-brand">
                  <CircleCheck size={28} /> {t("issue.noAfter")}
                </div>
              )}
              <figcaption className="absolute start-3 top-3 rounded-full bg-brand px-3 py-1 text-xs font-bold text-on-brand">
                {t("issue.after")} · {afterDate ? formatDate(afterDate) : ""}
              </figcaption>
            </figure>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-sm">
            <span className="font-medium">{issue.fix_note ?? issue.resolution_note}</span>
            {issue.assigned_team && <span className="text-muted">{t("issue.fixedBy", { office: issue.assigned_team })}</span>}
          </div>
          {issue.status === "fixed" && <div className="border-t border-line bg-amber-50 px-5 py-2.5 text-sm text-amber-900">{t("issue.awaitingConfirmation")}</div>}
          {issue.status === "closed_unconfirmed" && <div className="border-t border-line bg-sunken px-5 py-2.5 text-sm text-muted">{t("issue.closedUnconfirmed")}</div>}
        </Card>
      ) : (
        null
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand">
              <Sparkles size={13} /> {t("issue.aiSummary")}
            </div>
            <p className="mt-2 leading-relaxed text-ink-2">{issue.summary}</p>
            {issue.recurrence_of && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-800">
                <Repeat size={15} /> {t("issue.recurring")}{" "}
                <Link className="font-semibold underline" href={`/issues/${issue.recurrence_of}`}>
                  #{issue.recurrence_of}
                </Link>
              </p>
            )}
            {issue.assigned_team && !showFix && (
              <p className="mt-3 flex items-center gap-2 text-sm">
                <HardHat size={15} className="text-violet-700" /> {t("admin.assignedTo", { office: issue.assigned_team })}
              </p>
            )}
          </Card>

          <div>
            <h2 className="mb-3 font-bold tracking-tight">
              {t("issue.reportsTitle")} <span className="text-muted">({reports.length})</span>
            </h2>
            {photos.length > 0 && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {photos.map((r) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={r.id} src={imageUrl(r.image)!} alt="" className="h-24 w-32 shrink-0 rounded-xl object-cover" />
                ))}
              </div>
            )}
            <Card className="divide-y divide-line">
              {reports.map((r, idx) => (
                <div key={r.id} className="flex gap-3 p-4 text-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken text-xs font-bold text-ink-2">
                    {(r.reporter_name || "A").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        {r.reporter_name || t("insights.anonymousCitizen")} <span className="font-normal text-muted">· {timeAgo(r.created_at)}</span>
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          idx === 0 ? "bg-ink text-canvas" : "bg-accent-50 text-ink-2 ring-1 ring-inset ring-amber-200"
                        }`}
                      >
                        {idx === 0
                          ? t("issue.firstReport")
                          : r.duplicate_score !== null
                            ? t("issue.groupedMatch", { n: Math.round(r.duplicate_score * 100) })
                            : t("issue.grouped")}
                      </span>
                    </div>
                    <div className="mt-1 text-ink-2">{r.description || <i className="text-muted">{t("issue.photoOnly")}</i>}</div>
                    {r.voice_transcript && (
                      <div className="mt-1 rounded-lg bg-sunken px-2.5 py-1.5 text-ink-2">
                        <div className="text-xs font-semibold text-muted">{t("issue.voiceUrdu")}</div>
                        <div dir="rtl" lang="ur">
                          {r.voice_transcript}
                        </div>
                      </div>
                    )}
                    {r.reporter_email !== undefined && (
                      <div className="mt-1 text-xs text-muted">
                        {t("review.contact")}: {r.reporter_email ?? "-"} · {r.reporter_phone ?? "-"}
                      </div>
                    )}
                    {isAuthority && (
                      <button onClick={() => flagSpam(r.id)} className="mt-2 text-xs font-semibold text-red-600 hover:underline">
                        {t("review.flagSpam")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CityMap issues={[issue]} focus={[issue.lat, issue.lng]} zoom={16} className="h-[240px]" />
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-bold tracking-tight">{t("issue.timeline")}</h2>
            <ol className="stagger space-y-0">
              {events.map((e, idx) => {
                const st = EVENT_STYLE[e.kind] ?? EVENT_STYLE.created;
                return (
                  <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {idx < events.length - 1 && <span className="absolute start-[13px] top-7 h-full w-px bg-line" />}
                    <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${st.cls}`}>
                      <st.icon size={14} />
                    </span>
                    <div className="text-sm">
                      <div className="font-medium leading-snug">{e.message}</div>
                      <div className="mt-0.5 text-xs text-muted">{formatDateTime(e.created_at)}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
