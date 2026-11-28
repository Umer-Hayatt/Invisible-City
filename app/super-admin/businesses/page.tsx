"use client";

import { Building2, MoreHorizontal, RotateCcw, ShieldOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ConfirmDialog, Pager, SearchInput, matches, usePaged } from "@/components/DataTools";
import Gate from "@/components/Gate";
import { Button } from "@/components/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/primitives/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/primitives/table";
import { Card, Empty, ListSkeleton, PageHeader, Segmented, Tag } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import { officeKind } from "@/lib/office-kind";

interface Business {
  id: number;
  name: string;
  department: string;
  sector: string;
  is_private: boolean;
  is_ngo: boolean;
  workers: number;
  phone: string | null;
  email: string | null;
  active: number;
  fixes: number;
  revoked_at: string | null;
}

type Show = "all" | "active" | "revoked";
type Kind = "all" | "government" | "private" | "ngo";

export default function BusinessesPage() {
  return (
    <Gate roles={["super_admin"]} next="/super-admin/businesses">
      <Businesses />
    </Gate>
  );
}

/** Every Business, government or private, with its email and work; search, filter, and revoke or restore any of them. */
function Businesses() {
  const [rows, setRows] = useState<Business[] | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<Show>("all");
  const [kind, setKind] = useState<Kind>("all");
  const [asking, setAsking] = useState<{ b: Business; action: "revoke" | "restore" } | null>(null);

  const load = useCallback(() => {
    api<{ businesses: Business[] }>("/api/super-admin/businesses")
      .then((d) => setRows(d.businesses))
      .catch((e) => setError(errorText((e as Error).message)));
  }, []);
  useEffect(load, [load]);

  async function act(b: Business, action: "revoke" | "restore") {
    setError("");
    setNote("");
    try {
      if (action === "revoke") {
        const d = await api<{ reopened: number }>(`/api/super-admin/businesses/${b.id}`, { method: "DELETE" });
        setNote(t("superadmin.businessRevoked", { name: b.name, n: d.reopened }));
      } else {
        await api(`/api/super-admin/businesses/${b.id}`, { method: "POST" });
        setNote(t("superadmin.businessRestored", { name: b.name }));
      }
    } catch (e) {
      setError(errorText((e as Error).message));
    }
    load();
  }

  const filtered = useMemo(
    () =>
      (rows ?? []).filter(
        (b) =>
          (show === "all" || (show === "active" ? !b.revoked_at : !!b.revoked_at)) &&
          (kind === "all" || kind === (b.is_ngo ? "ngo" : b.is_private ? "private" : "government")) &&
          matches(query, b.name, b.email, b.sector, b.department, b.phone),
      ),
    [rows, show, kind, query],
  );
  const paged = usePaged(filtered, 10);
  const count = (s: Show) => (rows ?? []).filter((b) => s === "all" || (s === "active" ? !b.revoked_at : !!b.revoked_at)).length;

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.offices")} sub={t("superadmin.businessesSub")} />
      {error && <Alert tone="error">{error}</Alert>}
      {note && <Alert tone="success">{note}</Alert>}

      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <Empty icon={Building2} title={t("superadmin.noBusinesses")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center xl:justify-between">
            <Segmented<Show>
              value={show}
              onChange={setShow}
              options={[
                { value: "all", label: t("data.all"), count: count("all") },
                { value: "active", label: t("data.active"), count: count("active") },
                { value: "revoked", label: t("superadmin.revoked"), count: count("revoked") },
              ]}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger className="h-9 w-full sm:w-40" aria-label={t("data.type")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("data.allTypes")}</SelectItem>
                  <SelectItem value="government">{t("offices.government")}</SelectItem>
                  <SelectItem value="private">{t("offices.private")}</SelectItem>
                  <SelectItem value="ngo">{t("offices.ngo")}</SelectItem>
                </SelectContent>
              </Select>
              <SearchInput value={query} onChange={setQuery} placeholder={t("superadmin.searchBusinesses")} />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted">{t("data.noMatch")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("superadmin.colBusiness")}</TableHead>
                  <TableHead>{t("offices.department")}</TableHead>
                  <TableHead>{t("insights.colSector")}</TableHead>
                  <TableHead>{t("superadmin.colWork")}</TableHead>
                  <TableHead>{t("data.status")}</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">{t("data.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.slice.map((b) => (
                  <TableRow key={b.id} className={b.revoked_at ? "opacity-60" : ""}>
                    <TableCell className="max-w-[280px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-ink">{b.name}</span>
                        <Tag tone={b.is_ngo ? "brand" : b.is_private ? "teal" : "neutral"}>{t(officeKind(b))}</Tag>
                      </div>
                      <div className="truncate text-xs text-muted" dir="auto">
                        {[b.email ?? t("superadmin.noEmail"), b.phone].filter(Boolean).join(" · ")}
                      </div>
                    </TableCell>
                    <TableCell className="text-ink-2">{b.department}</TableCell>
                    <TableCell className="text-ink-2">{b.sector}</TableCell>
                    <TableCell>
                      <div className="text-ink-2 tabular-nums">{t("superadmin.businessWork", { active: b.active, fixes: b.fixes })}</div>
                      <div className="text-xs text-muted">{b.workers ? t("offices.workers", { n: b.workers }) : t("offices.noWorkers")}</div>
                    </TableCell>
                    <TableCell>
                      {b.revoked_at ? (
                        <span className="text-xs font-medium text-danger-ink">{t("superadmin.revokedOn", { when: timeAgo(b.revoked_at) })}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-st-done">
                          <span aria-hidden className="size-1.5 rounded-full bg-current" />
                          {t("data.active")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={t("data.actions")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {b.revoked_at ? (
                            <DropdownMenuItem onSelect={() => setAsking({ b, action: "restore" })}>
                              <RotateCcw /> {t("superadmin.restore")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem variant="destructive" onSelect={() => setAsking({ b, action: "revoke" })}>
                              <ShieldOff /> {t("superadmin.revoke")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pager {...paged} />
        </Card>
      )}

      <ConfirmDialog
        open={!!asking}
        onOpenChange={(o) => !o && setAsking(null)}
        title={asking?.action === "restore" ? t("superadmin.restoreTitle") : t("superadmin.revokeTitle")}
        body={
          asking
            ? asking.action === "restore"
              ? t("superadmin.restoreBusinessConfirm", { name: asking.b.name })
              : t("superadmin.revokeBusinessConfirm", { name: asking.b.name, n: asking.b.active })
            : ""
        }
        confirm={asking?.action === "restore" ? t("superadmin.restore") : t("superadmin.revoke")}
        danger={asking?.action === "revoke"}
        onConfirm={() => (asking ? act(asking.b, asking.action) : undefined)}
      />
    </div>
  );
}
