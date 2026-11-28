"use client";

import { useEffect, useState } from "react";
import Gate from "@/components/Gate";
import { Card, PageHeader, PageSkeleton, btn, field } from "@/components/ui";
import { api } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import { officeKind } from "@/lib/office-kind";
import { useMe } from "@/lib/me";

interface Business {
  name: string;
  department: string;
  sector: string;
  workers: number;
  is_private: boolean;
  is_ngo: boolean;
  registration_number: string | null;
  website: string | null;
  active: number;
  phone: string | null;
}

export default function BusinessPage() {
  return (
    <Gate roles={["office"]} next="/office/business">
      <MyBusiness />
    </Gate>
  );
}

/**
 * The Business's own details, and how many workers it has. Workers with no active job are spare hands; Insights
 * flags a sector whose Businesses have spare hands while its Issues wait.
 */
function MyBusiness() {
  const { me } = useMe();
  const [b, setB] = useState<Business | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneMsg, setPhoneMsg] = useState("");
  useEffect(() => {
    api<{ office: Business }>("/api/office")
      .then((d) => {
        setB(d.office);
        setValue(String(d.office.workers));
        setPhone(d.office.phone ?? "");
      })
      .catch((e) => setMsg(errorText((e as Error).message)));
  }, []);
  if (!b) return msg ? <p className="mt-10 text-center text-danger-ink">{msg}</p> : <PageSkeleton />;
  const spare = Math.max(0, b.workers - b.active);

  const row = (label: string, value: React.ReactNode) => (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-ink-2">{label}</dt>
      <dd className="min-w-0 font-semibold">{value}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={b.name} sub={t("business.mineSub")} />
      <Card className="p-6">
        <dl className="divide-y divide-line text-base">
          {row(t("offices.department"), b.department)}
          {row(t("register.sector"), b.sector)}
          {row(t("business.kind"), t(officeKind(b)))}
          {b.is_ngo && b.registration_number && row(t("business.regNumber"), <span dir="ltr">{b.registration_number}</span>)}
          {b.is_ngo &&
            b.website &&
            row(
              t("business.website"),
              <a href={b.website} target="_blank" rel="noreferrer" dir="ltr" className="break-all text-brand hover:underline">
                {b.website}
              </a>,
            )}
          {row(
            t("business.email"),
            <span dir="ltr" className="break-all">
              {me?.email}
            </span>,
          )}
          {row(t("business.activeJobs"), b.active)}
        </dl>
      </Card>

      <Card className="flex flex-wrap items-end justify-between gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">{t("business.phone")}</h2>
          <p className="text-base text-ink-2">{t("business.phoneHint")}</p>
        </div>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setPhoneMsg("");
            try {
              const d = await api<{ phone: string }>("/api/office", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
              });
              setPhone(d.phone);
              setPhoneMsg(t("business.saved"));
            } catch (err) {
              setPhoneMsg(errorText((err as Error).message));
            }
          }}
        >
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            dir="ltr"
            placeholder={t("profile.phonePlaceholder")}
            aria-label={t("business.phone")}
            className={`${field} w-52`}
          />
          <button className={btn.dark}>{t("offices.save")}</button>
          {phoneMsg && <span className="text-sm text-ink-2">{phoneMsg}</span>}
        </form>
      </Card>

      <Card className="flex flex-wrap items-end justify-between gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">{t("office.workersTitle")}</h2>
          <p className="text-base text-ink-2">
            {b.workers ? t("office.workersLine", { spare, active: b.active }) : t("office.workersNone")}
          </p>
        </div>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg("");
            setSaved(false);
            try {
              const d = await api<{ workers: number }>("/api/office", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workers: Number(value) }),
              });
              setB({ ...b, workers: d.workers });
              setSaved(true);
            } catch (err) {
              setMsg(errorText((err as Error).message));
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            type="number"
            min={0}
            max={10000}
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={t("register.workers")}
            className={`${field} w-28`}
          />
          <button disabled={busy} className={btn.dark}>
            {t("offices.save")}
          </button>
          {saved && <span className="text-sm font-medium text-brand">{t("business.saved")}</span>}
          {msg && <span className="text-sm text-danger-ink">{msg}</span>}
        </form>
      </Card>
    </div>
  );
}
