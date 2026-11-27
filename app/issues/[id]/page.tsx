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
import AssignPanel from "@/components/AssignPanel";
import { BusinessPanel } from "@/components/BusinessJob";
import { m } from "motion/react";
import { FadeIn, ImageReveal, RevealText, SlideUp, StaggerContainer, StaggerItem } from "@/components/animate";
import CityMap from "@/components/CityMap";
import { Alert, ConfirmDialog } from "@/components/DataTools";
import RequestCard, { type JobRequest } from "@/components/RequestCard";
import { Card, CriticalTag, IssueThumb, PageSkeleton, StatusBadge } from "@/components/ui";
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
  created: { icon: Camera, cls: "bg-st-open text-on-status" },
  merged: { icon: Copy, cls: "bg-sunken text-ink" },
  escalated: { icon: ArrowUp, cls: "bg-danger text-on-status" },
  assigned: { icon: HardHat, cls: "bg-st-assigned text-on-status" },
  in_progress: { icon: Wrench, cls: "bg-st-work text-on-status" },
  fixed: { icon: Hammer, cls: "bg-action text-on-action" },
  rejected: { icon: ThumbsDown, cls: "bg-danger text-on-status" },
  sent_back: { icon: Undo2, cls: "bg-sunken text-ink" },
  closed_unconfirmed: { icon: Clock, cls: "bg-sunken text-ink" },
  resolved: { icon: CircleCheck, cls: "bg-st-done text-on-status" },
  recurring: { icon: Repeat, cls: "bg-sunken text-ink" },
  open: { icon: RotateCcw, cls: "bg-sunken text-ink" },
};

