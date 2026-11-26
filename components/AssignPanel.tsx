"use client";

import { FileSignature, HardHat } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ContractState, ContractTerms, WithdrawButton, type Contract } from "@/components/ContractCard";
import ContractForm from "@/components/ContractForm";
import { btn, field } from "@/components/ui";
import { api } from "@/lib/client";
import { t } from "@/lib/i18n";
import { useMe } from "@/lib/me";
import type { Issue } from "@/lib/types";

interface SuggestedOffice {
  id: number;
  name: string;
  distance: number;
  /** Someone can sign in as this Business to answer a contract. */
  has_email: boolean;
}

/**
 * The Authority gives an Issue to a Business: pick one of the nearby Businesses that fix this kind of problem,
 * write the contract, and see where it stands. Used in the Reports queue and on the Issue's own page.
 */
export default function AssignPanel({ issue, onChanged }: { issue: Issue; onChanged: () => void }) {
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
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-base font-semibold">
        <HardHat size={18} className="text-muted" aria-hidden /> {t("contract.panelTitle")}
      </div>
      {issue.status !== "open" ? (
        <p className="text-sm text-muted">{issue.assigned_team ? t("admin.assignedTo", { office: issue.assigned_team }) : t("admin.notOpen")}</p>
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
      {err && <div className="text-sm font-medium text-danger-ink">{err}</div>}
    </div>
  );
}
