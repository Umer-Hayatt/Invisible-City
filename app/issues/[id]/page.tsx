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
import { Card, CategoryChip, IssueThumb, PriorityMeter, SeverityBadge, StatusBadge } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import { useMe } from "@/lib/me";
import { Issue, IssueEvent, Report } from "@/lib/types";
import { imageUrl } from "@/lib/uploads-url";

interface IssueData {
  issue: Issue;
  reports: Report[];
  events: IssueEvent[];
}

const EVENT_STYLE: Record<string, { icon: LucideIcon; cls: string }> = {
  created: { icon: Camera, cls: "bg-ink text-white" },
  merged: { icon: Copy, cls: "bg-accent text-ink" },
  escalated: { icon: ArrowUp, cls: "bg-orange-500 text-white" },
  assigned: { icon: HardHat, cls: "bg-violet-600 text-white" },
  in_progress: { icon: Wrench, cls: "bg-blue-600 text-white" },
  fixed: { icon: Hammer, cls: "bg-amber-500 text-white" },
  rejected: { icon: ThumbsDown, cls: "bg-red-600 text-white" },
  sent_back: { icon: Undo2, cls: "bg-sunken text-ink" },
  closed_unconfirmed: { icon: Clock, cls: "bg-sunken text-ink" },
  resolved: { icon: CircleCheck, cls: "bg-brand text-white" },
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
  if (!data) return <div className="text-muted">Loading…</div>;
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
        <ArrowLeft size={16} /> City map
      </Link>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-muted">#{issue.id}</span>
            <CategoryChip category={issue.category} />
            <SeverityBadge severity={issue.severity} />
            <StatusBadge status={issue.status} />
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{issue.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {issue.neighborhood}, Islamabad · reported by {issue.report_count} citizen{issue.report_count > 1 ? "s" : ""} · first seen{" "}
            {timeAgo(issue.created_at)}
          </p>
        </div>
        {!finished && (
          <Card className="px-5 py-3">
            <div className="text-xs font-semibold text-muted">Priority score</div>
            <div className="mt-1">
              <PriorityMeter value={issue.priority} wide />
            </div>
          </Card>
        )}
      </div>

      {showFix ? (
        <Card className="overflow-hidden">
          <div className="grid sm:grid-cols-2">
            <figure className="relative">
              <IssueThumb src={imageUrl(before)} category={issue.category} className="h-72 w-full" />
              <figcaption className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                {t("issue.before")} · {new Date(issue.created_at).toLocaleDateString()}
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
              <figcaption className="absolute left-3 top-3 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
                {t("issue.after")} · {afterDate ? new Date(afterDate).toLocaleDateString() : ""}
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
        before && <IssueThumb src={imageUrl(before)} category={issue.category} className="max-h-[420px] w-full rounded-2xl" />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand">
              <Sparkles size={13} /> AI summary
            </div>
            <p className="mt-2 leading-relaxed text-ink-2">{issue.summary}</p>
            {issue.recurrence_of && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-800">
                <Repeat size={15} /> Recurring problem: an earlier issue at this spot,{" "}
                <Link className="font-semibold underline" href={`/issues/${issue.recurrence_of}`}>
                  #{issue.recurrence_of}
                </Link>
                , was already fixed once.
              </p>
            )}
            {issue.assigned_team && !showFix && (
              <p className="mt-3 flex items-center gap-2 text-sm">
                <HardHat size={15} className="text-violet-700" /> Assigned to <b>{issue.assigned_team}</b>
              </p>
            )}
          </Card>

          <div>
            <h2 className="mb-3 font-bold tracking-tight">
              Citizen reports <span className="text-muted">({reports.length})</span>
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
                        {r.reporter_name || "Anonymous citizen"} <span className="font-normal text-muted">· {timeAgo(r.created_at)}</span>
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          idx === 0 ? "bg-ink text-white" : "bg-accent-50 text-ink-2 ring-1 ring-inset ring-amber-200"
                        }`}
                      >
                        {idx === 0
                          ? "First report"
                          : r.duplicate_score !== null
                            ? `Grouped · ${Math.round(r.duplicate_score * 100)}% match`
                            : "Grouped by AI"}
                      </span>
                    </div>
                    <div className="mt-1 text-ink-2">{r.description || <i className="text-muted">Photo only</i>}</div>
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
            <h2 className="mb-4 font-bold tracking-tight">Accountability timeline</h2>
            <ol className="space-y-0">
              {events.map((e, idx) => {
                const st = EVENT_STYLE[e.kind] ?? EVENT_STYLE.created;
                return (
                  <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {idx < events.length - 1 && <span className="absolute left-[13px] top-7 h-full w-px bg-line" />}
                    <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${st.cls}`}>
                      <st.icon size={14} />
                    </span>
                    <div className="text-sm">
                      <div className="font-medium leading-snug">{e.message}</div>
                      <div className="mt-0.5 text-xs text-muted">{new Date(e.created_at).toLocaleString()}</div>
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
