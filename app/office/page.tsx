"use client";

import { ArrowUpRight, FileSignature, Inbox } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { JobActions, type OfficeJob } from "@/components/BusinessJob";
import Gate from "@/components/Gate";
import { Card, CriticalTag, Empty, IssueThumb, ListSkeleton, PageHeader, StatusBadge } from "@/components/ui";
import { ViewTabs, useView } from "@/components/ViewTabs";
import { api } from "@/lib/client";
import { t, type MessageKey } from "@/lib/i18n";
import type { Status } from "@/lib/types";
import { imageUrl } from "@/lib/uploads-url";

/** The Business's jobs, one tab per stage of the work: to start, being worked on, waiting for Citizens, done. */
const VIEWS = ["assigned", "in_progress", "fixed", "resolved"] as const;
type View = (typeof VIEWS)[number];
const VIEW_OF: Partial<Record<Status, View>> = {
  assigned: "assigned",
  in_progress: "in_progress",
  fixed: "fixed",
  resolved: "resolved",
  closed_unconfirmed: "resolved",
};
const LABEL: Record<View, MessageKey> = {
  assigned: "status.assigned",
  in_progress: "status.in_progress",
  fixed: "status.fixed",
  resolved: "business.done",
};
const EMPTY: Record<View, MessageKey> = {
  assigned: "business.emptyAssigned",
  in_progress: "business.emptyInProgress",
  fixed: "business.emptyFixed",
  resolved: "business.emptyDone",
};

function Jobs() {
  const [jobs, setJobs] = useState<OfficeJob[] | null>(null);
  const [offers, setOffers] = useState(0);
  const load = useCallback(() => {
    api<{ jobs: OfficeJob[] }>("/api/office/jobs")
      .then((d) => setJobs(d.jobs))
      .catch(() => setJobs([]));
    api<{ contracts: { status: string }[] }>("/api/contracts")
      .then((d) => setOffers(d.contracts.filter((c) => c.status === "sent").length))
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  const counts = jobs && (Object.fromEntries(VIEWS.map((v) => [v, jobs.filter((j) => VIEW_OF[j.status] === v).length])) as Record<View, number>);
  const [view, setView] = useView(VIEWS, counts);
  const shown = jobs?.filter((j) => VIEW_OF[j.status] === view) ?? [];

  return (
    <div>
      <PageHeader title={t("office.title")} sub={t("office.sub")} />
      {offers > 0 && (
        <Link href="/office/contracts?view=pending" className="mb-5 flex items-center gap-3 rounded-[8px] bg-lime px-4 py-3 text-base font-semibold text-on-lime hover:bg-lime-600">
          <FileSignature size={20} className="shrink-0" aria-hidden />
          {offers === 1 ? t("contract.oneWaiting") : t("contract.manyWaiting", { n: offers })}
          <ArrowUpRight size={18} className="ms-auto shrink-0 rtl:-scale-x-100" aria-hidden />
        </Link>
      )}
      {jobs === null ? (
        <ListSkeleton />
      ) : jobs.length === 0 ? (
        <Empty icon={Inbox} title={t("office.empty")}>
          <Link href="/office/available" className="font-semibold text-brand hover:underline">
            {t("business.findJobs")}
          </Link>
        </Empty>
      ) : (
        <>
          <ViewTabs label={t("business.jobs")} value={view} onChange={setView} tabs={VIEWS.map((v) => ({ value: v, label: t(LABEL[v]), count: counts![v] }))} />
          {shown.length === 0 ? (
            <Empty icon={Inbox} title={t(EMPTY[view])} />
          ) : (
            // A job leaves the tab when it moves on; `layout` glides the rest into place.
            <div className="grid items-start gap-5 lg:grid-cols-2">
              <AnimatePresence initial={false}>
                {shown.map((j) => (
                  <m.div key={j.id} layout exit={{ opacity: 0, scale: 0.97 }}>
                    <JobCard job={j} onChanged={load} />
                  </m.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function JobCard({ job, onChanged }: { job: OfficeJob; onChanged: () => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        <IssueThumb src={imageUrl(job.cover_image)} category={job.category} className="h-24 w-24 shrink-0 rounded-[6px] sm:w-32" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link href={`/issues/${job.id}`} className="min-w-0 text-lg font-semibold leading-snug hover:underline">
              {job.title}
            </Link>
            <div className="flex items-center gap-2">
              <CriticalTag severity={job.severity} status={job.status} />
              <StatusBadge status={job.status} />
            </div>
          </div>
          <div className="mt-0.5 text-[15px] text-muted">
            #{job.id} · {job.neighborhood} · {t("office.reports", { n: job.report_count })}
          </div>
          <Link href={`/issues/${job.id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            {t("office.details")} <ArrowUpRight size={14} className="rtl:-scale-x-100" />
          </Link>
        </div>
      </div>
      <div className="border-t border-line px-4 py-3">
        <JobActions job={job} onChanged={onChanged} />
      </div>
    </Card>
  );
}

export default function OfficePage() {
  return (
    <Gate roles={["office"]} next="/office">
      <Suspense fallback={<ListSkeleton />}>
        <Jobs />
      </Suspense>
    </Gate>
  );
}
