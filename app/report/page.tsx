"use client";

import { ArrowRight, Camera, CircleCheck, Copy, ImagePlus, LoaderCircle, LocateFixed, MapPin, Repeat, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { m } from "motion/react";
import { useRef, useState } from "react";
import CityMap from "@/components/CityMap";
import { celebrate } from "@/components/Motion";
import Gate from "@/components/Gate";
import { Card, CategoryChip, PageHeader, PriorityMeter, SeverityBadge, btn, categoryLabel, field } from "@/components/ui";
import VoiceInput from "@/components/VoiceInput";
import { api, prepareImage } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import { AIAnalysis, CATEGORIES, Issue } from "@/lib/types";

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
  const [voiceUrdu, setVoiceUrdu] = useState("");
  const [hint, setHint] = useState("");
  const [loc, setLoc] = useState<[number, number] | null>(null);
  const [locSource, setLocSource] = useState("");
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function locateWithGps() {
    if (!navigator.geolocation) return setError(t("report.noGeolocation"));
    setLocSource(t("report.locating"));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const v: [number, number] = [p.coords.latitude, p.coords.longitude];
        setLoc(v);
        setFocus(v);
        setLocSource(t("report.gpsAccuracy", { m: Math.round(p.coords.accuracy) }));
      },
      () => setLocSource(t("report.gpsUnavailable")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function onPhoto(f: File | undefined) {
    if (!f) return;
    setError("");
    try {
      setPhoto(await prepareImage(f));
    } catch {
      setError(errorText("unsupported_image"));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!loc) return setError(errorText("invalid_location"));
    if (!photo) return setError(errorText("photo_required"));
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("image", photo.file);
    fd.append("imageHash", photo.hash);
    fd.append("description", description);
    if (voiceUrdu) fd.append("voiceTranscript", voiceUrdu);
    fd.append("lat", String(loc[0]));
    fd.append("lng", String(loc[1]));
    if (hint) fd.append("categoryHint", hint);
    try {
      setResult(await api<SubmitResult>("/api/reports", { method: "POST", body: fd }));
      celebrate();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(errorText((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setPhoto(null);
    setDescription("");
    setVoiceUrdu("");
    setHint("");
    if (fileRef.current) fileRef.current.value = "";
  }

  if (result) return <ResultView r={result} preview={photo?.preview ?? null} onAnother={reset} />;

  return (
    <form onSubmit={submit}>
      <PageHeader eyebrow={t("report.eyebrow")} title={t("nav.reportLong")} sub={t("report.sub")} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
        <div className="space-y-5">
          <Step n={1} title={t("report.step1")} hint={t("report.step1Hint")}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-canvas transition hover:border-brand"
              style={{ minHeight: 260 }}
            >
              {photo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt={t("report.selectedPhoto")} className="max-h-[340px] w-full object-cover" />
                  <span className="absolute bottom-3 end-3 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                    <Camera size={14} /> {t("office.changePhoto")}
                  </span>
                </>
              ) : (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand transition group-hover:scale-105">
                    <ImagePlus size={26} />
                  </div>
                  <div className="mt-3 font-semibold">{t("report.tapPhoto")}</div>
                  <div className="mt-1 text-xs text-muted">{t("report.photoTypes")}</div>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            {photo && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <Sparkles size={13} className="text-brand" />
                {t("report.fingerprint")} <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-ink-2">{photo.hash}</code>
              </div>
            )}
          </Step>

          <Step n={2} title={t("report.step2")} hint={t("report.step2Hint")}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <VoiceInput
                disabled={busy}
                onText={(v) => {
                  setVoiceUrdu(v.urdu);
                  setDescription(v.english);
                }}
              />
              <span className="text-xs text-muted">{t("voice.hint")}</span>
            </div>
            {voiceUrdu && (
              <div className="mb-3 rounded-xl border border-brand-100 bg-brand-50 p-3">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-brand-700">
                  {t("voice.urduLabel")}
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceUrdu("");
                      setDescription("");
                    }}
                    className="inline-flex items-center gap-1 text-muted hover:text-ink"
                  >
                    <X size={13} /> {t("voice.remove")}
                  </button>
                </div>
                <p dir="rtl" lang="ur" className="mt-1 text-base leading-loose text-ink">
                  {voiceUrdu}
                </p>
                <div className="mt-2 text-xs text-muted">{t("voice.englishBelow")}</div>
              </div>
            )}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t("report.descriptionPlaceholder")}
              className={field}
              dir={voiceUrdu ? "ltr" : undefined}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-ink-2">
                {t("report.category")}
                <select value={hint} onChange={(e) => setHint(e.target.value)} className={`${field} mt-1.5`}>
                  <option value="">{t("report.letAiDecide")}</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel(c)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Step>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Step n={3} title={t("report.step3")} hint={t("report.step3Hint")}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={locateWithGps} className={btn.dark}>
                <LocateFixed size={15} /> {t("report.useLocation")}
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
                    setLocSource(t("report.demoLocation", { place: p.name }));
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
                  setLocSource(t("report.pinned"));
                }}
                className="h-[340px]"
              />
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted">
              <MapPin size={13} className={loc ? "text-brand" : ""} />
              {loc ? (
                <>
                  <span className="font-mono text-ink-2" dir="ltr">
                    {loc[0].toFixed(5)}, {loc[1].toFixed(5)}
                  </span>
                  · {locSource}
                </>
              ) : (
                locSource || t("report.noLocation")
              )}
            </div>
          </Step>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

          <button disabled={busy} className={`${btn.primary} w-full py-4 text-base`}>
            {busy ? (
              <>
                <LoaderCircle size={18} className="animate-spin" /> {t("report.analysing")}
              </>
            ) : (
              <>
                {t("report.submit")} <ArrowRight size={18} className="rtl:rotate-180" />
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
        <m.div
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 16 }}
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30"
        >
          <CircleCheck size={30} />
        </m.div>
        <m.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-4 text-3xl font-extrabold tracking-tight"
        >
          {t("report.received")}
        </m.h1>
        <p className="mt-1 text-ink-2">
          {r.duplicate ? t("report.addedTo", { id: r.issueId }) : t("report.created", { id: r.issueId })} {t("report.followUnder")}{" "}
          <Link href="/track" className="font-semibold text-brand underline-offset-2 hover:underline">
            {t("nav.myReports")}
          </Link>
        </p>
      </div>

      {r.duplicate && (
        <div className="rounded-2xl border border-amber-300 bg-accent-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-ink">
              <Copy size={20} />
            </div>
            <div>
              <div className="text-lg font-bold">{t("report.duplicateTitle")}</div>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">
                {t("report.duplicateBody", { id: r.duplicate.issueId, title: r.duplicate.title, n: r.issue.report_count })}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Metric label={t("report.matchScore")} value={`${Math.round(r.duplicate.score * 100)}%`} />
            <Metric label={t("report.distanceApart")} value={t("report.metres", { n: r.duplicate.distance })} />
            <Metric
              label={t("report.photoSimilarity")}
              value={r.duplicate.imageSimilarity === null ? "-" : `${Math.round(r.duplicate.imageSimilarity * 100)}%`}
            />
          </div>
        </div>
      )}
      {r.recurrenceOf && (
        <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm">
          <Repeat size={18} className="mt-0.5 shrink-0 text-violet-700" />
          <div>{t("report.recurring", { id: r.recurrenceOf })}</div>
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
              <Sparkles size={12} /> {t("report.aiAnalysis")} ·{" "}
              {a.source === "gemini" ? "Gemini" : a.source === "groq" ? "Groq" : t("report.aiOffline")}
            </div>
            <div className="text-xl font-bold leading-snug">{a.title}</div>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryChip category={a.category} />
              <SeverityBadge severity={a.severity} />
              <span className="text-xs font-medium text-muted">{t("report.confidence", { n: Math.round(a.confidence * 100) })}</span>
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                {t("admin.colPriority")} <PriorityMeter value={r.issue.priority} wide />
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Link href={`/issues/${r.issueId}`} className={btn.primary}>
          {t("map.openIssue", { id: r.issueId })} <ArrowRight size={16} className="rtl:rotate-180" />
        </Link>
        <button onClick={onAnother} className={btn.ghost}>
          <Camera size={16} /> {t("report.another")}
        </button>
        <Link href="/" className={btn.ghost}>
          <MapPin size={16} /> {t("report.seeOnMap")}
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
