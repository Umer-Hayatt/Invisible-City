"use client";

import { Camera, ChevronRight, CircleCheck, HardHat, Inbox, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Empty, IssueThumb, PageHeader, StatusBadge, btn } from "@/components/ui";
import Gate from "@/components/Gate";
import { api, timeAgo } from "@/lib/client";
import type { Contributor } from "@/lib/insights";
import { Category, Report, Status } from "@/lib/types";
import { imageUrl } from "@/lib/uploads-url";

type Row = Report & {
  issue_status: Status;
  issue_title: string;
  issue_report_count: number;
  issue_after_image: string | null;
  issue_team: string | null;
  issue_neighborhood: string;
};

const STEPS: Status[] = ["open", "assigned", "in_progress", "resolved"];
const STEP_LABEL = ["Reported", "Assigned", "Being fixed", "Resolved"];

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

  useEffect(() => {
    api<{ reports: Row[]; impact: Contributor | null }>("/api/reports")
      .then((d) => {
        setRows(d.reports);
        setImpact(d.impact);
      })
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Your contributions" title="My reports" sub="Follow every problem you've reported all the way to the fix." />

      {impact && (
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative grid grid-cols-2 gap-6 sm:grid-cols-5">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
                <Trophy size={14} className="text-accent" /> Impact score
              </div>
              <div className="mt-1 text-5xl font-extrabold tabular-nums">{impact.score}</div>
            </div>
            <Mini label="Reports" v={impact.reports} />
            <Mini label="First to report" v={impact.firstReports} />
            <Mini label="Backed up by others" v={impact.corroborated} />
            <Mini label="Got fixed" v={impact.resolved} />
          </div>
        </div>
      )}

      {rows === null ? (
        <div className="text-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <Card>
          <Empty icon={Inbox} title="No reports yet">
            Spot a pothole, broken light or overflowing bin? It takes 30 seconds.
            <div className="mt-4">
              <Link href="/report" className={btn.primary}>
                <Camera size={16} /> Report a problem
              </Link>
            </div>
          </Empty>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const step = STEPS.indexOf(r.issue_status);
            return (
              <Link key={r.id} href={`/issues/${r.issue_id}`} className="group block">
                <Card className="flex gap-4 p-4 transition group-hover:border-brand/40 group-hover:shadow-float">
                  <IssueThumb src={imageUrl(r.image)} category={r.ai_category as Category} className="h-24 w-24 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-bold">{r.issue_title}</div>
                        <div className="mt-0.5 text-xs text-muted">
                          #{r.issue_id} · {r.issue_neighborhood} · you reported {timeAgo(r.created_at)} ·{" "}
                          {r.issue_report_count > 1 ? `${r.issue_report_count} citizens reported this` : "only you so far"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.issue_status} />
                        <ChevronRight size={18} className="text-muted transition group-hover:translate-x-0.5" />
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-1.5">
                      {STEP_LABEL.map((l, i) => (
                        <div key={l}>
                          <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-sunken"}`} />
                          <div className={`mt-1.5 text-[11px] ${i <= step ? "font-semibold text-ink" : "text-muted"}`}>{l}</div>
                        </div>
                      ))}
                    </div>
                    {r.issue_team && r.issue_status !== "resolved" && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-2">
                        <HardHat size={13} /> {r.issue_team}
                      </div>
                    )}
                    {r.issue_status === "resolved" && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand">
                        <CircleCheck size={13} /> Fixed{r.issue_after_image ? ". See the after-repair photo" : ""}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
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
