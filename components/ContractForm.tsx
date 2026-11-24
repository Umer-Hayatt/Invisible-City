"use client";

import { FileSignature } from "lucide-react";
import { useId, useState } from "react";
import { btn, field } from "@/components/ui";
import { api } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

const inDays = (n: number) => {
  const d = new Date(Date.now() + n * 86_400_000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

/** The Authority writes the terms and sends them to one Business. The job is the Business's only once it accepts. */
export default function ContractForm({
  issueId,
  officeId,
  office,
  title,
  onSent,
  onCancel,
}: {
  issueId: number;
  officeId: number;
  office: string;
  /** The Issue's title, to start the scope from. */
  title: string;
  onSent: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [f, setF] = useState(() => ({
    scope: t("contract.scopeStart", { title }),
    pricePkr: "",
    startDate: inDays(1),
    finishDate: inDays(8),
    paymentTerms: "",
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api(`/api/issues/${issueId}/contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officeId, ...f }),
      });
      onSent();
    } catch (e) {
      setErr(errorText((e as Error).message));
      setBusy(false);
    }
  }

  const label = "mb-1 block text-sm font-semibold";
  return (
    <form onSubmit={send} className="space-y-3 rounded-[8px] border border-line bg-sunken/50 p-4">
      <div>
        <div className="flex items-center gap-2 text-base font-semibold">
          <FileSignature size={18} className="shrink-0 text-muted" aria-hidden /> {t("contract.formTitle", { office })}
        </div>
        <p className="mt-1 text-sm text-ink-2">{t("contract.formSub")}</p>
      </div>
      <div>
        <label className={label} htmlFor={`${id}-scope`}>
          {t("contract.scope")}
        </label>
        <textarea id={`${id}-scope`} value={f.scope} onChange={set("scope")} rows={3} required maxLength={2000} className={field} />
      </div>
      <div>
        <label className={label} htmlFor={`${id}-price`}>
          {t("contract.price")}
        </label>
        <input
          id={`${id}-price`}
          type="number"
          inputMode="numeric"
          min={0}
          max={1_000_000_000}
          step={1}
          dir="ltr"
          value={f.pricePkr}
          onChange={set("pricePkr")}
          className={field}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor={`${id}-start`}>
            {t("contract.start")}
          </label>
          <input id={`${id}-start`} type="date" value={f.startDate} onChange={set("startDate")} className={field} />
        </div>
        <div>
          <label className={label} htmlFor={`${id}-finish`}>
            {t("contract.finish")}
          </label>
          <input
            id={`${id}-finish`}
            type="date"
            required
            min={f.startDate || inDays(0)}
            value={f.finishDate}
            onChange={set("finishDate")}
            className={field}
          />
        </div>
      </div>
      <div>
        <label className={label} htmlFor={`${id}-pay`}>
          {t("contract.payment")}
        </label>
        <input
          id={`${id}-pay`}
          value={f.paymentTerms}
          onChange={set("paymentTerms")}
          maxLength={500}
          placeholder={t("contract.paymentPlaceholder")}
          className={field}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} className={btn.primary}>
          {t("contract.send")}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className={btn.ghost}>
          {t("office.cancel")}
        </button>
      </div>
      {err && <p className="text-sm font-medium text-danger-ink">{err}</p>}
    </form>
  );
}
