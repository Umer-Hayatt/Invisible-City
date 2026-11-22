"use client";

import {
  ArrowUpRight,
  CircleCheck,
  Flame,
  HardHat,
  Inbox,
  LogOut,
  MousePointerClick,
  Repeat,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import CityMap from "@/components/CityMap";
import Gate from "@/components/Gate";
import { errorText, t } from "@/lib/i18n";
import { sessionChanged } from "@/lib/me";
import { Card, CategoryChip, CategoryIcon, Empty, IssueThumb, PriorityMeter, SeverityBadge, Stat, StatusBadge, btn, field, statusLabel } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { NEIGHBORHOODS } from "@/lib/geo";
import type { NeighborhoodStat } from "@/lib/insights";
import { CATEGORIES, CATEGORY_META, Issue, STATUSES } from "@/lib/types";
import { imageUrl } from "@/lib/uploads-url";

interface SuggestedOffice {
  id: number;
  name: string;
  distance: number;
}

export default function AdminPage() {
  return (
    <Gate roles={["authority"]} next="/admin">
      <Dashboard />
    </Gate>
  );
}

function Dashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [hoods, setHoods] = useState<NeighborhoodStat[]>([]);
  const [status, setStatus] = useState("unresolved");
  const [category, setCategory] = useState("");
  const [hood, setHood] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const load = useCallback(() => {
    api<{ issues: Issue[] }>("/api/issues").then((d) => setIssues(d.issues));
    api<{ neighborhoods: NeighborhoodStat[] }>("/api/stats").then((d) => setHoods(d.neighborhoods));
  }, []);
  useEffect(load, [load]);

  const filtered = useMemo(
    () =>
      issues.filter(
        (i) =>
          (status === "unresolved" ? i.status !== "resolved" : !status || i.status === status) &&
          (!category || i.category === category) &&
          (!hood || i.neighborhood === hood),
      ),
    [issues, status, category, hood],
  );
  const sel = issues.find((i) => i.id === selected) ?? null;
  const open = issues.filter((i) => i.status !== "resolved");
  const neglected = hoods.filter((n) => n.neglected).map((n) => n.name);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand">{t("admin.eyebrow")}</div>
          <h1 className="text-3xl font-extrabold tracking-tight">Repair work queue</h1>
          <p className="mt-1 text-sm text-muted">Ranked by AI priority, which combines severity, number of citizen reports, age and hazard.</p>
        </div>
        <button
          onClick={async () => {
            await api("/api/auth/signout", { method: "POST" });
            sessionChanged("/");
          }}
          className={btn.ghost}
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Awaiting assignment" value={open.filter((i) => i.status === "open").length} icon={Inbox} />
        <Stat label="Assigned" value={open.filter((i) => i.status === "assigned").length} icon={HardHat} />
        <Stat label="In progress" value={open.filter((i) => i.status === "in_progress").length} icon={Wrench} />
        <Stat label="Critical open" value={open.filter((i) => i.severity === "critical").length} icon={Flame} tone="bad" />
        <Stat
          label="Neglected sectors"
          value={neglected.length}
          hint={neglected.join(", ") || "none"}
          icon={TriangleAlert}
          tone={neglected.length ? "bad" : "good"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CityMap issues={filtered} layer="issues" className="h-[300px]" focus={sel ? [sel.lat, sel.lng] : null} />
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
              <Pill value={status} onChange={setStatus}>
                <option value="unresolved">All unresolved</option>
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </Pill>
              <Pill value={category} onChange={setCategory}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </Pill>
              <Pill value={hood} onChange={setHood}>
                <option value="">All sectors</option>
                {NEIGHBORHOODS.map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.name}
                    {neglected.includes(n.name) ? " (neglected)" : ""}
                  </option>
                ))}
              </Pill>
              <span className="ml-auto pr-2 text-xs font-semibold text-muted">{filtered.length} issues</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-[11px] font-bold uppercase tracking-wider text-muted">
                  <tr className="border-b border-line">
                    <th className="px-4 py-3">Priority</th>
                    <th className="py-3">Issue</th>
                    <th className="py-3">Sector</th>
                    <th className="py-3">Severity</th>
                    <th className="py-3 text-center">Reports</th>
                    <th className="py-3">Status</th>
                    <th className="py-3 pr-4 text-right">Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((i) => (
                    <tr
                      key={i.id}
                      onClick={() => setSelected(i.id)}
                      className={`cursor-pointer transition ${selected === i.id ? "bg-brand-50" : "hover:bg-canvas"}`}
                    >
                      <td className="px-4 py-3">
                        <PriorityMeter value={i.priority} />
                      </td>
                      <td className="max-w-[280px] py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-2">
                            <CategoryIcon category={i.category} size={15} />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{i.title}</div>
                            <div className="flex items-center gap-1 text-xs text-muted">
                              #{i.id}
                              {i.recurrence_of ? (
                                <>
                                  {" "}
                                  · <Repeat size={11} /> recurring
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="font-medium">{i.neighborhood}</span>
                        {neglected.includes(i.neighborhood) && <TriangleAlert size={12} className="ml-1 inline text-red-600" />}
                      </td>
                      <td className="py-3">
                        <SeverityBadge severity={i.severity} />
                      </td>
                      <td className="py-3 text-center font-semibold tabular-nums">{i.report_count}</td>
                      <td className="py-3">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="py-3 pr-4 text-right text-xs text-muted">{timeAgo(i.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          {sel ? (
            <IssuePanel key={sel.id} issue={sel} onChanged={load} />
          ) : (
            <Card>
              <Empty icon={MousePointerClick} title="Select an issue">
                Choose a row in the queue to assign a crew or close it out with an after-repair photo.
              </Empty>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium capitalize outline-none focus:border-brand"
    >
      {children}
    </select>
  );
}

function IssuePanel({ issue, onChanged }: { issue: Issue; onChanged: () => void }) {
  const [offices, setOffices] = useState<SuggestedOffice[] | null>(null);
  const [officeId, setOfficeId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (issue.status !== "open") return;
    let live = true;
    api<{ offices: SuggestedOffice[] }>(`/api/issues/${issue.id}/offices`)
      .then((d) => {
        if (!live) return;
        setOffices(d.offices);
        setOfficeId(d.offices[0]?.id ?? null);
      })
      .catch(() => live && setOffices([]));
    return () => {
      live = false;
    };
  }, [issue.id, issue.status]);

  async function assign() {
    if (officeId === null) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/api/issues/${issue.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officeId }),
      });
      onChanged();
    } catch (e) {
      setErr(errorText((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <IssueThumb src={imageUrl(issue.cover_image)} category={issue.category} className="h-44 w-full" />
        <div className="absolute left-3 top-3">
          <StatusBadge status={issue.status} />
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted">
              #{issue.id} · {issue.neighborhood}
            </span>
            <CategoryChip category={issue.category} />
          </div>
          <h2 className="mt-2 text-lg font-bold leading-snug">{issue.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{issue.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <SeverityBadge severity={issue.severity} />
            <span className="font-medium text-ink-2">{issue.report_count} reports</span>
            <PriorityMeter value={issue.priority} />
          </div>
          <Link href={`/issues/${issue.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            Full history <ArrowUpRight size={14} />
          </Link>
        </div>

        {issue.status !== "resolved" && issue.status !== "closed_unconfirmed" ? (
          <>
            <div className="space-y-2.5 border-t border-line pt-5">
              <div className="flex items-center gap-2 text-sm font-bold">
                <HardHat size={16} className="text-violet-600" /> {t("admin.assignTitle")}
              </div>
              {issue.status !== "open" ? (
                <p className="text-sm text-muted">
                  {issue.assigned_team ? t("admin.assignedTo", { office: issue.assigned_team }) : t("admin.notOpen")}
                </p>
              ) : offices === null ? (
                <p className="text-sm text-muted">{t("gate.loading")}</p>
              ) : offices.length === 0 ? (
                <p className="text-sm text-muted">
                  {t("admin.noOffices")}{" "}
                  <Link href="/admin/offices" className="font-semibold text-brand hover:underline">
                    {t("admin.manageOffices")}
                  </Link>
                </p>
              ) : (
                <div className="flex gap-2">
                  <select value={officeId ?? ""} onChange={(e) => setOfficeId(Number(e.target.value))} className={`${field} py-2`}>
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} · {t("admin.distance", { km: (o.distance / 1000).toFixed(1) })}
                      </option>
                    ))}
                  </select>
                  <button disabled={busy || officeId === null} onClick={assign} className={btn.dark}>
                    {t("admin.assign")}
                  </button>
                </div>
              )}
            </div>

            {issue.status === "fixed" && (
              <div className="space-y-3 border-t border-line pt-5">
                {issue.after_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl(issue.after_image)!} alt={t("issue.after")} className="h-40 w-full rounded-xl object-cover" />
                )}
                <p className="text-sm text-ink-2">{t("office.waiting")}</p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3 border-t border-line pt-5">
            {issue.after_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl(issue.after_image)!} alt={t("issue.after")} className="h-40 w-full rounded-xl object-cover" />
            )}
            {issue.status === "resolved" ? (
              <p className="flex items-center gap-2 text-sm font-medium text-brand">
                <CircleCheck size={16} />{" "}
                {t("admin.resolvedBy", { when: issue.resolved_at ? timeAgo(issue.resolved_at) : "", office: issue.assigned_team ?? "" })}
              </p>
            ) : (
              <p className="text-sm text-muted">{t("office.closedUnconfirmed")}</p>
            )}
          </div>
        )}
        {err && <div className="text-sm font-medium text-red-600">{err}</div>}
      </div>
    </Card>
  );
}
