"use client";

import { useCallback, useEffect, useState } from "react";
import type { Role } from "./roles-list";

export interface Me {
  role: Role;
  email: string | null;
  displayName: string | null;
  phone: string | null;
  profileComplete: boolean;
  suspended: boolean;
  isDemo: boolean;
  officeId: number | null;
  demoKey: string | null;
}

export interface MeState {
  loading: boolean;
  me: Me | null;
  demoMode: boolean;
  demoAccounts: { key: string; name: string }[];
  refresh: () => void;
}

/** Who the server says you are. For deciding what to show; the API still checks every command itself. */
export function useMe(): MeState {
  const [state, setState] = useState<Omit<MeState, "refresh">>({ loading: true, me: null, demoMode: false, demoAccounts: [] });
  const load = useCallback(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setState({ loading: false, me: d.me, demoMode: !!d.demoMode, demoAccounts: d.demoAccounts ?? [] }))
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, []);
  useEffect(load, [load]);
  return { ...state, refresh: load };
}

/** After sign-in, sign-out, a Demo switch or a profile save: reload so every screen sees the new session. */
export function sessionChanged(to?: string) {
  if (to) window.location.assign(to);
  else window.location.reload();
}
