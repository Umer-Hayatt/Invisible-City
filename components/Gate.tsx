"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, PageSkeleton, btn } from "@/components/ui";
import { t } from "@/lib/i18n";
import { useMe } from "@/lib/me";
import type { Role } from "@/lib/roles";

/**
 * Screen-level role check. It only decides what to show: the API checks the role again on every command.
 * `next` is where to come back to after signing in or finishing the profile.
 */
export default function Gate({
  roles,
  needProfile = false,
  next = "/",
  children,
}: {
  roles: Role[];
  needProfile?: boolean;
  next?: string;
  children: ReactNode;
}) {
  const { loading, me } = useMe();
  if (loading) return <PageSkeleton />;

  const box = (title: string, body: string, action: { href: string; label: string }) => (
    <Card className="mx-auto mt-10 max-w-md p-8 text-center">
      <Lock size={28} className="mx-auto text-muted" aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-base text-ink-2">{body}</p>
      <Link href={action.href} className={`${btn.primary} mt-6`}>
        {action.label}
      </Link>
    </Card>
  );

  if (!me)
    return box(t("gate.needSignIn"), t("gate.needSignInBody"), {
      href: `/signin?next=${encodeURIComponent(next)}`,
      label: t("gate.goSignIn"),
    });
  if (!roles.includes(me.role))
    return box(
      t("gate.forbidden"),
      t("gate.forbiddenBody", { role: t(`role.${me.role}`), allowed: roles.map((r) => t(`role.${r}`)).join(" / ") }),
      { href: "/", label: t("gate.goHome") },
    );
  if (me.suspended && needProfile) return box(t("gate.suspended"), t("gate.suspendedBody"), { href: "/", label: t("gate.goHome") });
  if (needProfile && !me.profileComplete)
    return box(t("gate.needProfile"), t("gate.needProfileBody"), {
      href: `/profile?next=${encodeURIComponent(next)}`,
      label: t("gate.goProfile"),
    });
  return <>{children}</>;
}
