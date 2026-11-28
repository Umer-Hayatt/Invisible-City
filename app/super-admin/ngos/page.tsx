"use client";

import { Check, HeartHandshake, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ConfirmDialog, Pager, SearchInput, matches, usePaged } from "@/components/DataTools";
import Gate from "@/components/Gate";
import { Button } from "@/components/primitives/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/primitives/table";
import { Card, Empty, ListSkeleton, PageHeader, Segmented, Tag } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

interface NgoRegistration {
  id: number;
  name: string;
  department: string;
  sector: string;
  workers: number;
  contact_name: string;
  email: string;
  phone: string | null;
  registration_number: string | null;
  website: string | null;
  about: string | null;
  decision: "pending" | "approved" | "declined";
  created_at: string;
  revoked_before: boolean;
}

type Show = "pending" | "decided";

/** NGOs asking to work on Issues: the Super Admin checks each registration number, then approves or declines. */
function Ngos() {
  const [rows, setRows] = useState<NgoRegistration[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<Show>("pending");
  const [asking, setAsking] = useState<{ r: NgoRegistration; decision: "approved" | "declined" } | null>(null);

  const load = useCallback(() => {
    api<{ registrations: NgoRegistration[] }>("/api/super-admin/ngos")
      .then((d) => setRows(d.registrations))
      .catch((e) => setError(errorText((e as Error).message)));
  }, []);
  useEffect(load, [load]);

  async function decide(id: number, decision: "approved" | "declined") {
    setError("");
    try {
      await api(`/api/super-admin/ngos/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    } catch (e) {
      setError(errorText((e as Error).message));
    }
    load();
  }

  const inShow = (r: NgoRegistration, s: Show) => (s === "pending" ? r.decision === "pending" : r.decision !== "pending");
  const filtered = useMemo(
    () =>
      (rows ?? []).filter(
        (r) => inShow(r, show) && matches(query, r.name, r.email, r.registration_number, r.department, r.sector, r.contact_name, r.phone),
      ),
    [rows, show, query],
  );
  const paged = usePaged(filtered, 10);
  const count = (s: Show) => (rows ?? []).filter((r) => inShow(r, s)).length;

  return (
    <div className="space-y-6">
      <PageHeader title={t("ngos.title")} sub={t("ngos.sub")} />
      {error && <Alert tone="error">{error}</Alert>}
      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <Empty icon={HeartHandshake} title={t("ngos.empty")} />
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
            <SearchInput value={query} onChange={setQuery} placeholder={t("ngos.search")} />
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted">{query ? t("data.noMatch") : t("ngos.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("ngos.colNgo")}</TableHead>
                  <TableHead>{t("ngos.colRegNumber")}</TableHead>
                  <TableHead>{t("ngos.colWork")}</TableHead>
                  <TableHead>{t("superadmin.colContact")}</TableHead>
                  <TableHead>{t("superadmin.colSince")}</TableHead>
                  <TableHead className="text-end">{show === "pending" ? t("data.actions") : t("data.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.slice.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[320px] whitespace-normal">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{r.name}</span>
                        {r.revoked_before && <Tag>{t("ngos.revokedBefore")}</Tag>}
                      </div>
                      {r.about && <p className="mt-0.5 line-clamp-2 text-xs text-ink-2">{r.about}</p>}
                      {r.website && (
                        <a href={r.website} target="_blank" rel="noreferrer" dir="ltr" className="block truncate text-xs text-brand hover:underline">
                          {r.website}
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-ink" dir="ltr">
                      {r.registration_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-ink-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{r.department}</span>
                        <Tag tone="brand">{r.sector}</Tag>
                      </div>
                      {r.workers > 0 && <div className="text-xs text-muted">{t("ngos.volunteers", { n: r.workers })}</div>}
                    </TableCell>
                    <TableCell className="text-ink-2">
                      <div>{r.contact_name}</div>
                      <div className="text-xs text-muted" dir="ltr">
                        {[r.email, r.phone].filter(Boolean).join(" · ")}
                      </div>
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
        title={asking?.decision === "approved" ? t("ngos.approveTitle") : t("ngos.declineTitle")}
        body={
          asking
            ? t(asking.decision === "approved" ? "ngos.approveConfirm" : "ngos.declineConfirm", {
                name: asking.r.name,
                department: asking.r.department,
                sector: asking.r.sector,
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

export default function SuperAdminNgosPage() {
  return (
    <Gate roles={["super_admin"]} next="/super-admin/ngos">
      <Ngos />
    </Gate>
  );
}
