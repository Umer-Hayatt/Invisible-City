"use client";

import { Flag, Mail, MapPin, Phone, Plus, Search, Send, Users, X } from "lucide-react";
import { useState } from "react";
import { Card, Segmented, CriticalTag, btn, field } from "@/components/ui";
import { CatChip, Photo, StatusPill, Timeline } from "./bits";
import {
  type Action,
  CATEGORY,
  DEPARTMENTS,
  type Department,
  type Issue,
  type State,
  type Status,
  STATUS_LABEL,
  distanceKm,
  liveReports,
  priority,
} from "./data";

type Tab = "queue" | "offices";

export default function AuthorityView({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  const [tab, setTab] = useState<Tab>("queue");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Authority</h2>
          <p className="text-sm text-muted">Signed in as Zainab Qureshi · CDA. You can see and assign every Issue in the city.</p>
        </div>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "queue", label: "Priority queue" },
            { value: "offices", label: "Offices & staff", icon: Users },
          ]}
        />
      </div>
      {tab === "queue" ? <Queue state={state} dispatch={dispatch} /> : <Offices state={state} dispatch={dispatch} />}
    </div>
  );
}

/* ---------- Priority queue + Issue review ---------- */
type StatusFilter = "active" | Status | "all";

function Queue({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  const [status, setStatus] = useState<StatusFilter>("active");
  const [dept, setDept] = useState<Department | "all">("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const rows = state.issues
    .filter((i) => (status === "all" ? true : status === "active" ? !["resolved", "closed_unconfirmed"].includes(i.status) : i.status === status))
    .filter((i) => dept === "all" || CATEGORY[i.category].department === dept)
    .filter((i) => !q || `${i.title} ${i.sector} #${i.id}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => priority(b) - priority(a));

  const current = state.issues.find((i) => i.id === selected) ?? rows[0] ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <div className="space-y-2 border-b border-line p-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-3 text-muted" />
            <input className={`${field} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, sector or #id" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className={field} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Status filter">
              <option value="active">Needs action (not closed)</option>
              <option value="all">All statuses</option>
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select className={field} value={dept} onChange={(e) => setDept(e.target.value as Department | "all")} aria-label="Department filter">
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
        <ul className="max-h-[640px] divide-y divide-line overflow-y-auto">
          {rows.length === 0 && <li className="p-6 text-center text-sm text-muted">No Issues match these filters.</li>}
          {rows.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => setSelected(i.id)}
                className={`flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-sunken/60 ${current?.id === i.id ? "bg-brand-50" : ""}`}
              >
                <span>{priority(i)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{i.title}</div>
                  <div className="truncate text-xs text-muted">
                    #{i.id} · {i.sector} · {liveReports(i).length} Report{liveReports(i).length === 1 ? "" : "s"} · {CATEGORY[i.category].department}
                  </div>
                </div>
                <StatusPill status={i.status} />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <div className="lg:col-span-7">{current ? <Review key={current.id} issue={current} state={state} dispatch={dispatch} /> : <Card className="p-8 text-center text-sm text-muted">Pick an Issue.</Card>}</div>
    </div>
  );
}

function Review({ issue, state, dispatch }: { issue: Issue; state: State; dispatch: (a: Action) => void }) {
  const dept = CATEGORY[issue.category].department;
  const suggestions = state.offices
    .filter((o) => o.department === dept)
    .map((o) => ({ office: o, km: distanceKm(issue, o) }))
    .sort((a, b) => a.km - b.km);
  const [pick, setPick] = useState<string | null>(null);
  const office = state.offices.find((o) => o.id === issue.officeId);

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-4 border-b border-line p-4">
        <Photo src={issue.reports[0]?.photo ?? null} category={issue.category} className="h-24 w-32 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={issue.status} />
            <CatChip category={issue.category} />
            <CriticalTag severity={issue.severity} />
            {issue.recurring && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Recurrence</span>}
          </div>
          <h3 className="text-lg font-extrabold leading-snug">
            #{issue.id} {issue.title}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} /> {issue.sector}
            </span>
            <span>Open {issue.ageDays} days</span>
            <span>{priority(issue)}</span>
          </div>
        </div>
      </div>

      {/* Reports */}
      <div className="border-b border-line p-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Reports ({liveReports(issue).length})</div>
        <ul className="space-y-2">
          {issue.reports.map((r) =>
            r.spam ? (
              <li key={r.id} className="rounded-xl border border-dashed border-line px-3 py-2 text-xs text-muted">
                Report by {r.name} hidden (Spam flag)
              </li>
            ) : (
              <li key={r.id} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">
                      {r.name}
                      {(state.spamCount[r.citizenId] ?? 0) > 0 && (
                        <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          {state.spamCount[r.citizenId]} Spam flag{state.spamCount[r.citizenId] === 1 ? "" : "s"}
                          {(state.spamCount[r.citizenId] ?? 0) >= 3 ? " · Suspended" : ""}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-2">
                      <span className="inline-flex items-center gap-1">
                        <Mail size={12} /> {r.email}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone size={12} /> {r.phone}
                      </span>
                      <span className="text-muted">{r.at}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "spamFlag", issueId: issue.id, reportId: r.id })}
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    <Flag size={12} /> Spam flag
                  </button>
                </div>
                {r.description && <p className="mt-2 text-sm text-ink-2">{r.description}</p>}
                {r.urdu && (
                  <p dir="rtl" lang="ur" className="mt-1 text-sm text-muted">
                    {r.urdu}
                  </p>
                )}
              </li>
            ),
          )}
        </ul>
      </div>

      {/* Assignment */}
      <div className="border-b border-line p-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Assignment · {dept} Department</div>
        {issue.status === "open" ? (
          <>
            <p className="mb-2 text-xs text-muted">Suggested Offices, nearest first. Nothing is assigned until you press Assign.</p>
            <ul className="space-y-1.5">
              {suggestions.map(({ office: o, km }, idx) => (
                <li key={o.id}>
                  <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${pick === o.id ? "border-brand bg-brand-50" : "border-line"}`}>
                    <input type="radio" name={`assign-${issue.id}`} checked={pick === o.id} onChange={() => setPick(o.id)} className="accent-brand" />
                    <span className="flex-1 font-semibold">
                      {o.name}
                      {idx === 0 && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">Nearest</span>}
                    </span>
                    <span className="text-xs text-muted">{o.staff.length} staff</span>
                    <span className="w-14 text-right text-xs font-bold tabular-nums">{km.toFixed(1)} km</span>
                  </label>
                </li>
              ))}
              {suggestions.length === 0 && <li className="text-sm text-muted">No Office in this Department yet. Add one under Offices &amp; staff.</li>}
            </ul>
            <button type="button" disabled={!pick} className={`${btn.primary} mt-3`} onClick={() => pick && dispatch({ type: "assign", issueId: issue.id, officeId: pick })}>
              <Send size={15} /> Assign
            </button>
          </>
        ) : (
          <p className="text-sm">
            {office ? (
              <>
                With <b>{office.name}</b> · {STATUS_LABEL[issue.status]}
              </>
            ) : (
              STATUS_LABEL[issue.status]
            )}
          </p>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Timeline</div>
        <Timeline issue={issue} />
      </div>
    </Card>
  );
}

/* ---------- Offices and staff ---------- */
function Offices({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState<Department>("Roads");
  const [sector, setSector] = useState("");
  const [emails, setEmails] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Each staff member belongs to exactly one Office. All staff of an Office see the same jobs.</p>
        <button type="button" className={btn.dark} onClick={() => setAdding(!adding)}>
          {adding ? <X size={15} /> : <Plus size={15} />} {adding ? "Cancel" : "Add Office"}
        </button>
      </div>

      {adding && (
        <Card className="grid gap-3 p-4 sm:grid-cols-4">
          <input className={`${field} sm:col-span-2`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Office name, e.g. CDA Roads Maintenance, H-9" />
          <select className={field} value={department} onChange={(e) => setDepartment(e.target.value as Department)}>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <input className={field} value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Sector, e.g. H-9" />
          <p className="text-xs text-muted sm:col-span-3">The Office&apos;s location is set with a map pin in the real screen.</p>
          <button
            type="button"
            disabled={!name.trim() || !sector.trim()}
            className={btn.primary}
            onClick={() => {
              dispatch({ type: "addOffice", name: name.trim(), department, sector: sector.trim() });
              setName("");
              setSector("");
              setAdding(false);
            }}
          >
            Save Office
          </button>
        </Card>
      )}

      {DEPARTMENTS.map((d) => {
        const offices = state.offices.filter((o) => o.department === d);
        if (!offices.length) return null;
        return (
          <section key={d}>
            <h3 className="mb-2 text-sm font-extrabold">{d}</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {offices.map((o) => (
                <Card key={o.id} className="p-4">
                  <div className="text-sm font-bold">{o.name}</div>
                  <div className="text-xs text-muted">
                    {o.sector} · {state.issues.filter((i) => i.officeId === o.id && i.status !== "resolved").length} open jobs
                  </div>
                  <ul className="mt-3 space-y-1">
                    {o.staff.map((e) => (
                      <li key={e} className="flex items-center justify-between rounded-lg bg-sunken px-2 py-1 text-xs">
                        {e}
                        <button type="button" aria-label={`Remove ${e}`} onClick={() => dispatch({ type: "removeStaff", officeId: o.id, email: e })} className="text-muted hover:text-red-600">
                          <X size={13} />
                        </button>
                      </li>
                    ))}
                    {o.staff.length === 0 && <li className="text-xs text-orange-700">No staff yet</li>}
                  </ul>
                  <form
                    className="mt-2 flex gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v = (emails[o.id] ?? "").trim();
                      if (!v.includes("@")) return;
                      dispatch({ type: "addStaff", officeId: o.id, email: v });
                      setEmails({ ...emails, [o.id]: "" });
                    }}
                  >
                    <input className={`${field} py-1.5 text-xs`} value={emails[o.id] ?? ""} onChange={(e) => setEmails({ ...emails, [o.id]: e.target.value })} placeholder="staff Gmail address" />
                    <button type="submit" className={`${btn.ghost} px-3 py-1.5 text-xs`}>
                      Add
                    </button>
                  </form>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
