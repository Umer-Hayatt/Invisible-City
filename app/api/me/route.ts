import { DEMO_ACCOUNTS, DEMO_KEYS } from "@/lib/demo-accounts";
import { currentActor } from "@/lib/roles";
import { demoMode, session } from "@/lib/session";

/** Who the server thinks you are. The screens use this only to decide what to show; the API enforces it. */
export async function GET() {
  const [actor, who] = await Promise.all([currentActor(), session()]);
  return Response.json({
    me: actor && {
      role: actor.role,
      email: actor.email,
      displayName: actor.displayName,
      phone: actor.phone,
      profileComplete: actor.profileComplete,
      suspended: actor.suspended,
      isDemo: actor.isDemo,
      officeId: actor.officeId,
      demoKey: who?.demoKey ?? null,
    },
    demoMode: demoMode(),
    demoAccounts: demoMode() ? DEMO_KEYS.map((k) => ({ key: k, name: DEMO_ACCOUNTS[k].name })) : [],
  });
}
