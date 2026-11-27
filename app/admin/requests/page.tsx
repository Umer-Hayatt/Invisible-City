"use client";

import { Hand } from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import Gate from "@/components/Gate";
import RequestCard, { type JobRequest } from "@/components/RequestCard";
import { StaggerContainer, StaggerItem } from "@/components/animate";
import { Empty, ListSkeleton, PageHeader } from "@/components/ui";
import { ViewTabs, useView } from "@/components/ViewTabs";
import { api } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

export default function RequestsPage() {
  return (
    <Gate roles={["authority"]} next="/admin/requests">
      <Suspense fallback={<ListSkeleton />}>
        <Requests />
      </Suspense>
    </Gate>
  );
}

const VIEWS = ["pending", "decided"] as const;

/** Businesses asking for jobs in the Authority's area: the ones waiting for an answer, and the ones answered. */
function Requests() {
  const [rows, setRows] = useState<JobRequest[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    api<{ requests: JobRequest[] }>("/api/job-requests")
      .then((d) => setRows(d.requests))
      .catch((e) => {
        setError(errorText((e as Error).message));
        setRows([]);
      });
  }, []);
  useEffect(load, [load]);

  async function decline(r: JobRequest) {
    setError("");
    try {
      await api(`/api/job-requests/${r.id}`, { method: "DELETE" });
    } catch (e) {
      setError(errorText((e as Error).message));
    }
    load();
  }

  const waiting = rows?.filter((r) => r.status === "pending") ?? [];
  const decided = rows?.filter((r) => r.status !== "pending") ?? [];
  const [view, setView] = useView(VIEWS, rows && { pending: waiting.length, decided: decided.length });
  const shown = view === "pending" ? waiting : decided;

  return (
    <div>
      <PageHeader title={t("requests.title")} sub={t("requests.sub")} />
      {error && <div className="mb-5 rounded-[6px] bg-danger-50 px-4 py-3 text-base font-medium text-danger-ink">{error}</div>}
      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <Empty icon={Hand} title={t("requests.empty")} />
      ) : (
        <>
          <ViewTabs
            label={t("requests.title")}
            value={view}
            onChange={setView}
            tabs={[
              { value: "pending", label: t("contract.tabPending"), count: waiting.length },
              { value: "decided", label: t("requests.decided"), count: decided.length },
            ]}
          />
          {shown.length === 0 ? (
            <Empty icon={Hand} title={view === "pending" ? t("requests.noneWaiting") : t("requests.noneDecided")} />
          ) : (
            <StaggerContainer now key={view} className="space-y-4">
              {shown.map((r) => (
                <StaggerItem key={r.id}>
                  {r.status === "pending" ? <RequestCard r={r} onSent={load} onDecline={() => decline(r)} /> : <RequestCard r={r} />}
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </>
      )}
    </div>
  );
}
