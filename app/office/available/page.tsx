"use client";

import { ArrowUpRight, Hand, SearchCheck } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AskActions, isRequested, type AvailableJob } from "@/components/BusinessJob";
import Gate from "@/components/Gate";
import { Card, CriticalTag, Empty, IssueThumb, ListSkeleton, PageHeader } from "@/components/ui";
import { ViewTabs, useView } from "@/components/ViewTabs";
import { api, timeAgo } from "@/lib/client";
import { t } from "@/lib/i18n";
import { imageUrl } from "@/lib/uploads-url";

export default function AvailablePage() {
  return (
    <Gate roles={["office"]} next="/office/available">
      <Suspense fallback={<ListSkeleton />}>
        <Available />
      </Suspense>
    </Gate>
  );
}

/** Open jobs the Business can still ask for, and the ones it already asked for (or was offered a contract for). */
const VIEWS = ["open", "requested"] as const;

function Available() {
  const [jobs, setJobs] = useState<AvailableJob[] | null>(null);
  const load = useCallback(() => {
    api<{ jobs: AvailableJob[] }>("/api/office/available")
      .then((d) => setJobs(d.jobs))
      .catch(() => setJobs([]));
  }, []);
  useEffect(load, [load]);

  const requested = jobs?.filter(isRequested) ?? [];
  const open = jobs?.filter((j) => !isRequested(j)) ?? [];
  const [view, setView] = useView(VIEWS, jobs && { open: open.length, requested: requested.length });
  const shown = view === "open" ? open : requested;

  return (
    <div>
      <PageHeader title={t("available.title")} sub={t("available.sub")} />
      {jobs === null ? (
        <ListSkeleton />
      ) : jobs.length === 0 ? (
        <Empty icon={SearchCheck} title={t("available.empty")} />
      ) : (
        <>
          <ViewTabs
            label={t("available.title")}
            value={view}
            onChange={setView}
            tabs={[
              { value: "open", label: t("available.tabOpen"), count: open.length },
              { value: "requested", label: t("available.tabRequested"), count: requested.length },
            ]}
          />
          {shown.length === 0 ? (
            <Empty icon={view === "open" ? SearchCheck : Hand} title={view === "open" ? t("available.emptyOpen") : t("available.emptyRequested")} />
          ) : (
            <div className="grid items-start gap-5 lg:grid-cols-2">
              {shown.map((j) => (
                <AvailableCard key={j.id} job={j} onChanged={load} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AvailableCard({ job, onChanged }: { job: AvailableJob; onChanged: () => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        <IssueThumb src={imageUrl(job.cover_image)} category={job.category} className="h-24 w-28 shrink-0 rounded-[6px]" />
        <div className="min-w-0 flex-1">
          <Link href={`/issues/${job.id}`} className="flex items-start gap-1 text-lg font-semibold leading-snug hover:underline">
            {job.title} <ArrowUpRight size={16} className="mt-1 shrink-0 rtl:-scale-x-100" aria-hidden />
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {job.neighborhood} · {t("office.reports", { n: job.report_count })} · {timeAgo(job.created_at)}
            <CriticalTag severity={job.severity} />
          </p>
        </div>
      </div>
      <div className="border-t border-line p-4">
        <AskActions job={job} onChanged={onChanged} />
      </div>
    </Card>
  );
}
