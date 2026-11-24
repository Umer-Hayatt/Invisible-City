"use client";

import { Camera, CornerUpLeft, Mail, MapPin, Phone, Play, Wrench } from "lucide-react";
import { useState } from "react";
import { Card, CriticalTag, btn, field } from "@/components/ui";
import { CatChip, Photo, PhotoPicker, SamplePhotoButton, StatusPill } from "./bits";
import { type Action, type Issue, type Office, type State, distanceKm, liveReports } from "./data";

export default function OfficeView({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  const [officeId, setOfficeId] = useState("o-ws-f11");
  const office = state.offices.find((o) => o.id === officeId) ?? state.offices[0];
  const jobs = state.issues.filter((i) => i.officeId === office.id);
  const cols = [
    { title: "New jobs", hint: "Assigned to your Office", items: jobs.filter((i) => i.status === "assigned") },
    { title: "In progress", hint: "Record a Fix when done", items: jobs.filter((i) => i.status === "in_progress") },
    { title: "Fixed", hint: "Waiting for the Citizen to confirm", items: jobs.filter((i) => i.status === "fixed") },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">My jobs</h2>
          <p className="text-sm text-muted">
            Signed in as {office.staff[0] ?? "staff"} · {office.department} Department
          </p>
        </div>
        <label className="text-xs font-semibold text-muted">
          Prototype only: view as staff of
          <select className={`${field} mt-1 w-full sm:w-80`} value={office.id} onChange={(e) => setOfficeId(e.target.value)}>
            {state.offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({state.issues.filter((i) => i.officeId === o.id && ["assigned", "in_progress", "fixed"].includes(i.status)).length})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {cols.map((c) => (
          <section key={c.title} className="rounded-2xl bg-sunken/70 p-3">
            <div className="mb-3 flex items-baseline justify-between px-1">
              <h3 className="text-sm font-extrabold">
                {c.title} <span className="text-muted">({c.items.length})</span>
              </h3>
              <span className="text-[11px] text-muted">{c.hint}</span>
            </div>
            <div className="space-y-3">
              {c.items.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted">Nothing here.</p>}
              {c.items.map((i) => (
                <Job key={`${i.id}-${i.status}`} issue={i} office={office} dispatch={dispatch} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

const SEND_BACK_REASONS = ["Not our area", "Not our department", "Duplicate of another job", "Other"];

function Job({ issue, office, dispatch }: { issue: Issue; office: Office; dispatch: (a: Action) => void }) {
  const [mode, setMode] = useState<"idle" | "sendBack" | "fix">("idle");
  const [reason, setReason] = useState(SEND_BACK_REASONS[0]);
  const [reasonNote, setReasonNote] = useState("");
  const [after, setAfter] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const lastRejection = [...issue.timeline].reverse().find((t) => t.text.startsWith("Rejection"));

  return (
    <Card className="p-3">
      <div className="flex gap-3">
        <Photo src={issue.reports[0]?.photo ?? null} category={issue.category} className="h-16 w-16 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold leading-snug">
            #{issue.id} {issue.title}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <CatChip category={issue.category} />
            <CriticalTag severity={issue.severity} />
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-muted">
        <MapPin size={12} /> {issue.sector} · {distanceKm(issue, office).toFixed(1)} km from your Office
      </div>
      <ul className="mt-2 space-y-1 rounded-lg bg-sunken px-2 py-1.5 text-[11px] text-ink-2">
        {liveReports(issue).map((r) => (
          <li key={r.id} className="flex flex-wrap gap-x-2">
            <b>{r.name}</b>
            <span className="inline-flex items-center gap-0.5">
              <Phone size={10} /> {r.phone}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Mail size={10} /> {r.email}
            </span>
          </li>
        ))}
      </ul>
      {issue.status === "in_progress" && lastRejection && (
        <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-800">
          Citizen rejected the last Fix: {lastRejection.text.replace("Rejection: ", "")}
        </p>
      )}

      {/* Actions */}
      {issue.status === "assigned" && mode === "idle" && (
        <div className="mt-3 flex gap-2">
          <button type="button" className={`${btn.primary} flex-1 px-3`} onClick={() => dispatch({ type: "startWork", issueId: issue.id })}>
            <Play size={14} /> Start work
          </button>
          <button type="button" className={`${btn.ghost} px-3`} onClick={() => setMode("sendBack")}>
            <CornerUpLeft size={14} /> Send back
          </button>
        </div>
      )}
      {mode === "sendBack" && (
        <div className="mt-3 space-y-2">
          <select className={field} value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Send back reason">
            {SEND_BACK_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <input className={field} value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} placeholder="Add a note for the Authority (optional)" />
          <div className="flex gap-2">
            <button type="button" className={`${btn.ghost} flex-1 px-3`} onClick={() => setMode("idle")}>
              Cancel
            </button>
            <button
              type="button"
              className={`${btn.dark} flex-1 px-3`}
              onClick={() => dispatch({ type: "sendBack", issueId: issue.id, reason: reasonNote.trim() ? `${reason}. ${reasonNote.trim()}` : reason })}
            >
              Send back
            </button>
          </div>
        </div>
      )}

      {issue.status === "in_progress" && mode === "idle" && (
        <button type="button" className={`${btn.primary} mt-3 w-full`} onClick={() => setMode("fix")}>
          <Wrench size={14} /> Mark fixed
        </button>
      )}
      {mode === "fix" && (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-bold text-ink-2">After-repair photo (required)</div>
          {after ? (
            <Photo src={after === "placeholder" ? null : after} category={issue.category} label="After" className="h-28 w-full rounded-lg" />
          ) : (
            <div className="space-y-1.5">
              <PhotoPicker onPick={setAfter} className="flex h-20 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line text-xs font-semibold text-ink-2">
                <Camera size={16} /> Add after-photo
              </PhotoPicker>
              <SamplePhotoButton onPick={() => setAfter("placeholder")} />
            </div>
          )}
          <input className={field} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done? (optional)" />
          <div className="flex gap-2">
            <button type="button" className={`${btn.ghost} flex-1 px-3`} onClick={() => setMode("idle")}>
              Cancel
            </button>
            <button
              type="button"
              disabled={!after}
              className={`${btn.primary} flex-1 px-3`}
              onClick={() => after && dispatch({ type: "markFixed", issueId: issue.id, note: note.trim(), photo: after })}
            >
              Record Fix
            </button>
          </div>
        </div>
      )}

      {issue.status === "fixed" && (
        <div className="mt-3 flex items-center justify-between text-xs">
          <StatusPill status="fixed" />
          <span className="text-muted">Citizen emailed to confirm</span>
        </div>
      )}
    </Card>
  );
}