export default function IssuePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<IssueData | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const { me } = useMe();
  const isAuthority = me?.role === "authority";
  const isBusiness = me?.role === "office";
  // Bumped after any action, so the panels below re-read what they show.
  const [version, setVersion] = useState(0);
  // Spam flag: which Report is being asked about, and what happened after.
  const [flagging, setFlagging] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    api<IssueData>(`/api/issues/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);
  const changed = () => {
    load();
    setVersion((v) => v + 1);
  };
  useEffect(load, [load]);

  async function flagSpam(reportId: number) {
    setNotice(null);
    try {
      const out = await api<{ issueRemoved: boolean; suspended: boolean }>(`/api/issues/${id}/reports/${reportId}/spam`, { method: "POST" });
      const extra = [out.issueRemoved ? t("review.issueRemoved") : "", out.suspended ? t("review.suspended") : ""].filter(Boolean).join(" ");
      setNotice({ tone: "success", text: t("review.flagged", { extra }) });
      if (out.issueRemoved) router.push("/admin/reports");
      else load();
    } catch (e) {
      setNotice({ tone: "error", text: errorText((e as Error).message) });
    }
  }

  if (error) return <div className="text-danger-ink">{error}</div>;
  if (!data) return <PageSkeleton />;
  const { issue, reports, events } = data;
  const before = issue.cover_image ?? reports.find((r) => r.image)?.image ?? null;
  const photos = reports.filter((r) => r.image);
  const resolved = issue.status === "resolved";
  // Before/after appears from the moment an Office records a Fix.
  const showFix = issue.status === "fixed" || resolved || issue.status === "closed_unconfirmed";
  const afterDate = issue.resolved_at ?? issue.fixed_at ?? issue.closed_at;
  const back = isBusiness
    ? { href: "/office", label: t("business.jobs") }
    : isAuthority
      ? { href: "/admin/reports", label: t("authority.reports") }
      : { href: "/", label: t("nav.map") };
  const settled = resolved || issue.status === "closed_unconfirmed";

  return (
    <div className="space-y-6">
      <Link href={back.href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} className="rtl:rotate-180" /> {back.label}
      </Link>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <ConfirmDialog
        open={flagging !== null}
        onOpenChange={(o) => !o && setFlagging(null)}
        title={t("review.flagSpam")}
        body={t("review.flagConfirm")}
        confirm={t("review.flagSpam")}
        danger
        onConfirm={() => (flagging !== null ? flagSpam(flagging) : undefined)}
      />

      {/* Header: over the photo while the Issue is still being worked on; plain once a Fix shows before and after. */}
      <div
        className={`on-dark relative isolate overflow-hidden rounded-[8px] text-on-dark ${showFix ? "bg-navy" : "min-h-[340px] bg-navy"}`}
      >
        {!showFix && before && (
          <>
            <m.img
              src={imageUrl(before)!}
              alt=""
              initial={{ scale: 1.08, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 -z-20 h-full w-full object-cover"
            />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/70 to-navy/25" />
          </>
        )}
        <div className={`flex h-full flex-col justify-end gap-5 p-6 sm:p-8 md:flex-row md:items-end md:justify-between ${showFix ? "" : "min-h-[340px]"}`}>
          <div className="max-w-3xl">
            <FadeIn now className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-on-dark-2">#{issue.id}</span>
              <StatusBadge status={issue.status} />
              <CriticalTag severity={issue.severity} status={issue.status} />
            </FadeIn>
            <RevealText as="h1" now delay={0.1} text={issue.title} className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.025em] sm:text-5xl" />
            <SlideUp now delay={0.4}>
              <p className="mt-3 text-base text-on-dark-2">
                {t("issue.meta", { place: issue.neighborhood, n: issue.report_count, when: timeAgo(issue.created_at) })}
              </p>
            </SlideUp>
          </div>
        </div>
      </div>

      {showFix ? (
        <Card className="overflow-hidden">
          <div className="grid sm:grid-cols-2">
            <figure className="relative">
              <ImageReveal className="h-72 rounded-none">
                <IssueThumb src={imageUrl(before)} category={issue.category} className="h-72 w-full" />
              </ImageReveal>
              <figcaption className="absolute start-3 top-3 rounded-[4px] bg-navy px-3 py-1 text-sm font-semibold text-on-dark">
                {t("issue.before")}, {formatDate(issue.created_at)}
              </figcaption>
            </figure>
            <figure className="relative">
              {issue.after_image ? (
                <ImageReveal className="h-72 rounded-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(issue.after_image)!} alt={t("issue.after")} className="h-72 w-full object-cover" />
                </ImageReveal>
              ) : (
                <div className="flex h-72 flex-col items-center justify-center gap-2 bg-brand-50 text-sm font-semibold text-brand">
                  <CircleCheck size={28} /> {t("issue.noAfter")}
                </div>
              )}
              <figcaption className="absolute start-3 top-3 rounded-[4px] bg-action px-3 py-1 text-sm font-semibold text-on-action">
                {t("issue.after")}
                {afterDate ? `, ${formatDate(afterDate)}` : ""}
              </figcaption>
            </figure>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-base">
            <span className="font-medium">{issue.fix_note ?? issue.resolution_note}</span>
            {issue.assigned_team && <span className="text-muted">{t("issue.fixedBy", { office: issue.assigned_team })}</span>}
          </div>
          {issue.status === "fixed" && <div className="border-t border-line bg-note px-5 py-3 text-base text-ink">{t("issue.awaitingConfirmation")}</div>}
          {issue.status === "closed_unconfirmed" && <div className="border-t border-line bg-sunken px-5 py-3 text-base text-ink-2">{t("issue.closedUnconfirmed")}</div>}
        </Card>
      ) : (
        null
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {isBusiness && <BusinessPanel key={version} issueId={issue.id} onChanged={changed} />}
          {isAuthority && !settled && <AuthorityPanel key={version} issue={issue} onChanged={changed} />}
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Sparkles size={18} className="text-brand" aria-hidden /> {t("issue.aiSummary")}
            </h2>
            <p className="mt-2 leading-relaxed text-ink-2">{issue.summary}</p>
            {issue.recurrence_of && (
              <p className="mt-3 flex items-center flex-wrap gap-2 rounded-[6px] bg-note px-3 py-2 text-base">
                <Repeat size={15} /> {t("issue.recurring")}{" "}
                <Link className="font-semibold text-brand hover:underline" href={`/issues/${issue.recurrence_of}`}>
                  #{issue.recurrence_of}
                </Link>
              </p>
            )}
            {issue.assigned_team && !showFix && (
              <p className="mt-3 flex items-center gap-2 text-base">
                <HardHat size={17} className="text-muted" aria-hidden /> {t("admin.assignedTo", { office: issue.assigned_team })}
              </p>
            )}
          </Card>

          <div>
            <h2 className="mb-3 text-xl font-semibold">
              {t("issue.reportsTitle")} <span className="text-muted">({reports.length})</span>
            </h2>
            {photos.length > 0 && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {photos.map((r) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={r.id} src={imageUrl(r.image)!} alt="" className="h-24 w-32 shrink-0 rounded-[6px] object-cover" />
                ))}
              </div>
            )}
            <Card className="divide-y divide-line">
              {reports.map((r, idx) => (
                <div key={r.id} className="flex gap-3 p-4 text-base">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-semibold text-ink-2">
                    {(r.reporter_name || t("role.citizen")).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        {r.reporter_name || t("insights.anonymousCitizen")} <span className="ms-1 text-sm font-normal text-muted">{timeAgo(r.created_at)}</span>
                      </span>
                      <span className="text-sm text-muted">{idx === 0 ? t("issue.firstReport") : t("issue.grouped")}</span>
                    </div>
                    <div className="mt-1 text-ink-2">{r.description || <span className="text-muted">{t("issue.photoOnly")}</span>}</div>
                    {r.voice_transcript && (
                      <div className="mt-1 rounded-[6px] bg-sunken px-3 py-2 text-ink-2">
                        <div className="text-sm font-semibold text-muted">{t("issue.voiceUrdu")}</div>
                        <div dir="rtl" lang="ur">
                          {r.voice_transcript}
                        </div>
                      </div>
                    )}
                    {r.reporter_email !== undefined && (
                      <div className="mt-1 text-sm text-ink-2">
                        {t("review.contact")}: {r.reporter_email ?? "-"}, {r.reporter_phone ?? "-"}
                      </div>
                    )}
                    {isAuthority && (
                      <button onClick={() => setFlagging(r.id)} className="mt-2 min-h-9 text-sm font-semibold text-danger-ink hover:underline">
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
            <h2 className="mb-4 text-lg font-semibold text-ink">{t("issue.timeline")}</h2>
            <StaggerContainer as="ol" className="space-y-0">
              {events.map((e, idx) => {
                const st = EVENT_STYLE[e.kind] ?? EVENT_STYLE.created;
                return (
                  <StaggerItem as="li" key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {idx < events.length - 1 && <span className="absolute start-[13px] top-7 h-full w-px bg-line" />}
                    <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${st.cls}`}>
                      <st.icon size={14} />
                    </span>
                    <div className="text-base">
                      <div className="font-medium leading-snug">{e.message}</div>
                      <div className="mt-0.5 text-sm text-muted">{formatDateTime(e.created_at)}</div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** For the Authority, on the Issue's page: give it to a Business, and answer the Businesses that asked for it. */
function AuthorityPanel({ issue, onChanged }: { issue: Issue; onChanged: () => void }) {
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<{ requests: JobRequest[] }>("/api/job-requests")
      .then((d) => setRequests(d.requests.filter((r) => r.issue_id === issue.id)))
      .catch(() => {});
  }, [issue.id]);

  async function decline(r: JobRequest) {
    setErr("");
    try {
      await api(`/api/job-requests/${r.id}`, { method: "DELETE" });
    } catch (e) {
      setErr(errorText((e as Error).message));
    }
    onChanged();
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <AssignPanel issue={issue} onChanged={onChanged} />
      </Card>
      {requests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            {t("requests.title")} <span className="text-muted">({requests.length})</span>
          </h2>
          {err && <p className="text-sm font-medium text-danger-ink">{err}</p>}
          {requests.map((r) =>
            r.status === "pending" ? (
              <RequestCard key={r.id} r={r} compact onSent={onChanged} onDecline={() => decline(r)} />
            ) : (
              <RequestCard key={r.id} r={r} compact />
            ),
          )}
        </section>
      )}
    </div>
  );
}
