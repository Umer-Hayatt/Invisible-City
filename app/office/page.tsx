"use client";

import { Inbox } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Gate from "@/components/Gate";
import { Card, Empty, PageHeader, SeverityBadge, StatusBadge } from "@/components/ui";
import { api } from "@/lib/client";
import { t } from "@/lib/i18n";
import type { Severity, Status } from "@/lib/types";

interface Job {
  id: number;
  title: string;
  status: Status;
  severity: Severity;
  neighborhood: string;
  report_count: number;
}

function Jobs() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  useEffect(() => {
    api<{ jobs: Job[] }>("/api/office/jobs")
      .then((d) => setJobs(d.jobs))
      .catch(() => setJobs([]));
  }, []);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("office.title")} sub={t("office.sub")} />
      {jobs === null ? (
        <div className="text-muted">{t("gate.loading")}</div>
      ) : jobs.length === 0 ? (
        <Empty icon={Inbox} title={t("office.empty")} />
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <Link key={j.id} href={`/issues/${j.id}`}>
              <Card className="flex items-center justify-between gap-4 p-4 hover:border-ink/30">
                <div className="min-w-0">
                  <div className="truncate font-bold">{j.title}</div>
                  <div className="text-sm text-muted">{j.neighborhood}</div>
                </div>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={j.severity} />
                  <StatusBadge status={j.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OfficePage() {
  return (
    <Gate roles={["office"]} next="/office">
      <Jobs />
    </Gate>
  );
}
