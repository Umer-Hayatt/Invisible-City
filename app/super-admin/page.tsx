"use client";

import { Check, Inbox, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ConfirmDialog, Pager, SearchInput, matches, usePaged } from "@/components/DataTools";
import Gate from "@/components/Gate";
import { Button } from "@/components/primitives/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/primitives/table";
import { Card, Empty, ListSkeleton, PageHeader, Segmented, Tag } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

interface Req {
  id: number;
  name: string;
  department: string | null;
  area: string | null;
  official_email: string;
  phone: string | null;
  decision: "pending" | "approved" | "declined";
  decided_by: string | null;
  created_at: string;
}

type Show = "pending" | "decided";

/** People asking to be made Authorities: approve or decline each, after checking they are real officials. */
function Requests() {
  const [rows, setRows] = useState<Req[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<Show>("pending");
  const [asking, setAsking] = useState<{ r: Req; decision: "approved" | "declined" } | null>(null);

  const load = useCallback(() => {
    api<{ requests: Req[] }>("/api/access-requests")
      .then((d) => setRows(d.requests))
      .catch((e) => setError(errorText((e as Error).message)));
  }, []);
  useEffect(load, [load]);

  async function decide(id: number, decision: "approved" | "declined") {
    setError("");
    try {
      await api(`/api/access-requests/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    } catch (e) {
      setError(errorText((e as Error).message));
    }
    load();
  }

  const inShow = (r: Req, s: Show) => (s === "pending" ? r.decision === "pending" : r.decision !== "pending");
  const filtered = useMemo(
    () => (rows ?? []).filter((r) => inShow(r, show) && matches(query, r.name, r.official_email, r.department, r.area ?? t("access.wholeCity"), r.phone)),
    [rows, show, query],
  );
  const paged = usePaged(filtered, 10);
  const count = (s: Show) => (rows ?? []).filter((r) => inShow(r, s)).length;

  return (
    <div className="space-y-6">
      <PageHeader title={t("superadmin.title")} sub={t("superadmin.sub")} />
      {error && <Alert tone="error">{error}</Alert>}
      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <Empty icon={Inbox} title={t("superadmin.empty")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center xl:justify-between">
            <Segmented<Show>
              value={show}
              onChange={setShow}
              options={[
                { value: "pending", label: t("superadmin.pending"), count: count("pending") },
                { value: "decided", label: t("superadmin.decided"), count: count("decided") },
              ]}
            />
            <SearchInput value={query} onChange={setQuery} placeholder={t("superadmin.searchAuthorities")} />
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted">{query ? t("data.noMatch") : t("superadmin.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("access.name")}</TableHead>
                  <TableHead>{t("superadmin.colArea")}</TableHead>
                  <TableHead>{t("offices.department")}</TableHead>
                  <TableHead>{t("superadmin.colContact")}</TableHead>
                  <TableHead>{t("superadmin.colSince")}</TableHead>
                  <TableHead className="text-end">{show === "pending" ? t("data.actions") : t("data.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.slice.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium text-ink">{r.name}</div>
                      <div className="text-xs text-muted" dir="ltr">
                        {r.official_email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Tag tone={r.area ? "brand" : "neutral"}>{r.area ?? t("access.wholeCity")}</Tag>
                    </TableCell>
                    <TableCell className="text-ink-2">{r.department ?? "—"}</TableCell>
                    <TableCell className="text-ink-2" dir="ltr">
                      {r.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted">{timeAgo(r.created_at)}</TableCell>
                    <TableCell className="text-end">
                      {r.decision === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAsking({ r, decision: "declined" })}>
                            <X /> {t("superadmin.decline")}
                          </Button>
                          <Button size="sm" onClick={() => setAsking({ r, decision: "approved" })}>
                            <Check /> {t("superadmin.approve")}
                          </Button>
                        </div>
                      ) : (
                        <span className={`text-xs font-semibold ${r.decision === "approved" ? "text-st-done" : "text-muted"}`}>
                          {t(r.decision === "approved" ? "superadmin.approved" : "superadmin.declined")}
                        </span>
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
        title={asking?.decision === "approved" ? t("superadmin.approveTitle") : t("superadmin.declineTitle")}
        body={
          asking
            ? t(asking.decision === "approved" ? "superadmin.approveConfirm" : "superadmin.declineConfirm", {
                name: asking.r.name,
                area: asking.r.area ?? t("access.wholeCity"),
              })
            : ""
        }
        confirm={asking?.decision === "approved" ? t("superadmin.approve") : t("superadmin.decline")}
        danger={asking?.decision === "declined"}
        onConfirm={() => (asking ? decide(asking.r.id, asking.decision) : undefined)}
      />
    </div>
  );
}

export default function SuperAdminPage() {
  return (
    <Gate roles={["super_admin"]} next="/super-admin">
      <Requests />
    </Gate>
  );
}
