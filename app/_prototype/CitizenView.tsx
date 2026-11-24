"use client";

import { Camera, ChevronDown, ClipboardList, LocateFixed, Mic, Sparkles, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import CityMap from "@/components/CityMap";
import { CriticalTag, btn, field } from "@/components/ui";
import { Photo, PhotoPicker, SamplePhotoButton, StatusPill, Stepper, Timeline } from "./bits";
import { type Action, CATEGORIES, CATEGORY, type Category, ME, type Profile, type Severity, type State, liveReports } from "./data";

type Tab = "report" | "mine" | "profile";

export default function CitizenView({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  const [tab, setTab] = useState<Tab>("report");
  const needsProfile = !state.profile;
  const current: Tab = needsProfile ? "profile" : tab;

  return (
    <div className="mx-auto w-full max-w-[390px] sm:rounded-[2.2rem] sm:border-[10px] sm:border-ink sm:shadow-float">
      <div className="flex min-h-[720px] flex-col bg-canvas sm:overflow-hidden sm:rounded-[1.6rem]">
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
          <div>
            <div className="text-sm font-extrabold">
              <span className="text-brand">IN</span>visible City
            </div>
            <div className="text-[11px] text-muted">{state.profile ? `Signed in as ${state.profile.name}` : `Signed in with Google · ${ME.email}`}</div>
          </div>
          <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">Citizen</span>
        </header>

        <div className="flex-1 px-4 py-4">
          {current === "profile" && (
            <ProfileSetup
              profile={state.profile}
 onSave={(p) => {
                dispatch({ type: "setProfile", profile: p });
                setTab("report");
              }}
            />
          )}
          {current === "report" && <ReportForm dispatch={dispatch} onDone={() => setTab("mine")} />}
          {current === "mine" && <MyReports state={state} dispatch={dispatch} />}
        </div>

        {!needsProfile && (
          <nav className="sticky bottom-0 grid grid-cols-3 border-t border-line bg-surface">
            {(
              [
                { id: "report", label: "Report", icon: Camera },
                { id: "mine", label: "My reports", icon: ClipboardList },
                { id: "profile", label: "Profile", icon: UserRound },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${current === t.id ? "text-brand" : "text-muted"}`}
              >
                <t.icon size={20} />
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

/* ---------- Profile setup ---------- */
function ProfileSetup({ profile, onSave }: { profile: Profile | null; onSave: (p: Profile) => void }) {
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile ? profile.phone.replace("+92 ", "") : "");
  const phoneOk = /^3\d{2} ?\d{7}$/.test(phone.trim());
  const ok = name.trim().length >= 2 && phoneOk;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">{profile ? "Your profile" : "Finish setting up"}</h2>
        <p className="mt-1 text-sm text-ink-2">
          {profile ? "Only Authorities and the Office fixing your Issue can see these." : "One step before your first Report. Only Authorities and the Office fixing your Issue see these details."}
        </p>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-ink-2">Email (from Google)</span>
        <input className={`${field} bg-sunken text-muted`} value={ME.email} readOnly />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-ink-2">Display name</span>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ayesha Khan" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-ink-2">Phone number</span>
        <div className="flex">
          <span className="flex items-center rounded-l-xl border border-r-0 border-line bg-sunken px-3 text-sm font-semibold text-ink-2">+92</span>
          <input
            className={`${field} rounded-l-none`}
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="301 2345678"
          />
        </div>
        <span className={`mt-1 block text-[11px] ${phone && !phoneOk ? "text-red-600" : "text-muted"}`}>
          Format: 3xx xxxxxxx. Not verified by SMS.
        </span>
      </label>
      <button
        type="button"
        disabled={!ok}
        className={`${btn.primary} w-full`}
        onClick={() => {
          const d = phone.replace(/\s/g, "");
          onSave({ name: name.trim(), phone: `+92 ${d.slice(0, 3)} ${d.slice(3)}` });
        }}
      >
        {profile ? "Save profile" : "Save and continue"}
      </button>
      {!profile && (
        <button type="button" className="w-full text-center text-xs font-semibold text-muted underline" onClick={() => onSave({ name: "Ayesha Khan", phone: "+92 301 2345678" })}>
          Fill with demo details
        </button>
      )}
    </div>
  );
}

/* ---------- Report a problem ---------- */
const SECTORS = [
  { name: "F-10/2", lat: 33.6952, lng: 73.0118 },
  { name: "F-8/2", lat: 33.7105, lng: 73.042 },
  { name: "G-9/1", lat: 33.6885, lng: 73.033 },
  { name: "G-10/4", lat: 33.676, lng: 73.017 },
  { name: "I-8 Markaz", lat: 33.669, lng: 73.076 },
  { name: "F-7/2", lat: 33.721, lng: 73.053 },
  { name: "Blue Area", lat: 33.7178, lng: 73.0705 },
];
function nearestSector(lat: number, lng: number) {
  return SECTORS.reduce((b, s) => ((s.lat - lat) ** 2 + (s.lng - lng) ** 2 < (b.lat - lat) ** 2 + (b.lng - lng) ** 2 ? s : b)).name;
}

const AI = { category: "road_damage" as Category, severity: "high" as Severity, confidence: 0.87, summary: "A deep pothole across one lane, a hazard for bikes." };

function ReportForm({ dispatch, onDone }: { dispatch: (a: Action) => void; onDone: () => void }) {
  const [photo, setPhoto] = useState<string | null | "sample">(null);
  const [analysing, setAnalysing] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [category, setCategory] = useState<Category>(AI.category);
  const [loc, setLoc] = useState<[number, number] | null>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [locNote, setLocNote] = useState("");
  const [description, setDescription] = useState("");
  const [urdu, setUrdu] = useState<string | undefined>();
  const [listening, setListening] = useState(false);

  function gotPhoto(url: string | "sample") {
    setPhoto(url);
    setAnalysing(true);
    setAiDone(false);
    window.setTimeout(() => {
      setAnalysing(false);
      setAiDone(true);
      setCategory(AI.category);
    }, 900);
  }

  function gps() {
    const v: [number, number] = [33.6952, 73.0118];
    setLoc(v);
    setFocus(v);
    setLocNote("GPS · accurate to 12 m (simulated)");
  }

  const ready = photo && aiDone && loc;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold tracking-tight">Report a problem</h2>

      {/* 1. Photo */}
      <section className="rounded-2xl border border-line bg-surface p-3">
        <div className="mb-2 text-xs font-bold text-ink-2">1 · Photo (required)</div>
        {photo ? (
          <div className="space-y-2">
            <Photo src={photo === "sample" ? null : photo} category="road_damage" label="Your photo" className="h-44 w-full rounded-xl" />
            <PhotoPicker onPick={gotPhoto} className="text-xs font-semibold text-brand">
              Retake photo
            </PhotoPicker>
          </div>
        ) : (
          <div className="space-y-2">
            <PhotoPicker onPick={gotPhoto} className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-sunken text-sm font-semibold text-ink-2">
              <Camera size={28} /> Take a photo
            </PhotoPicker>
            <SamplePhotoButton onPick={() => gotPhoto("sample")} />
          </div>
        )}
      </section>

      {/* AI suggestion */}
      {photo && (
        <section className="rounded-2xl border border-brand-100 bg-brand-50 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-brand-700">
            <Sparkles size={14} /> {analysing ? "Looking at your photo…" : "AI suggestion"}
          </div>
          {aiDone && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CriticalTag severity={AI.severity} />
                <span className="text-[11px] text-muted">confidence {Math.round(AI.confidence * 100)}%</span>
              </div>
              <p className="text-xs text-ink-2">{AI.summary}</p>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-ink-2">Category (change it if the AI is wrong)</span>
                <div className="relative">
                  <select className={`${field} appearance-none pr-8`} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY[c].label}
                        {c === AI.category ? " (suggested)" : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3 text-muted" />
                </div>
              </label>
              <p className="text-[11px] text-muted">Goes to: {CATEGORY[category].department} Department</p>
            </div>
          )}
        </section>
      )}

      {/* 2. Location */}
      <section className="rounded-2xl border border-line bg-surface p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-ink-2">2 · Location</span>
          <button type="button" onClick={gps} className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
            <LocateFixed size={14} /> Use my location
          </button>
        </div>
        <div className="h-48 overflow-hidden rounded-xl">
          <CityMap
            picked={loc}
            focus={focus}
            zoom={15}
            onPick={(lat, lng) => {
              setLoc([lat, lng]);
              setLocNote("Pin moved by hand");
            }}
            className="h-48"
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted">
          {loc ? `${nearestSector(loc[0], loc[1])} · ${locNote}` : "Tap “Use my location”, then tap the map to move the pin."}
        </p>
      </section>

      {/* 3. Description + voice */}
      <section className="rounded-2xl border border-line bg-surface p-3">
        <div className="mb-2 text-xs font-bold text-ink-2">3 · Description (optional)</div>
        <div className="flex gap-2">
          <textarea className={`${field} min-h-20`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is wrong? Or hold the mic and speak Urdu." />
          <button
            type="button"
            aria-label="Hold to speak in Urdu"
            onPointerDown={() => setListening(true)}
            onPointerUp={() => {
              setListening(false);
              setUrdu("سیکٹر F-10 میں سڑک پر بڑا گڑھا ہے، موٹر سائیکلیں گر رہی ہیں");
              setDescription("There is a big pothole on the road in F-10, motorbikes are falling.");
            }}
            onPointerLeave={() => setListening(false)}
            className={`flex h-12 w-12 shrink-0 items-center justify-center self-start rounded-full ${listening ? "animate-pulse bg-red-600 text-white" : "bg-ink text-white"}`}
          >
            <Mic size={20} />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-muted">{listening ? "Listening… release to stop" : "Hold the mic to speak (placeholder: fills a sample)"}</p>
        {urdu && (
          <p dir="rtl" lang="ur" className="mt-2 rounded-lg bg-sunken px-2 py-1.5 text-sm">
            {urdu}
          </p>
        )}
      </section>

      <button
        type="button"
        disabled={!ready}
        className={`${btn.primary} w-full py-3`}
        onClick={() => {
          if (!loc) return;
          const sector = nearestSector(loc[0], loc[1]);
          dispatch({
            type: "submitReport",
            category,
            severity: AI.severity,
            title: `${CATEGORY[category].label} in ${sector}`,
            description,
            urdu,
            lat: loc[0],
            lng: loc[1],
            sector,
            photo: photo === "sample" ? null : photo,
          });
          onDone();
        }}
      >
        Send Report
      </button>
      {!ready && <p className="-mt-2 text-center text-[11px] text-muted">Add a photo and a location to send.</p>}
    </div>
  );
}

/* ---------- My reports ---------- */
function MyReports({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  const mine = state.issues.filter((i) => i.reports.some((r) => r.citizenId === ME.id && !r.spam));
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-extrabold tracking-tight">My reports</h2>
      {mine.length === 0 && <p className="text-sm text-muted">No Reports yet.</p>}
      {mine.map((issue) => {
        const my = issue.reports.find((r) => r.citizenId === ME.id)!;
        const others = liveReports(issue).length - 1;
        const expanded = openId === issue.id;
        return (
          <article key={issue.id} className={`rounded-2xl border bg-surface p-3 ${issue.status === "fixed" ? "border-accent ring-2 ring-accent/30" : "border-line"}`}>
            <div className="flex gap-3">
              <Photo src={my.photo} category={issue.category} className="h-16 w-16 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold leading-snug">{issue.title}</h3>
                  <StatusPill status={issue.status} />
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  #{issue.id} · {issue.sector} · reported {my.at}
                  {others > 0 && ` · ${others} other ${others === 1 ? "Citizen" : "Citizens"} reported it too`}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <Stepper status={issue.status} />
            </div>

            {issue.status === "fixed" && <ConfirmFix issueId={issue.id} category={issue.category} after={issue.afterPhoto} note={issue.fixNote} before={my.photo} dispatch={dispatch} />}

            <div className="mt-3 flex items-center justify-between">
              <button type="button" className="text-xs font-semibold text-ink-2" onClick={() => setOpenId(expanded ? null : issue.id)}>
                {expanded ? "Hide timeline" : "Show timeline"}
              </button>
              {issue.status === "open" && (
                <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-red-600" onClick={() => dispatch({ type: "deleteReport", issueId: issue.id, reportId: my.id })}>
                  <Trash2 size={13} /> Delete my Report
                </button>
              )}
            </div>
            {expanded && (
              <div className="mt-2">
                <Timeline issue={issue} />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ConfirmFix({
  issueId,
  category,
  before,
  after,
  note,
  dispatch,
}: {
  issueId: number;
  category: Category;
  before: string | null;
  after: string | null;
  note: string;
  dispatch: (a: Action) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");
  return (
    <div className="mt-3 rounded-xl bg-accent-50 p-3">
      <div className="text-xs font-bold text-amber-900">The Office says this is fixed. Is it?</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Photo src={before} category={category} label="Before" className="h-24 rounded-lg" />
        <Photo src={after} category={category} label="After" className="h-24 rounded-lg" />
      </div>
      {note && <p className="mt-2 text-xs text-ink-2">Office note: “{note}”</p>}
      {!rejecting ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className={`${btn.primary} px-3`} onClick={() => dispatch({ type: "confirmFix", issueId })}>
            Yes, it&apos;s fixed
          </button>
          <button type="button" className={`${btn.ghost} px-3`} onClick={() => setRejecting(true)}>
            Not fixed
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <textarea className={`${field} min-h-16`} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What is still wrong?" />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={`${btn.ghost} px-3`} onClick={() => setRejecting(false)}>
              Cancel
            </button>
            <button type="button" disabled={!comment.trim()} className={`${btn.dark} px-3`} onClick={() => dispatch({ type: "rejectFix", issueId, comment: comment.trim() })}>
              Send rejection
            </button>
          </div>
        </div>
      )}
      <p className="mt-2 text-[10px] text-muted">With no answer in 7 days this closes as “Closed unconfirmed”.</p>
    </div>
  );
}
