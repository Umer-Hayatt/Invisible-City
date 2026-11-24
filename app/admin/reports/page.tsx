"use client";

import {
  ArrowUpRight,
  CircleCheck,
  FileSignature,
  HardHat,
  MousePointerClick,
  Repeat,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { m } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ContractState, ContractTerms, WithdrawButton, type Contract } from "@/components/ContractCard";
import ContractForm from "@/components/ContractForm";
import Gate from "@/components/Gate";
import { t } from "@/lib/i18n";
import { useMe } from "@/lib/me";
import {
  Card,
  CategoryChip,
  CategoryIcon,
  Empty,
  IssueThumb,
  CriticalTag,
  PageHeader,
  StatusBadge,
  btn,
  categoryLabel,
  field,
  statusLabel,
} from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { NEIGHBORHOODS } from "@/lib/geo";
import type { NeighborhoodStat } from "@/lib/insights";
import { CATEGORIES, Issue, STATUSES, isActive } from "@/lib/types";
import { imageUrl } from "@/lib/uploads-url";

interface SuggestedOffice {
  id: number;
  name: string;
  distance: number;
  /** Someone can sign in as this Business to answer a contract. */
  has_email: boolean;
}

/** The Authority's work queue: every Issue, filterable, with the panel to review the selected one and send a Business a contract for it. */
export default function ReportsPage() {
  return (
    <Gate roles={["authority"]} next="/admin/reports">
      <Queue />
    </Gate>
  );
}

