"use client";

import { Camera, CircleCheck, Copy, HardHat, Layers, ScanSearch, ShieldCheck, Sparkles, TriangleAlert, Wrench } from "lucide-react";
import { m, useInView } from "motion/react";
import { useRef } from "react";
import { t } from "@/lib/i18n";

/**
 * "From one photo to a fixed street": four cards in a normal grid (the page scrolls freely). Each card has a
 * small app screen that plays its animation once when the card comes into view.
 */
const STEPS = [
  { icon: Camera, n: 1, Screen: ScreenReport },
  { icon: ScanSearch, n: 2, Screen: ScreenAi },
  { icon: Layers, n: 3, Screen: ScreenOffice },
  { icon: ShieldCheck, n: 4, Screen: ScreenFixed },
] as const;

export default function HowItWorks() {
  return (
    <section>
      <div className="mb-8 max-w-2xl">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-brand">{t("home.howEyebrow")}</div>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("home.howTitle")}</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((s, i) => (
          <StepCard key={s.n} index={i} {...s} />
        ))}
      </div>
    </section>
  );
}

function StepCard({ icon: Icon, n, Screen, index }: (typeof STEPS)[number] & { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.35 });
  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={seen ? { opacity: 1, y: 0 } : undefined}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 160, damping: 22 }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition-shadow duration-300 hover:shadow-float"
    >
      <div className="relative h-60 overflow-hidden border-b border-line bg-gradient-to-b from-sunken to-surface p-4">
        <div aria-hidden className="absolute -end-10 -top-10 h-32 w-32 rounded-full bg-brand/15 blur-2xl transition-transform duration-700 group-hover:scale-150" />
        <div className="relative h-full rounded-2xl border border-line bg-canvas p-3 shadow-card">{seen && <Screen />}</div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand">
            <Icon size={18} />
          </span>
          <span className="text-xs font-bold tracking-widest text-muted">0{n}</span>
        </div>
        <div className="mt-4 text-lg font-bold">{t(`home.step${n}`)}</div>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">{t(`home.step${n}Body`)}</p>
      </div>
    </m.div>
  );
}

const Photo = ({ className = "", children }: { className?: string; children?: React.ReactNode }) => (
  <div className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-stone-400 to-stone-600 dark:from-stone-600 dark:to-stone-800 ${className}`}>
    <div aria-hidden className="absolute inset-x-5 top-1/2 h-7 -translate-y-1/2 rounded-[50%] bg-black/35 blur-[2px]" />
    {children}
  </div>
);

function ScreenReport() {
  return (
    <div className="flex h-full flex-col gap-2">
      <Photo className="h-24">
        <m.div className="absolute inset-0 bg-white" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ delay: 0.2, duration: 0.5 }} />
      </Photo>
      <div className="rounded-lg bg-surface px-2.5 py-1.5 text-[11px] text-muted shadow-card">📍 F-7 Markaz · GPS</div>
      <m.div
        className="mt-auto flex items-center justify-center gap-1.5 rounded-full bg-brand py-2 text-xs font-semibold text-on-brand"
        animate={{ scale: [1, 0.94, 1] }}
        transition={{ delay: 0.9, duration: 0.35 }}
      >
        <Camera size={13} /> {t("report.submit")}
      </m.div>
    </div>
  );
}

function ScreenAi() {
  const chips = [
    { icon: TriangleAlert, text: t("category.road_damage"), cls: "bg-orange-50 text-orange-700" },
    { icon: Sparkles, text: t("severity.high"), cls: "bg-red-50 text-red-700" },
    { icon: Copy, text: t("home.storyMerged"), cls: "bg-amber-50 text-amber-800" },
  ];
  return (
    <div className="flex h-full flex-col gap-1.5">
      <Photo className="h-16">
        <m.div
          aria-hidden
          className="absolute inset-x-0 h-6 bg-gradient-to-b from-transparent via-emerald-300/60 to-transparent"
          initial={{ top: "-30%" }}
          animate={{ top: "110%" }}
          transition={{ duration: 1.3, repeat: 2, ease: "linear" }}
        />
      </Photo>
      {chips.map((c, i) => (
        <m.div
          key={c.text}
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 + i * 0.25 }}
          className={`flex items-center gap-1.5 truncate rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${c.cls}`}
        >
          <c.icon size={12} className="shrink-0" /> {c.text}
        </m.div>
      ))}
    </div>
  );
}

function ScreenOffice() {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="rounded-xl bg-surface p-2.5 shadow-card">
        <div className="flex items-center gap-1.5 truncate text-[11px] font-semibold text-violet-700">
          <HardHat size={12} className="shrink-0" /> {t("admin.assignedTo", { office: "F-7 Roads Office" })}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken">
          <m.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-brand"
            initial={{ width: "6%" }}
            animate={{ width: "78%" }}
            transition={{ delay: 0.3, duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-blue-700">
          <Wrench size={11} /> {t("status.in_progress")}
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-xl bg-sunken">
        <m.div animate={{ rotate: [0, -14, 14, -8, 0] }} transition={{ delay: 0.4, duration: 1, repeat: 1 }}>
          <Wrench size={34} className="text-brand" />
        </m.div>
      </div>
    </div>
  );
}

function ScreenFixed() {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <Photo className="h-20" />
          <div className="mt-0.5 text-center text-[10px] font-semibold text-muted">{t("issue.before")}</div>
        </div>
        <div>
          <div className="flex h-20 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800">
            <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 14 }}>
              <CircleCheck size={30} className="text-emerald-300" />
            </m.div>
          </div>
          <div className="mt-0.5 text-center text-[10px] font-semibold text-brand">{t("issue.after")}</div>
        </div>
      </div>
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-full bg-brand py-2 text-xs font-semibold text-on-brand"
      >
        <CircleCheck size={13} /> {t("track.confirm")}
      </m.div>
    </div>
  );
}
