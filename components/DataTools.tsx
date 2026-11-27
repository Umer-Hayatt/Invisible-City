"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/*
 * Tools for list pages: a search box, client-side pagination, a confirm dialog and an alert line.
 * Each is its own small component so tables, filters and dialogs look the same on every role's pages.
 */

/** A search field with a magnifier and a clear button. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <Search size={15} aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-md border border-line-strong bg-surface ps-9 pe-8 text-sm text-ink shadow-card outline-none transition-[border-color,box-shadow] placeholder:text-muted hover:border-muted focus-visible:border-action focus-visible:ring-3 focus-visible:ring-action/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("data.clear")}
          className="absolute end-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted hover:bg-sunken hover:text-ink"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/** Rows whose text contains every word of the query (case-insensitive). */
export function matches(query: string, ...fields: (string | number | null | undefined)[]) {
  const hay = fields.filter((f) => f !== null && f !== undefined).join(" ").toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

/** Splits a list into pages; the page snaps back into range when the list shrinks (after a search). */
export function usePaged<T>(rows: T[], size = 10) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  const slice = useMemo(() => rows.slice((current - 1) * size, current * size), [rows, current, size]);
  return { slice, page: current, pages, total: rows.length, from: rows.length ? (current - 1) * size + 1 : 0, to: Math.min(current * size, rows.length), setPage };
}

/** "11–20 of 34" with previous and next buttons, under a table. */
export function Pager({ page, pages, from, to, total, setPage }: ReturnType<typeof usePaged<unknown>>) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
      <span className="tabular-nums">{t("data.range", { from, to, total })}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={t("data.previous")}>
          <ChevronLeft className="rtl:rotate-180" />
        </Button>
        <span className="px-2 tabular-nums">{t("data.page", { page, pages })}</span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label={t("data.next")}>
          <ChevronRight className="rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}

/** A dialog that asks before an action that is hard to undo. `danger` makes the confirm button red. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirm,
  danger = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirm: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("office.cancel")}
          </Button>
          <Button
            variant={danger ? "destructive" : "default"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
                onOpenChange(false);
              }
            }}
          >
            {confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** One line of feedback above a list: an error in red, anything else neutral. */
export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-4 py-3 text-sm font-medium",
        tone === "error" && "border-danger/25 bg-danger-50 text-danger-ink",
        tone === "success" && "border-st-done/25 bg-st-done-50 text-st-done",
        tone === "info" && "border-line bg-sunken text-ink-2",
      )}
    >
      {children}
    </div>
  );
}