function Queue() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [hoods, setHoods] = useState<NeighborhoodStat[]>([]);
  const [status, setStatus] = useState("unresolved");
  const [category, setCategory] = useState("");
  const [hood, setHood] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const load = useCallback(() => {
    api<{ issues: Issue[] }>("/api/issues").then((d) => setIssues(d.issues));
    api<{ neighborhoods: NeighborhoodStat[] }>("/api/stats").then((d) => setHoods(d.neighborhoods));
  }, []);
  useEffect(load, [load]);

  const filtered = useMemo(
    () =>
      issues.filter(
        (i) =>
          (status === "unresolved" ? isActive(i.status) : !status || i.status === status) &&
          (!category || i.category === category) &&
          (!hood || i.neighborhood === hood),
      ),
    [issues, status, category, hood],
  );
  const sel = issues.find((i) => i.id === selected) ?? null;
  const neglected = hoods.filter((n) => n.neglected).map((n) => n.name);

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.title")} sub={t("admin.sub")} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
              <Pill value={status} onChange={setStatus}>
                <option value="unresolved">{t("admin.allUnresolved")}</option>
                <option value="">{t("admin.allStatuses")}</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </Pill>
              <Pill value={category} onChange={setCategory}>
                <option value="">{t("home.allCategories")}</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </Pill>
              <Pill value={hood} onChange={setHood}>
                <option value="">{t("admin.allSectors")}</option>
                {NEIGHBORHOODS.map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.name}
                    {neglected.includes(n.name) ? ` (${t("insights.neglected")})` : ""}
                  </option>
                ))}
              </Pill>
              <span className="ms-auto pe-2 text-sm font-medium text-muted">{t("admin.count", { n: filtered.length })}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-start text-[15px]">
                <thead className="text-sm font-semibold text-muted">
                  <tr className="border-b border-line">
                    <th className="px-4 py-3 text-start">{t("admin.colPriority")}</th>
                    <th className="py-3 text-start">{t("admin.colIssue")}</th>
                    <th className="py-3 text-start">{t("insights.colSector")}</th>
                    <th className="px-4 py-3 text-center">{t("admin.colReports")}</th>
                    <th className="py-3 text-start">{t("admin.colStatus")}</th>
                    <th className="py-3 pe-4 text-end">{t("admin.colAge")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((i) => (
                    // Rows glide into place when a filter changes the queue.
                    <m.tr
                      key={i.id}
                      layout="position"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setSelected(i.id)}
                      className={`cursor-pointer transition-colors ${selected === i.id ? "bg-brand-50" : "hover:bg-sunken"}`}
                    >
                      <td className="px-4 py-3">
                        <span className="text-lg font-semibold tabular-nums">{i.priority}</span>
                      </td>
                      <td className="max-w-[320px] py-3 pe-3">
                        <div className="flex items-center gap-2.5">
                          <CategoryIcon category={i.category} size={20} className="shrink-0 text-muted" />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelected(i.id)}
                              className="block max-w-full truncate text-start font-semibold hover:text-brand"
                            >
                              {i.title}
                            </button>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
                              #{i.id}
                              {i.recurrence_of ? (
                                <>
                                  <Repeat size={13} aria-hidden /> {t("admin.recurring")}
                                </>
                              ) : null}
                              <CriticalTag severity={i.severity} status={i.status} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="font-medium">{i.neighborhood}</span>
                        {neglected.includes(i.neighborhood) && <TriangleAlert size={14} className="ms-1 inline text-danger-ink" aria-label={t("insights.neglected")} />}
                      </td>
                      <td className="py-3 text-center font-semibold tabular-nums">{i.report_count}</td>
                      <td className="py-3">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="py-3 whitespace-nowrap pe-4 text-end text-sm text-muted">{timeAgo(i.created_at)}</td>
                    </m.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          {sel ? (
            <IssuePanel key={sel.id} issue={sel} onChanged={load} />
          ) : (
            <Card>
              <Empty icon={MousePointerClick} title={t("admin.selectTitle")}>
                {t("admin.selectBody")}
              </Empty>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-10 rounded-[6px] border border-muted bg-surface px-3 text-[15px] font-medium"
    >
      {children}
    </select>
  );
}

function IssuePanel({ issue, onChanged }: { issue: Issue; onChanged: () => void }) {
  const [offices, setOffices] = useState<SuggestedOffice[] | null>(null);
  const [officeId, setOfficeId] = useState<number | null>(null);
  const { me } = useMe();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [writing, setWriting] = useState(false);
  const [err, setErr] = useState("");

  const loadContracts = useCallback(
    () =>
      api<{ contracts: Contract[] }>(`/api/contracts?issue=${issue.id}`)
        .then((d) => setContracts(d.contracts))
        .catch(() => {}),
    [issue.id],
  );

  useEffect(() => {
    if (issue.status !== "open") return;
    let live = true;
    // Both together, so the panel never offers a second contract while one is waiting.
    Promise.all([api<{ offices: SuggestedOffice[] }>(`/api/issues/${issue.id}/offices`), loadContracts()])
      .then(([d]) => {
        if (!live) return;
        setOffices(d.offices);
        setOfficeId((d.offices.find((o) => o.has_email) ?? d.offices[0])?.id ?? null);
      })
      .catch(() => live && setOffices([]));
    return () => {
      live = false;
    };
  }, [issue.id, issue.status, loadContracts]);

  const waiting = contracts.find((c) => c.status === "sent");
  const last = contracts[0];
  const chosen = offices?.find((o) => o.id === officeId);
  // In the Demo most Businesses are scenery; anywhere else a Business nobody can sign in as cannot be chosen.
  const canChoose = (o: SuggestedOffice) => o.has_email || !!me?.isDemo;
  const changed = () => {
    loadContracts();
    onChanged();
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <IssueThumb src={imageUrl(issue.cover_image)} category={issue.category} className="h-44 w-full" />
        <div className="absolute start-3 top-3">
          <StatusBadge status={issue.status} />
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted">
              #{issue.id}, {issue.neighborhood}
            </span>
            <CategoryChip category={issue.category} />
          </div>
          <h2 className="mt-2 text-xl font-semibold leading-snug">{issue.title}</h2>
          <p className="mt-1 text-base leading-relaxed text-ink-2">{issue.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium text-ink-2">{t("office.reports", { n: issue.report_count })}</span>
            <span className="text-ink-2">{t("ui.priorityTitle", { n: issue.priority })}</span>
            <CriticalTag severity={issue.severity} status={issue.status} />
          </div>
          <Link href={`/issues/${issue.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            {t("admin.fullHistory")} <ArrowUpRight size={14} className="rtl:-scale-x-100" />
          </Link>
        </div>

        {issue.status !== "resolved" && issue.status !== "closed_unconfirmed" ? (
          <>
            <div className="space-y-2.5 border-t border-line pt-5">
              <div className="flex items-center gap-2 text-base font-semibold">
                <HardHat size={18} className="text-muted" aria-hidden /> {t("contract.panelTitle")}
              </div>
              {issue.status !== "open" ? (
                <p className="text-sm text-muted">
                  {issue.assigned_team ? t("admin.assignedTo", { office: issue.assigned_team }) : t("admin.notOpen")}
                </p>
              ) : offices === null ? (
                <p className="text-sm text-muted">{t("gate.loading")}</p>
              ) : offices.length === 0 ? (
                <p className="text-sm text-muted">
                  {t("admin.noOffices")}{" "}
                  <Link href="/admin/offices" className="font-semibold text-brand hover:underline">
                    {t("admin.manageOffices")}
                  </Link>
                </p>
              ) : waiting ? (
                <div className="space-y-3">
                  <ContractState c={waiting} side="authority" />
                  <ContractTerms c={waiting} />
                  {!waiting.can_answer && <p className="text-sm text-ink-2">{t("contract.noAccount")}</p>}
                  <WithdrawButton c={waiting} onChanged={changed} onError={setErr} />
                </div>
              ) : writing && chosen ? (
                <ContractForm
                  issueId={issue.id}
                  officeId={chosen.id}
                  office={chosen.name}
                  title={issue.title}
                  onSent={() => {
                    setWriting(false);
                    changed();
                  }}
                  onCancel={() => setWriting(false)}
                />
              ) : (
                <div className="space-y-2.5">
                  {last && last.status !== "accepted" && <ContractState c={last} side="authority" />}
                  <p className="text-sm text-muted">{t("contract.panelSub")}</p>
                  <select
                    value={officeId ?? ""}
                    onChange={(e) => setOfficeId(Number(e.target.value))}
                    aria-label={t("contract.chooseBusiness")}
                    className={`${field} py-2`}
                  >
                    {offices.map((o) => (
                      <option key={o.id} value={o.id} disabled={!canChoose(o)}>
                        {o.name} ({t("admin.distance", { km: (o.distance / 1000).toFixed(1) })})
                        {canChoose(o) ? "" : ` · ${t("contract.noEmail")}`}
                      </option>
                    ))}
                  </select>
                  <button disabled={!chosen || !canChoose(chosen)} onClick={() => setWriting(true)} className={btn.primary}>
                    <FileSignature size={16} aria-hidden /> {t("contract.write")}
                  </button>
                </div>
              )}
            </div>

            {issue.status === "fixed" && (
              <div className="space-y-3 border-t border-line pt-5">
                {issue.after_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl(issue.after_image)!} alt={t("issue.after")} className="h-40 w-full rounded-[6px] object-cover" />
                )}
                <p className="text-sm text-ink-2">{t("office.waiting")}</p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3 border-t border-line pt-5">
            {issue.after_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl(issue.after_image)!} alt={t("issue.after")} className="h-40 w-full rounded-[6px] object-cover" />
            )}
            {issue.status === "resolved" ? (
              <p className="flex items-center gap-2 text-sm font-medium text-brand">
                <CircleCheck size={16} />{" "}
                {t("admin.resolvedBy", { when: issue.resolved_at ? timeAgo(issue.resolved_at) : "", office: issue.assigned_team ?? "" })}
              </p>
            ) : (
              <p className="text-sm text-muted">{t("office.closedUnconfirmed")}</p>
            )}
          </div>
        )}
        {err && <div className="text-sm font-medium text-danger-ink">{err}</div>}
      </div>
    </Card>
  );
}
