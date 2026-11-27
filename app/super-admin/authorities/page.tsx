"use client";

import { MoreHorizontal, ShieldCheck, ShieldOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ConfirmDialog, Pager, SearchInput, matches, usePaged } from "@/components/DataTools";
import Gate from "@/components/Gate";
import { Button } from "@/components/primitives/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/primitives/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/primitives/table";
import { Card, Empty, ListSkeleton, PageHeader, Segmented, Tag } from "@/components/ui";
import { initials } from "@/components/UserMenu";
import { api, timeAgo } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

interface Authority {
  email: string;
  name: string;
  department: string | null;
  area: string | null;
  phone: string | null;
  approved_at: string | null;
  revoked_at: string | null;
}

type Show = "active" | "revoked" | "all";

export default function AuthoritiesPage() {
  return (
    <Gate roles={["super_admin"]} next="/super-admin/authorities">
      <Authorities />
    </Gate>
  );
}

/** Every Authority and the area each works for; search, filter, and revoke any of them. */
function Authorities() {
  const [rows, setRows] = useState<Authority[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<Show>("active");
  const [asking, setAsking] = useState<Authority | null>(null);

  const load = useCallback(() => {
    api<{ authorities: Authority[] }>("/api/super-admin/authorities")
      .then((d) => setRows(d.authorities))
      .catch((e) => setError(errorText((e as Error).message)));
  }, []);
  useEffect(load, [load]);

  async function revoke(a: Authority) {
    setError("");
    try {
      await api(`/api/super-admin/authorities?email=${encodeURIComponent(a.email)}`, { method: "DELETE" });
    } catch (e) {
      setError(errorText((e as Error).message));
    }
    load();
  }

  const inShow = (a: Authority, s: Show) => s === "all" || (s === "active" ? !a.revoked_at : !!a.revoked_at);
  const filtered = useMemo(
    () => (rows ?? []).filter((a) => inShow(a, show) && matches(query, a.name, a.email, a.area ?? t("access.wholeCity"), a.department, a.phone)),
    [rows, show, query],
  );
  const paged = usePaged(filtered, 10);
  const count = (s: Show) => (rows ?? []).filter((a) => inShow(a, s)).length;

  return (
    <div className="space-y-6">
      <PageHeader title={t("superadmin.authorities")} sub={t("superadmin.authoritiesSub")} />
      {error && <Alert tone="error">{error}</Alert>}
      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <Empty icon={ShieldCheck} title={t("superadmin.noAuthorities")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center xl:justify-between">
            <Segmented<Show>
              value={show}
              onChange={setShow}
              options={[
                { value: "active", label: t("data.active"), count: count("active") },
                { value: "revoked", label: t("superadmin.revoked"), count: count("revoked") },
                { value: "all", label: t("data.all"), count: count("all") },
              ]}
            />
            <SearchInput value={query} onChange={setQuery} placeholder={t("superadmin.searchAuthorities")} />
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted">{t("data.noMatch")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("superadmin.colAuthority")}</TableHead>
                  <TableHead>{t("superadmin.colArea")}</TableHead>
                  <TableHead>{t("offices.department")}</TableHead>
                  <TableHead>{t("superadmin.colContact")}</TableHead>
                  <TableHead>{t("data.status")}</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">{t("data.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.slice.map((a) => (
                  <TableRow key={a.email} className={a.revoked_at ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-xs font-semibold text-ink-2">
                          {initials(a.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink">{a.name}</div>
                          <div className="truncate text-xs text-muted" dir="ltr">
                            {a.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Tag tone={a.area ? "brand" : "neutral"}>{a.area ?? t("access.wholeCity")}</Tag>
                    </TableCell>
                    <TableCell className="text-ink-2">{a.department ?? "—"}</TableCell>
                    <TableCell className="text-ink-2" dir="ltr">
                      {a.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      {a.revoked_at ? (
                        <span className="text-xs font-medium text-danger-ink">{t("superadmin.revokedOn", { when: timeAgo(a.revoked_at) })}</span>
                      ) : (
                        <span className="text-xs text-muted">{a.approved_at ? t("superadmin.approvedOn", { when: timeAgo(a.approved_at) }) : t("data.active")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!a.revoked_at && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={t("data.actions")}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem variant="destructive" onSelect={() => setAsking(a)}>
                              <ShieldOff /> {t("superadmin.revoke")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
        title={t("superadmin.revokeTitle")}
        body={asking ? t("superadmin.revokeAuthorityConfirm", { name: asking.name }) : ""}
        confirm={t("superadmin.revoke")}
        danger
        onConfirm={() => (asking ? revoke(asking) : undefined)}
      />
    </div>
  );
}
