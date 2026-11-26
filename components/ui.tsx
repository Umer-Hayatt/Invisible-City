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
import { CountUp } from "./Motion";
import { Category, isActive, Severity, Status } from "@/lib/types";

/* ---------- colour scales ---------- */
export const STATUS_COLOR: Record<Status, string> = {
  open: "var(--color-st-open)",
  assigned: "var(--color-st-assigned)",
  in_progress: "var(--color-st-work)",
  fixed: "var(--color-lime)",
  resolved: "var(--color-st-done)",
  closed_unconfirmed: "var(--color-st-closed)",
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

/* ---------- primitives ---------- */
/** A plain panel. `interactive` panels darken their edge on hover. */
export function Card({ children, className = "", interactive = false }: { children: React.ReactNode; className?: string; interactive?: boolean }) {
  return (
    <div
      className={`rounded-[8px] border border-line bg-surface shadow-card ${
        interactive ? "group transition-colors duration-200 hover:border-ink-2" : ""
      } ${className}`}
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
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-2/3 max-w-xl" />
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
        <div key={i} className="flex gap-4 rounded-[8px] border border-line bg-surface p-4">
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

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {sub && <p className="mt-2 max-w-[62ch] text-base text-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** The top of a working page: a navy band to both screen edges with the title, one sentence and any action. */
export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="bleed on-dark -mt-8 mb-8 pb-9 pt-10 text-on-dark [--bleed:var(--color-navy)] sm:pb-11 sm:pt-12">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-3xl font-bold leading-[1.1] tracking-[-0.02em] sm:text-[2.75rem]">{title}</h1>
          {sub && <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-on-dark-2">{sub}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  );
}

const btnBase =
  "press inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[6px] px-5 py-2.5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const btn = {
  primary: `${btnBase} bg-lime text-on-lime hover:bg-lime-600`,
  ghost: `${btnBase} border border-muted bg-transparent text-ink hover:border-ink hover:bg-sunken`,
  dark: `${btnBase} bg-char text-on-dark hover:bg-char-2 dark:bg-char-line dark:hover:bg-muted`,
  /** Charcoal day and night, for the lime band. */
  char: `${btnBase} bg-char text-on-dark hover:bg-char-2`,
  /** On the navy and charcoal bands and over photographs. */
  onDark: `${btnBase} border border-on-dark-2 text-on-dark hover:border-on-dark hover:bg-on-dark hover:text-char`,
};

export const field =
  "min-h-11 w-full rounded-[6px] border border-muted bg-surface px-3 py-2.5 text-base outline-none transition-colors placeholder:text-muted hover:border-ink-2 focus-visible:border-brand focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-brand";

/* ---------- badges ---------- */
const STATUS_CLASS: Record<Status, string> = {
  open: "bg-st-open text-on-status",
  assigned: "bg-st-assigned text-on-status",
  in_progress: "bg-st-work text-on-status",
  fixed: "bg-lime text-on-lime",
  resolved: "bg-st-done text-on-status",
  closed_unconfirmed: "bg-st-closed text-on-status",
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
    <span className="inline-flex items-center gap-1 rounded-[4px] bg-danger px-2 py-0.5 text-[13px] font-semibold text-on-status">
      <TriangleAlert size={14} strokeWidth={2.25} aria-hidden /> {severityLabel("critical")}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-[4px] px-2 py-0.5 text-[13px] font-semibold ${STATUS_CLASS[status]}`}>
      {statusLabel(status)}
    </span>
  );
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
    <div className={`flex items-center justify-center bg-sunken text-ink-2 ${className}`} aria-hidden>
      <CategoryIcon category={category} size={26} />
    </div>
  );
}

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
  const toneCls = tone === "good" ? "text-brand" : tone === "bad" ? "text-danger-ink" : "text-ink";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2 text-sm font-medium text-muted">
        {label}
        {Icon && <Icon size={16} aria-hidden />}
      </div>
      <div className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${toneCls}`}>
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </div>
      {hint && <div className="mt-1 text-sm text-muted">{hint}</div>}
    </Card>
  );
}

export { Segmented } from "./Segmented";

export function Empty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Icon size={28} className="text-muted" aria-hidden />
      <div className="mt-3 font-semibold">{title}</div>
      {children && <div className="mt-1 text-base text-muted">{children}</div>}
    </div>
  );
}
