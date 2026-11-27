import {
  Accessibility,
  CircleDot,
  Construction,
  Droplets,
  Building2,
  Zap,
  Lightbulb,
  type LucideIcon,
  Trash2,
  TriangleAlert,
  Waves,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CountUp } from "./Motion";
import { Category, isActive, Severity, Status } from "@/lib/types";

/*
 * Civora building blocks. Every page is made of these, so a change here restyles the whole app.
 * Each block is a separate element with no layout side effects, ready for reveal and hover animations later.
 */

/* ---------- colour scales ---------- */
/** The bright dot colour of each status (map dots, charts, legend). */
export const STATUS_COLOR: Record<Status, string> = {
  open: "var(--color-pin-open)",
  assigned: "var(--color-st-assigned)",
  in_progress: "var(--color-pin-work)",
  fixed: "var(--color-teal)",
  resolved: "var(--color-pin-done)",
  closed_unconfirmed: "var(--color-pin-closed)",
};

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  road_damage: TriangleAlert,
  garbage: Trash2,
  streetlight: Lightbulb,
  water_leak: Droplets,
  drainage: Waves,
  blocked_footpath: Construction,
  accessibility: Accessibility,
  electrical_hazard: Zap,
  building_damage: Building2,
  other: CircleDot,
};

/* ---------- surfaces ---------- */
/** A white card with a hairline border. `interactive` cards lift their border on hover. */
export function Card({ children, className = "", interactive = false }: { children: React.ReactNode; className?: string; interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface shadow-card",
        interactive && "group transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-raised",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A shimmering placeholder in the shape of what is loading. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

/** The loading state of a whole page: a heading and a few blocks, so the layout does not jump when data arrives. */
export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label={t("gate.loading")}>
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3 max-w-sm" />
        <Skeleton className="h-4 w-1/2 max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-[360px]" />
    </div>
  );
}

/** The loading state of a list of cards (jobs, Reports, requests). */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label={t("gate.loading")}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4 rounded-lg border border-line bg-surface p-4">
          <Skeleton className="h-20 w-20 shrink-0" />
          <div className="flex-1 space-y-2.5 pt-1">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A section heading inside a page: title, one line of context, and an optional action on the right. */
export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">{title}</h2>
        {sub && <p className="mt-1 max-w-[65ch] text-sm text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** The top of a working page: title, one sentence and the page's actions, over a hairline. */
export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-4 border-b border-line pb-6 md:flex-row md:items-end">
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[1.75rem]">{title}</h1>
        {sub && <p className="mt-2 max-w-[65ch] text-[15px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {right && <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div>}
    </header>
  );
}

/* ---------- controls ---------- */
const btnBase =
  "press inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0";
/** Button looks for links and plain buttons (the shadcn Button in components/primitives has the same looks). */
export const btn = {
  /** Royal blue: the one main action of a screen. */
  primary: `${btnBase} bg-action text-on-action shadow-card hover:bg-action-600`,
  /** White with a border: every other action. */
  ghost: `${btnBase} border border-line-strong bg-surface text-ink hover:bg-sunken`,
  /** Navy: a strong secondary action. */
  dark: `${btnBase} bg-navy text-on-dark hover:bg-navy-2 dark:bg-navy-line dark:hover:bg-navy-2`,
  navy: `${btnBase} bg-navy text-on-dark hover:bg-navy-2`,
  /** Over photographs and navy bands. */
  onDark: `${btnBase} border border-on-dark/40 text-on-dark hover:bg-on-dark hover:text-navy`,
};

export const field =
  "min-h-10 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-[15px] text-ink shadow-card outline-none transition-[border-color,box-shadow] placeholder:text-muted hover:border-muted focus-visible:border-action focus-visible:ring-3 focus-visible:ring-action/20";

/* ---------- badges ---------- */
const STATUS_CLASS: Record<Status, string> = {
  open: "bg-st-open-50 text-st-open ring-st-open/25",
  assigned: "bg-st-assigned-50 text-st-assigned ring-st-assigned/25",
  in_progress: "bg-st-work-50 text-st-work ring-st-work/25",
  fixed: "bg-st-fixed-50 text-st-fixed ring-st-fixed/25",
  resolved: "bg-st-done-50 text-st-done ring-st-done/25",
  closed_unconfirmed: "bg-st-closed-50 text-st-closed ring-st-closed/25",
};
export const statusLabel = (s: Status) => t(`status.${s}`);
export const severityLabel = (s: Severity) => t(`severity.${s}`);
export const categoryLabel = (c: Category) => t(`category.${c}`);

/**
 * Severity is shown only when it is critical (an immediate danger that cannot be ignored) and the Issue is still
 * waiting on the city; every other level stays out of sight and only orders the Authority's queue.
 */
export function CriticalTag({ severity, status }: { severity: Severity; status?: Status }) {
  if (severity !== "critical" || (status && !isActive(status))) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger-ink ring-1 ring-inset ring-danger/25">
      <TriangleAlert size={13} strokeWidth={2.25} aria-hidden /> {severityLabel("critical")}
    </span>
  );
}

/** A soft badge: a tinted fill, a dot in the status colour, and the status name. */
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_CLASS[status]}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}

/** A small neutral tag, for things like Government or Private, or an area name. */
export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "brand" | "teal" }) {
  const tones = {
    neutral: "bg-sunken text-ink-2 ring-line",
    brand: "bg-brand-50 text-brand ring-brand/20",
    teal: "bg-teal-50 text-teal-700 ring-teal/25 dark:bg-navy-2 dark:text-teal",
  };
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>{children}</span>;
}

export function CategoryIcon({ category, size = 18, className = "" }: { category: Category; size?: number; className?: string }) {
  const Icon = CATEGORY_ICON[category];
  return <Icon size={size} strokeWidth={2} className={className} aria-hidden />;
}

export function IssueThumb({ src, category, className = "" }: { src: string | null; category: Category; className?: string }) {
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`object-cover ${className}`} />;
  return (
    <div className={`flex items-center justify-center bg-sunken text-muted ${className}`} aria-hidden>
      <CategoryIcon category={category} size={24} />
    </div>
  );
}

/** A figure card: label, a big number (counts up when it scrolls into view), and an optional hint. */
export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "good" | "bad";
}) {
  const toneCls = tone === "good" ? "text-st-done" : tone === "bad" ? "text-danger-ink" : "text-ink";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2 text-[13px] font-medium text-muted">
        {label}
        {Icon && (
          <span className="flex size-7 items-center justify-center rounded-md bg-sunken text-ink-2">
            <Icon size={15} aria-hidden />
          </span>
        )}
      </div>
      <div className={`mt-3 text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums ${toneCls}`}>
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </div>
      {hint && <div className="mt-2 truncate text-[13px] text-muted">{hint}</div>}
    </Card>
  );
}

export { Segmented } from "./Segmented";

export function Empty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong px-6 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-sunken text-muted">
        <Icon size={20} aria-hidden />
      </span>
      <div className="mt-4 font-semibold text-ink">{title}</div>
      {children && <div className="mt-1 max-w-[48ch] text-sm text-muted">{children}</div>}
    </div>
  );
}
