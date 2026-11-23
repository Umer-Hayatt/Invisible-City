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
import { Category, Severity, Status } from "@/lib/types";

/* ---------- colour scales ---------- */
export const SEVERITY_COLOR: Record<Severity, string> = {
  low: "#3b82c4",
  medium: "#e0a100",
  high: "#e26a1b",
  critical: "#d1343b",
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

const CATEGORY_TINT: Record<Category, string> = {
  road_damage: "bg-orange-50 text-orange-700",
  garbage: "bg-lime-50 text-lime-700",
  streetlight: "bg-amber-50 text-amber-700",
  water_leak: "bg-sky-50 text-sky-700",
  drainage: "bg-cyan-50 text-cyan-800",
  blocked_footpath: "bg-stone-100 text-stone-700",
  accessibility: "bg-violet-50 text-violet-700",
  electrical_hazard: "bg-yellow-50 text-yellow-800",
  building_damage: "bg-rose-50 text-rose-700",
  other: "bg-slate-100 text-slate-600",
};

export function healthColor(score: number) {
  return score >= 75 ? "#0e6b48" : score >= 55 ? "#c99a00" : score >= 40 ? "#e26a1b" : "#d1343b";
}

/* ---------- primitives ---------- */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>{children}</div>;
}

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, right }: { eyebrow?: string; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div className="max-w-2xl">
        {eyebrow && <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand">{eyebrow}</div>}
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {sub && <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50",
  accent:
    "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink shadow-sm transition hover:brightness-95 disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/30 disabled:opacity-50",
  dark:
    "inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-50",
};

export const field =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/10";

/* ---------- badges ---------- */
const SEV_CLASS: Record<Severity, string> = {
  low: "bg-sky-50 text-sky-800 ring-sky-200",
  medium: "bg-amber-50 text-amber-800 ring-amber-200",
  high: "bg-orange-50 text-orange-800 ring-orange-200",
  critical: "bg-red-50 text-red-700 ring-red-200",
};
const STATUS_CLASS: Record<Status, string> = {
  open: "bg-sunken text-ink-2 ring-line",
  assigned: "bg-violet-50 text-violet-800 ring-violet-200",
  in_progress: "bg-blue-50 text-blue-800 ring-blue-200",
  fixed: "bg-amber-50 text-amber-800 ring-amber-200",
  resolved: "bg-brand-50 text-brand-700 ring-brand-100",
  closed_unconfirmed: "bg-sunken text-muted ring-line",
};
export const statusLabel = (s: Status) => t(`status.${s}`);
export const severityLabel = (s: Severity) => t(`severity.${s}`);
export const categoryLabel = (c: Category) => t(`category.${c}`);

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${SEV_CLASS[severity]}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEVERITY_COLOR[severity] }} />
      {severityLabel(severity)}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_CLASS[status]}`}>
      {statusLabel(status)}
    </span>
  );
}

export function CategoryIcon({ category, size = 18, className = "" }: { category: Category; size?: number; className?: string }) {
  const Icon = CATEGORY_ICON[category];
  return <Icon size={size} strokeWidth={2} className={className} aria-hidden />;
}

export function CategoryChip({ category }: { category: Category }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_TINT[category]}`}>
      <CategoryIcon category={category} size={13} />
      {categoryLabel(category)}
    </span>
  );
}

export function IssueThumb({ src, category, className = "" }: { src: string | null; category: Category; className?: string }) {
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`object-cover ${className}`} />;
  return (
    <div className={`flex items-center justify-center ${CATEGORY_TINT[category]} ${className}`} aria-hidden>
      <CategoryIcon category={category} size={26} />
    </div>
  );
}

export function PriorityMeter({ value, wide = false }: { value: number; wide?: boolean }) {
  const color = value >= 75 ? "#d1343b" : value >= 55 ? "#e26a1b" : value >= 35 ? "#e0a100" : "#3b82c4";
  return (
    <div className="flex items-center gap-2" title={t("ui.priorityTitle", { n: value })}>
      <div className={`h-1.5 overflow-hidden rounded-full bg-sunken ${wide ? "w-24" : "w-14"}`}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="w-6 text-end text-xs font-bold tabular-nums">{value}</span>
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
  tone?: "good" | "bad" | "warn";
}) {
  const toneCls = tone === "good" ? "text-brand" : tone === "bad" ? "text-red-600" : tone === "warn" ? "text-orange-600" : "text-ink";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-xs font-semibold text-muted">
        {label}
        {Icon && <Icon size={16} className="text-muted/70" />}
      </div>
      <div className={`mt-2 text-3xl font-extrabold tracking-tight tabular-nums ${toneCls}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: LucideIcon }[];
}) {
  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-1 shadow-card">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
            value === o.value ? "bg-ink text-white" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.icon && <o.icon size={15} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sunken text-muted">
        <Icon size={22} />
      </div>
      <div className="mt-3 font-semibold">{title}</div>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}
