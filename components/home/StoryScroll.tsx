"use client";

import { Camera, CircleCheck, Copy, HardHat, Layers, ScanSearch, ShieldCheck, Sparkles, TriangleAlert, Wrench } from "lucide-react";
import { AnimatePresence, m, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { t } from "@/lib/i18n";

/**
 * "From one photo to a fixed street", told by scrolling: the phone stays pinned while the page scrolls past,
 * and its screen changes through the four steps; the step list beside it lights up in turn.
 */
const STEPS = [
  { icon: Camera, n: 1 },
  { icon: ScanSearch, n: 2 },
  { icon: Layers, n: 3 },
  { icon: ShieldCheck, n: 4 },
] as const;

export default function StoryScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (p) => setStep(Math.min(3, Math.max(0, Math.floor(p * 4)))));
  const fill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section ref={ref} className="relative ml-[calc(50%-50vw)] w-screen" style={{ height: "320vh" }}>
      <div className="sticky top-16 flex min-h-[calc(100vh-4rem)] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-brand">{t("home.howEyebrow")}</div>
            <h2 className="mt-2 max-w-xl text-3xl font-extrabold tracking-tight sm:text-5xl">{t("home.howTitle")}</h2>

            <ol className="relative mt-8 space-y-2 ps-6">
              {/* the line fills as you scroll */}
              <span aria-hidden className="absolute start-[7px] top-2 bottom-2 w-0.5 rounded-full bg-line" />
              <m.span aria-hidden className="absolute start-[7px] top-2 w-0.5 rounded-full bg-gradient-to-b from-emerald-400 to-brand" style={{ height: fill }} />
              {STEPS.map((s, i) => {
                const on = i === step;
                const done = i < step;
                return (
                  <li key={s.n} className="relative">
                    <span
                      aria-hidden
                      className={`absolute -start-6 top-4 h-4 w-4 rounded-full border-2 transition-all duration-500 ${
                        on ? "scale-125 border-brand bg-brand shadow-[0_0_0_6px_rgb(14_107_72/0.15)]" : done ? "border-brand bg-brand" : "border-line bg-canvas"
                      }`}
                    />
                    <m.div
                      animate={{ opacity: on ? 1 : 0.45, x: on ? 0 : -4 }}
                      className={`rounded-2xl p-4 transition-colors duration-500 ${on ? "bg-surface shadow-card" : ""}`}
                    >
                      <div className="flex items-center gap-2.5 font-bold">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${on ? "bg-brand text-white" : "bg-sunken text-muted"}`}>
                          <s.icon size={16} />
                        </span>
                        {t(`home.step${s.n}`)}
                      </div>
                      <AnimatePresence initial={false}>
                        {on && (
                          <m.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden ps-[42px] text-sm leading-relaxed text-ink-2"
                          >
                            <span className="block pt-1.5">{t(`home.step${s.n}Body`)}</span>
                          </m.p>
                        )}
                      </AnimatePresence>
                    </m.div>
                  </li>
                );
              })}
            </ol>
          </div>

          <Phone step={step} />
        </div>
      </div>
    </section>
  );
}

function Phone({ step }: { step: number }) {
  return (
    // Scales with the screen height so the whole phone stays visible on short laptop screens.
    <div className="relative mx-auto hidden aspect-[1/2] shrink-0 sm:block" style={{ height: "min(560px, calc(100vh - 7rem))" }}>
      <div aria-hidden className="absolute -inset-10 rounded-[60px] bg-gradient-to-br from-emerald-300/40 via-transparent to-accent/30 blur-3xl" />
      <div className="relative h-full w-full rounded-[44px] border-[10px] border-ink bg-canvas shadow-float">
        <div aria-hidden className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />
        <div className="h-full overflow-hidden rounded-[34px] p-4 pt-10">
          <AnimatePresence mode="wait">
            <m.div
              key={step}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="h-full"
            >
              {step === 0 && <ScreenReport />}
              {step === 1 && <ScreenAi />}
              {step === 2 && <ScreenOffice />}
              {step === 3 && <ScreenFixed />}
            </m.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const Photo = ({ tone = "from-stone-400 to-stone-600", children }: { tone?: string; children?: React.ReactNode }) => (
  <div className={`relative flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${tone}`}>
    <div aria-hidden className="absolute inset-x-6 top-1/2 h-10 -translate-y-1/2 rounded-[50%] bg-black/35 blur-[2px]" />
    {children}
  </div>
);

function ScreenReport() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="text-sm font-bold">{t("nav.reportLong")}</div>
      <Photo>
        <m.div
          className="absolute inset-0 border-4 border-white/80"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        />
      </Photo>
      <div className="rounded-xl bg-surface p-3 text-xs text-muted shadow-card">📍 F-7 Markaz · GPS</div>
      <m.div
        className="mt-auto flex items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-semibold text-white"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 0.95, 1] }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <Camera size={15} /> {t("report.submit")}
      </m.div>
    </div>
  );
}

function ScreenAi() {
  const chips = [
    { icon: TriangleAlert, text: t("category.road_damage"), cls: "bg-orange-50 text-orange-700" },
    { icon: Sparkles, text: t("severity.high"), cls: "bg-red-50 text-red-700" },
    { icon: Copy, text: t("home.storyMerged"), cls: "bg-accent-50 text-amber-800" },
  ];
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-1.5 text-sm font-bold text-brand">
        <Sparkles size={15} /> {t("report.aiAnalysis")}
      </div>
      <Photo>
        <m.div
          aria-hidden
          className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-emerald-300/50 to-transparent"
          initial={{ top: "-20%" }}
          animate={{ top: "110%" }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      </Photo>
      {chips.map((c, i) => (
        <m.div
          key={c.text}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.25 }}
          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${c.cls}`}
        >
          <c.icon size={14} /> {c.text}
        </m.div>
      ))}
    </div>
  );
}

function ScreenOffice() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="text-sm font-bold">{t("office.title")}</div>
      <div className="rounded-2xl bg-surface p-3 shadow-card">
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-700">
          <HardHat size={14} /> {t("admin.assignedTo", { office: "F-7 Roads Office" })}
        </div>
        <div className="mt-2 text-sm font-bold">{t("category.road_damage")}</div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken">
          <m.div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-brand" initial={{ width: "8%" }} animate={{ width: "72%" }} transition={{ delay: 0.3, duration: 1.6, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-700">
          <Wrench size={13} /> {t("status.in_progress")}
        </div>
      </div>
      <m.div
        className="flex items-center justify-center rounded-2xl bg-sunken py-8"
        animate={{ rotate: [0, -12, 12, -6, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.6 }}
      >
        <Wrench size={44} className="text-brand" />
      </m.div>
      <div className="mt-auto rounded-full bg-ink py-3 text-center text-sm font-semibold text-white">{t("office.markFixed")}</div>
    </div>
  );
}

function ScreenFixed() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="text-sm font-bold">{t("track.fixedAsk")}</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Photo tone="from-stone-400 to-stone-600" />
          <div className="mt-1 text-center text-[11px] font-semibold text-muted">{t("issue.before")}</div>
        </div>
        <div>
          <div className="flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-600 to-zinc-800">
            <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 14 }}>
              <CircleCheck size={40} className="text-emerald-300" />
            </m.div>
          </div>
          <div className="mt-1 text-center text-[11px] font-semibold text-brand">{t("issue.after")}</div>
        </div>
      </div>
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-auto flex items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-semibold text-white"
      >
        <CircleCheck size={15} /> {t("track.confirm")}
      </m.div>
      <div className="text-center text-xs font-semibold text-brand">{t("status.resolved")} ✓</div>
    </div>
  );
}
