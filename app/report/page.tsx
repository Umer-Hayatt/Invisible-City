"use client";

import { ArrowRight, Camera, CircleCheck, Copy, ImagePlus, LoaderCircle, LocateFixed, MapPin, Repeat, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import CityMap from "@/components/CityMap";
import { Card, CategoryChip, PageHeader, PriorityMeter, SeverityBadge, btn, field } from "@/components/ui";
import Gate from "@/components/Gate";
import { api, prepareImage } from "@/lib/client";
import { AIAnalysis, CATEGORIES, CATEGORY_META, Issue } from "@/lib/types";

interface SubmitResult {
  issueId: number;
  analysis: AIAnalysis;
  duplicate: { issueId: number; title: string; score: number; distance: number; imageSimilarity: number | null } | null;
  recurrenceOf: number | null;
  issue: Issue;
}

const PRESETS: { name: string; lat: number; lng: number }[] = [
  { name: "F-10 Markaz", lat: 33.6952, lng: 73.0118 },
  { name: "G-9 Karachi Co.", lat: 33.6885, lng: 73.033 },
  { name: "I-10 Markaz", lat: 33.6448, lng: 73.0378 },
  { name: "Blue Area", lat: 33.7178, lng: 73.0705 },
];

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{n}</span>
        <div>
          <div className="font-bold">{title}</div>
          {hint && <div className="text-xs text-muted">{hint}</div>}
        </div>
      </div>
      {children}
    </Card>
  );
}

export default function ReportPage() {
  return (
    <Gate roles={["citizen"]} needProfile next="/report">
      <ReportForm />
    </Gate>
  );
}

