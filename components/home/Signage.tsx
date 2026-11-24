"use client";

import { ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Camera, CircleCheck, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { IssueThumb, statusLabel } from "@/components/ui";
import { formatDate, MessageKey, t } from "@/lib/i18n";
import type { NeighborhoodStat } from "@/lib/insights";
import type { Issue, Status } from "@/lib/types";
import { imageUrl } from "@/lib/uploads-url";

/**
 * The home page's road-sign world (see .impeccable/surfaces): one gantry sign with live sector routes, the
 * route line every Report travels, a variable message sign for the latest Issues, a real confirmed Fix, and an
 * exit sign to close.
 */

/** Sets only the digits of a sentence in the figure face, so words stay in the sign's own lettering. */
export function Figures({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\d+(?:\.\d+)?%?)/).map((part, i) =>
        /^\d/.test(part) ? (
          <span key={i} className="figure">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

const ARROWS: LucideIcon[] = [ArrowUpRight, ArrowUp, ArrowLeft, ArrowRight];

/** Picks the four sector routes the gantry shows: neglected sectors first (on yellow), then the best served. */
function routesFrom(hoods: NeighborhoodStat[]) {
  const live = hoods.filter((n) => n.total > 0);
  const neglected = live.filter((n) => n.neglected).slice(0, 2);
  const served = live
    .filter((n) => !n.neglected && n.total >= 3)
    .sort((a, b) => b.resolutionRate - a.resolutionRate)
    .slice(0, 4 - neglected.length);
  return [...neglected, ...served];
}

export function Gantry({ hoods }: { hoods: NeighborhoodStat[] | null }) {
  const routes = hoods ? routesFrom(hoods) : [];
  return (
    <section id="gantry" className="sign relative px-6 py-9 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div>
          <h1 className="text-[clamp(3rem,5.6vw,5rem)] font-black leading-[0.92] tracking-[-0.03em]">
            <span className="block lg:whitespace-nowrap">{t("home.signLine1")}</span>
            <span className="block text-sign-soft lg:whitespace-nowrap">{t("home.signLine2")}</span>
          </h1>
          <p className="mt-5 max-w-[50ch] text-lg leading-relaxed text-sign-ink/90">{t("home.signSub")}</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="/report"
              className="press inline-flex items-center gap-2.5 rounded-[10px] bg-sign-ink px-6 py-3.5 text-base font-black text-sign transition-colors hover:bg-accent hover:text-[#0f1a14]"
            >
              <Camera size={19} strokeWidth={2.5} /> {t("nav.reportLong")}
            </Link>
            <a href="#proof" className="text-base font-bold text-sign-ink underline decoration-2 underline-offset-[6px] hover:decoration-accent">
              {t("home.seeProof")}
            </a>
          </div>
        </div>

        <ul className="space-y-3" aria-label={t("home.routesLabel")}>
          {routes.length === 0
            ? [0, 1, 2, 3].map((i) => <li key={i} className="sign-row h-[60px] opacity-30" />)
            : routes.map((n, i) => {
                const Arrow = ARROWS[i % ARROWS.length];
                return (
                  <li key={n.name}>
                    <Link
                      href="/insights"
                      className={`sign-row flex items-center gap-3 px-4 py-2.5 transition-colors ${
                        n.neglected ? "sign-warn" : "hover:bg-sign-ink hover:text-sign"
                      }`}
                    >
                      <Arrow size={24} strokeWidth={3} className="shrink-0 rtl:-scale-x-100" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xl font-extrabold leading-tight sm:text-2xl">{n.name}</span>
                        {n.neglected && <span className="block text-xs font-bold leading-tight">{t("insights.neglected")}</span>}
                      </span>
                      <span className="text-sm font-semibold opacity-90">
                        <Figures text={t("home.fixedOf", { fixed: n.resolved, total: n.total })} />
                      </span>
                    </Link>
                  </li>
                );
              })}
        </ul>
      </div>
    </section>
  );
}

const STAGES: { status: Status; label: MessageKey; desc: MessageKey }[] = [
  { status: "open", label: "track.stepReported", desc: "home.stage1" },
  { status: "assigned", label: "track.stepAssigned", desc: "home.stage2" },
  { status: "in_progress", label: "track.stepWorking", desc: "home.stage3" },
  { status: "fixed", label: "home.stageAfter", desc: "home.stage4" },
  { status: "resolved", label: "track.stepDone", desc: "home.stage5" },
];

/**
 * The road every Report travels: one painted line with five stops and how many Issues stand at each now.
 * Across the page on wide screens; down the start edge on phones.
 */
export function RouteLine({ issues, loaded }: { issues: Issue[]; loaded: boolean }) {
  const counts = useMemo(() => {
    const c: Partial<Record<Status, number>> = {};
    for (const i of issues) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [issues]);
  const closed = counts.closed_unconfirmed ?? 0;

  return (
    <section aria-labelledby="route-title" className="px-1">
      <h2 id="route-title" className="text-lg font-black tracking-[-0.01em]">
        {t("home.routeTitle")}
      </h2>
      <ol className="relative mt-5 grid gap-y-5 sm:grid-cols-5 sm:gap-y-0">
        {/* the road edge is always there; the ink line paints over it on load (down the start edge on phones, across on wider screens) */}
        <span aria-hidden className="absolute bottom-3 start-[8px] top-3 w-[5px] bg-line sm:hidden" />
        <span aria-hidden className="absolute inset-x-0 top-[8px] hidden h-[5px] bg-line sm:block" />
        <span aria-hidden className="route-paint-y absolute bottom-3 start-[8px] top-3 w-[5px] bg-ink sm:hidden" />
        <span aria-hidden className="route-paint absolute inset-x-0 top-[8px] hidden h-[5px] bg-ink sm:block" />
        {STAGES.map((s) => {
          const done = s.status === "resolved";
          return (
            <li key={s.status} className="relative ps-10 sm:pe-4 sm:ps-0 sm:pt-10">
              <span
                aria-hidden
                className={`absolute start-0 top-0 block h-[21px] w-[21px] rounded-full border-[5px] ${
                  done ? "border-brand bg-brand" : "border-ink bg-canvas"
                }`}
              />
              <div className="flex items-baseline gap-2.5">
                <span className={`figure text-2xl font-semibold ${done ? "text-brand" : "text-ink"}`}>{loaded ? (counts[s.status] ?? 0) : "-"}</span>
                <span className="text-base font-extrabold leading-tight">{t(s.label)}</span>
              </div>
              <p className="mt-1 max-w-[26ch] text-sm leading-snug text-muted">{t(s.desc)}</p>
            </li>
          );
        })}
      </ol>
      {closed > 0 && (
        <p className="mt-5 text-sm text-muted">
          <Figures text={t("home.closedNote", { n: closed })} />
        </p>
      )}
    </section>
  );
}

/** Variable message sign: the latest Issues, one at a time, in amber on a black board. Holds still for reduced motion. */
export function MessageSign({ issues }: { issues: Issue[] }) {
  const lines = useMemo(
    () =>
      [...issues]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 8)
        .map((i) => ({ id: i.id, text: `${i.neighborhood} · ${i.title} · ${statusLabel(i.status)}` })),
    [issues],
  );
  const [n, setN] = useState(0);
  useEffect(() => {
    if (lines.length < 2) return;
    const id = setInterval(() => setN((x) => (x + 1) % lines.length), 3400);
    return () => clearInterval(id);
  }, [lines.length]);
  const line = lines[n % Math.max(1, lines.length)];

  return (
    <section aria-label={t("home.liveStrip")} className="vms px-5 py-4 sm:px-7">
      <div className="flex items-start gap-4 sm:items-center">
        <span aria-hidden className="mt-2 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[#ffb21a] sm:mt-0" />
        <div className="relative min-h-[3.25rem] flex-1 overflow-hidden sm:min-h-0 sm:h-8" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {line && (
              <m.div
                key={line.id}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={`/issues/${line.id}`}
                  className="vms-text line-clamp-2 text-base font-semibold tracking-[0.04em] hover:underline sm:line-clamp-1 sm:text-xl"
                >
                  {line.text}
                </Link>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/** One real Fix that a Citizen confirmed: the before photo, the Office's after-photo, and how long it took. */
export function ProofFix({ issues }: { issues: Issue[] }) {
  const fix = useMemo(
    () =>
      issues
        .filter((i) => i.status === "resolved" && i.resolved_at)
        .sort((a, b) => Number(!!b.after_image) - Number(!!a.after_image) || (b.resolved_at ?? "").localeCompare(a.resolved_at ?? ""))[0],
    [issues],
  );
  if (!fix) return null;
  const days = Math.max(1, Math.round((new Date(fix.resolved_at!).getTime() - new Date(fix.created_at).getTime()) / 86_400_000));

  return (
    <section id="proof" aria-labelledby="proof-title" className="scroll-mt-24">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-end">
        <div>
          <h2 id="proof-title" className="text-3xl font-black tracking-[-0.02em] text-balance sm:text-4xl">
            {t("home.proofTitle")}
          </h2>
          <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-ink-2">
            <Figures text={t("home.proofBody", { office: fix.assigned_team ?? "-", days })} />
          </p>
          <Link href={`/issues/${fix.id}`} className="mt-5 inline-flex items-center gap-2 font-extrabold text-brand underline decoration-2 underline-offset-[6px]">
            {fix.title} <ArrowRight size={17} strokeWidth={2.5} className="rtl:-scale-x-100" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <figure>
            <div className="overflow-hidden rounded-[14px] border-[1.5px] border-line">
              <IssueThumb src={imageUrl(fix.cover_image)} category={fix.category} className="aspect-[4/3] w-full" />
            </div>
            <figcaption className="mt-2 flex items-center gap-1.5 text-sm font-bold text-muted">
              <TriangleAlert size={15} /> {t("issue.before")} · <span className="figure font-medium">{formatDate(fix.created_at)}</span>
            </figcaption>
          </figure>
          <figure>
            <div className="overflow-hidden rounded-[14px] border-[1.5px] border-brand">
              {fix.after_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl(fix.after_image)!} alt={t("issue.after")} className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center bg-brand-50 text-brand">
                  <CircleCheck size={40} strokeWidth={2.25} />
                </div>
              )}
            </div>
            <figcaption className="mt-2 flex items-center gap-1.5 text-sm font-bold text-brand">
              <CircleCheck size={15} /> {t("issue.after")} · <span className="figure font-medium">{formatDate(fix.resolved_at!)}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

/** The last sign on the road: an exit sign whose destination is reporting a problem. */
export function ClosingSign() {
  return (
    <section className="sign relative px-6 pb-10 pt-14 sm:px-12 sm:pb-12 sm:pt-16">
      <span className="exit-tab absolute start-8 top-0 px-4 py-1 text-sm font-black sm:start-12">{t("home.exitLabel")}</span>
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
        <div>
          <h2 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.02em] text-balance sm:text-5xl">{t("home.ctaTitle")}</h2>
          <p className="mt-4 max-w-[54ch] text-lg text-sign-ink/85">{t("home.ctaBody")}</p>
        </div>
        <Link
          href="/report"
          className="sign-row press flex items-center gap-4 px-6 py-4 text-2xl font-black transition-colors hover:bg-sign-ink hover:text-sign"
        >
          <ArrowUpRight size={30} strokeWidth={3} className="shrink-0 rtl:-scale-x-100" />
          {t("nav.reportLong")}
        </Link>
      </div>
    </section>
  );
}
