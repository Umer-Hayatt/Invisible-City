"use client";

import {
  ArrowUpRight,
  CircleCheck,
  Flame,
  HardHat,
  Hourglass,
  ImagePlus,
  Inbox,
  Landmark,
  LogOut,
  MousePointerClick,
  Repeat,
  RotateCcw,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import CityMap from "@/components/CityMap";
import { Card, CategoryChip, CategoryIcon, Empty, IssueThumb, PriorityMeter, SeverityBadge, Stat, StatusBadge, btn, field } from "@/components/ui";
import { api, prepareImage, timeAgo } from "@/lib/client";
import { NEIGHBORHOODS } from "@/lib/geo";
import type { NeighborhoodStat } from "@/lib/insights";
import { CATEGORIES, CATEGORY_META, Issue, STATUSES, TEAMS } from "@/lib/types";
import { imageUrl } from "@/lib/uploads-url";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    api<{ isAdmin: boolean }>("/api/config")
      .then((c) => setAuthed(c.isAdmin))
      .catch(() => setAuthed(false));
  }, []);
  if (authed === null) return <div className="text-muted">Loading…</div>;
  return authed ? <Dashboard onLogout={() => setAuthed(false)} /> : <Login onOk={() => setAuthed(true)} />;
}

function Login({ onOk }: { onOk: () => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: code }) });
          onOk();
        } catch (e) {
          setErr((e as Error).message);
        }
      }}
      className="mx-auto mt-10 max-w-md"
    >
      <Card className="p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white">
          <Landmark size={22} />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Authority dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          For city officials. Demo passcode <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-ink">admin123</code>
        </p>
        <input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Passcode" autoFocus className={`${field} mt-6`} />
        {err && <div className="mt-2 text-sm font-medium text-red-600">{err}</div>}
        <button className={`${btn.primary} mt-4 w-full py-3`}>Sign in</button>
      </Card>
    </form>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
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
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand">City authority · demo access</div>
          <h1 className="text-3xl font-extrabold tracking-tight">Repair work queue</h1>
          <p className="mt-1 text-sm text-muted">Ranked by AI priority, which combines severity, number of citizen reports, age and hazard.</p>
        </div>
        <button
          onClick={async () => {
            await api("/api/admin/logout", { method: "POST" });
            onLogout();
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
                    {s.replace("_", " ")}
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
  const [team, setTeam] = useState<string>(CATEGORY_META[issue.category].team);
  const [after, setAfter] = useState<{ file: File; preview: string } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function patch(body: object) {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/issues/${issue.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resolve() {
    setBusy(true);
    setErr("");
    const fd = new FormData();
    if (after) fd.append("afterImage", after.file);
    fd.append("note", note);
    try {
      await api(`/api/issues/${issue.id}/resolve`, { method: "POST", body: fd });
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
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

        {issue.status !== "resolved" ? (
          <>
            <div className="space-y-2.5 border-t border-line pt-5">
              <div className="flex items-center gap-2 text-sm font-bold">
                <HardHat size={16} className="text-violet-600" /> Assign repair crew
              </div>
              <div className="flex gap-2">
                <select value={team} onChange={(e) => setTeam(e.target.value)} className={`${field} py-2`}>
                  {TEAMS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <button disabled={busy || team === issue.assigned_team} onClick={() => patch({ assigned_team: team })} className={btn.dark}>
                  Assign
                </button>
              </div>
              {issue.status === "assigned" && (
                <button disabled={busy} onClick={() => patch({ status: "in_progress" })} className={`${btn.ghost} w-full`}>
                  <Hourglass size={15} /> Mark repair work started
                </button>
              )}
            </div>

            <div className="space-y-2.5 border-t border-line pt-5">
              <div className="flex items-center gap-2 text-sm font-bold">
                <CircleCheck size={16} className="text-brand" /> Resolve with proof
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line p-2.5 transition hover:border-brand">
                {after ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={after.preview} alt="" className="h-14 w-20 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-14 w-20 items-center justify-center rounded-lg bg-brand-50 text-brand">
                    <ImagePlus size={20} />
                  </span>
                )}
                <span className="text-sm font-medium text-ink-2">{after ? "Change after-repair photo" : "Upload after-repair photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setAfter(await prepareImage(f));
                  }}
                />
              </label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Resolution note, e.g. Pothole filled and re-asphalted" className={field} />
              <button disabled={busy} onClick={resolve} className={`${btn.primary} w-full py-3`}>
                <CircleCheck size={16} /> Mark as resolved
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3 border-t border-line pt-5">
            {issue.after_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl(issue.after_image)!} alt="After" className="h-40 w-full rounded-xl object-cover" />
            )}
            <p className="flex items-center gap-2 text-sm font-medium text-brand">
              <CircleCheck size={16} /> Resolved {issue.resolved_at && timeAgo(issue.resolved_at)} by {issue.assigned_team ?? "the city"}
            </p>
            <button disabled={busy} onClick={() => patch({ status: "open" })} className={btn.ghost}>
              <RotateCcw size={15} /> Re-open issue
            </button>
          </div>
        )}
        {err && <div className="text-sm font-medium text-red-600">{err}</div>}
      </div>
    </Card>
  );
}
