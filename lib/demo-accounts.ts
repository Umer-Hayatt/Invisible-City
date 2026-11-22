/** The four Demo accounts. Their rows are made by the seed script (db/seed-data.ts). */
export const DEMO_ACCOUNTS = {
  citizen: { email: "demo.citizen@invisible.city", name: "Demo Citizen", phone: "+92 300 0000001" },
  authority: { email: "demo.authority@invisible.city", name: "Demo Authority", phone: "+92 300 0000002" },
  office: { email: "demo.office@invisible.city", name: "Demo Office Staff", phone: "+92 300 0000003" },
  superAdmin: { email: "demo.superadmin@invisible.city", name: "Demo Super Admin", phone: "+92 300 0000004" },
} as const;

export type DemoKey = keyof typeof DEMO_ACCOUNTS;
export const DEMO_KEYS = Object.keys(DEMO_ACCOUNTS) as DemoKey[];
export const isDemoKey = (k: unknown): k is DemoKey => typeof k === "string" && (DEMO_KEYS as string[]).includes(k);

/** Seeded people rows use auth_id "demo-<key>". */
export const demoAuthId = (k: DemoKey) => `demo-${k}`;