function ReportForm() {
  const [photo, setPhoto] = useState<{ file: File; hash: string; preview: string } | null>(null);
  const [description, setDescription] = useState("");
  const [hint, setHint] = useState("");
  const [loc, setLoc] = useState<[number, number] | null>(null);
  const [locSource, setLocSource] = useState("");
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function locateWithGps() {
    if (!navigator.geolocation) return setError("Geolocation is not available in this browser");
    setLocSource("Locating…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const v: [number, number] = [p.coords.latitude, p.coords.longitude];
        setLoc(v);
        setFocus(v);
        setLocSource(`GPS · accurate to ${Math.round(p.coords.accuracy)} m`);
      },
      () => setLocSource("GPS unavailable - tap the map or choose a demo location"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function onPhoto(f: File | undefined) {
    if (!f) return;
    setError("");
    try {
      setPhoto(await prepareImage(f));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!loc) return setError("Set the location: use GPS, tap the map, or choose a demo location.");
    if (!photo && !description.trim()) return setError("Add a photo or describe the problem.");
    setBusy(true);
    setError("");
    const fd = new FormData();
    if (photo) {
      fd.append("image", photo.file);
      fd.append("imageHash", photo.hash);
    }
    fd.append("description", description);
    fd.append("lat", String(loc[0]));
    fd.append("lng", String(loc[1]));
    if (hint) fd.append("categoryHint", hint);
    try {
      setResult(await api<SubmitResult>("/api/reports", { method: "POST", body: fd }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setPhoto(null);
    setDescription("");
    setHint("");
    if (fileRef.current) fileRef.current.value = "";
  }

  if (result) return <ResultView r={result} preview={photo?.preview ?? null} onAnother={reset} />;

  return (
    <form onSubmit={submit}>
      <PageHeader
        eyebrow="Citizen report"
        title="Report a problem"
        sub="One photo is enough. AI works out what it is and how serious it is, and checks whether your neighbours have already reported it."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
        <div className="space-y-5">
          <Step n={1} title="Add a photo" hint="Taken on your phone or uploaded">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-canvas transition hover:border-brand"
              style={{ minHeight: 260 }}
            >
              {photo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt="Selected" className="max-h-[340px] w-full object-cover" />
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                    <Camera size={14} /> Change photo
                  </span>
                </>
              ) : (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand transition group-hover:scale-105">
                    <ImagePlus size={26} />
                  </div>
                  <div className="mt-3 font-semibold">Tap to take or upload a photo</div>
                  <div className="mt-1 text-xs text-muted">JPEG, PNG or WebP · resized on your device before upload</div>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            {photo && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <Sparkles size={13} className="text-brand" />
                Photo fingerprint <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-ink-2">{photo.hash}</code> used for duplicate
                detection
              </div>
            )}
          </Step>

          <Step n={2} title="Describe it" hint="Optional if you added a photo">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. Deep pothole in the left lane near the F-10 Markaz signal, bikes are swerving to avoid it"
              className={field}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-ink-2">
                Category
                <select value={hint} onChange={(e) => setHint(e.target.value)} className={`${field} mt-1.5`}>
                  <option value="">Let AI decide</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_META[c].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Step>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Step n={3} title="Pin the location" hint="Use GPS, tap the map, or choose a demo spot">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={locateWithGps} className={btn.dark}>
                <LocateFixed size={15} /> Use my location
              </button>
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    // small jitter, like two phones standing a few metres apart
                    const v: [number, number] = [p.lat + (Math.random() - 0.5) * 0.0002, p.lng + (Math.random() - 0.5) * 0.0002];
                    setLoc(v);
                    setFocus(v);
                    setLocSource(`Demo location · ${p.name}`);
                  }}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div className="overflow-hidden rounded-xl border border-line">
              <CityMap
                picked={loc}
                focus={focus}
                onPick={(lat, lng) => {
                  setLoc([lat, lng]);
                  setLocSource("Pinned on map");
                }}
                className="h-[340px]"
              />
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted">
              <MapPin size={13} className={loc ? "text-brand" : ""} />
              {loc ? (
                <>
                  <span className="font-mono text-ink-2">
                    {loc[0].toFixed(5)}, {loc[1].toFixed(5)}
                  </span>
                  · {locSource}
                </>
              ) : (
                locSource || "No location yet"
              )}
            </div>
          </Step>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

          <button disabled={busy} className={`${btn.primary} w-full py-4 text-base`}>
            {busy ? (
              <>
                <LoaderCircle size={18} className="animate-spin" /> AI is analysing your report…
              </>
            ) : (
              <>
                Submit report <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

function ResultView({ r, preview, onAnother }: { r: SubmitResult; preview: string | null; onAnother: () => void }) {
  const a = r.analysis;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white">
          <CircleCheck size={30} />
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Report received</h1>
        <p className="mt-1 text-ink-2">
          {r.duplicate ? `Added to existing issue #${r.issueId}.` : `New issue #${r.issueId} created.`} Follow it under{" "}
          <Link href="/track" className="font-semibold text-brand underline-offset-2 hover:underline">
            My reports
          </Link>
          .
        </p>
      </div>

      {r.duplicate && (
        <div className="rounded-2xl border border-amber-300 bg-accent-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-ink">
              <Copy size={20} />
            </div>
            <div>
              <div className="text-lg font-bold">Possible duplicate detected · reports grouped</div>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">
                Your report matches <b>issue #{r.duplicate.issueId}, “{r.duplicate.title}”</b>. Instead of opening a new ticket, it was added as
                supporting evidence. <b>{r.issue.report_count} citizens</b> have now reported this, so its priority went up.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Metric label="Match score" value={`${Math.round(r.duplicate.score * 100)}%`} />
            <Metric label="Distance apart" value={`${r.duplicate.distance} m`} />
            <Metric label="Photo similarity" value={r.duplicate.imageSimilarity === null ? "n/a" : `${Math.round(r.duplicate.imageSimilarity * 100)}%`} />
          </div>
        </div>
      )}
      {r.recurrenceOf && (
        <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm">
          <Repeat size={18} className="mt-0.5 shrink-0 text-violet-700" />
          <div>
            <b>Recurring problem.</b> Issue #{r.recurrenceOf} at this spot was marked as fixed before. It has been flagged for predictive maintenance.
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="grid sm:grid-cols-[240px_1fr]">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-56 w-full object-cover sm:h-full" />
          ) : (
            <div className="hidden bg-sunken sm:block" />
          )}
          <div className="space-y-3 p-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand">
              <Sparkles size={12} /> AI analysis · {a.source === "claude" ? "Claude vision" : a.source === "groq" ? "Groq vision" : "offline heuristic"}
            </div>
            <div className="text-xl font-bold leading-snug">{a.title}</div>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryChip category={a.category} />
              <SeverityBadge severity={a.severity} />
              <span className="text-xs font-medium text-muted">{Math.round(a.confidence * 100)}% confidence</span>
            </div>
            <p className="text-sm leading-relaxed text-ink-2">{a.summary}</p>
            {a.hazards.length > 0 && (
              <ul className="space-y-1 text-sm text-ink-2">
                {a.hazards.map((h) => (
                  <li key={h} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-orange-500" />
                    {h}
                  </li>
                ))}
              </ul>
            )}
            {!a.is_civic_issue && (
              <div className="rounded-lg bg-accent-50 p-2.5 text-xs text-ink-2">
                The AI isn&apos;t sure this photo shows a civic problem. An official will review it.
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                Priority <PriorityMeter value={r.issue.priority} wide />
              </span>
              <span className="text-muted">Routed to {CATEGORY_META[r.issue.category].team}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Link href={`/issues/${r.issueId}`} className={btn.primary}>
          View issue #{r.issueId} <ArrowRight size={16} />
        </Link>
        <button onClick={onAnother} className={btn.ghost}>
          <Camera size={16} /> Report another
        </button>
        <Link href="/" className={btn.ghost}>
          <MapPin size={16} /> See it on the map
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 text-center">
      <div className="text-xl font-extrabold tabular-nums">{value}</div>
      <div className="text-[11px] font-medium text-muted">{label}</div>
    </div>
  );
}
