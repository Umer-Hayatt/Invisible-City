/**
 * The Demo accounts. Their rows are made by the seed script (db/seed-data.ts). The Demo shows one area, G-9: the
 * Authority is approved for it, and three Businesses of different Departments work in it.
 */
export const DEMO_ACCOUNTS = {
  citizen: { email: "demo.citizen@invisible.city", name: "Demo Citizen", phone: "+92 300 0000001" },
  authority: { email: "demo.authority@invisible.city", name: "Demo Authority", phone: "+92 300 0000002" },
  /** The Roads Business (kept as "office" from before there were three). */
  office: { email: "demo.office@invisible.city", name: "Demo Roads Business", phone: "+92 300 0000003" },
  officeSanitation: { email: "demo.sanitation@invisible.city", name: "Demo Sanitation Business", phone: "+92 300 0000005" },
  officeElectrical: { email: "demo.electrical@invisible.city", name: "Demo Electrical Business", phone: "+92 300 0000006" },
  superAdmin: { email: "demo.superadmin@invisible.city", name: "Demo Super Admin", phone: "+92 300 0000004" },
} as const;

/** The one area the Demo Authority is approved for. */
export const DEMO_AREA = "G-9";

export type DemoKey = keyof typeof DEMO_ACCOUNTS;
export const DEMO_KEYS = Object.keys(DEMO_ACCOUNTS) as DemoKey[];
export const isDemoKey = (k: unknown): k is DemoKey => typeof k === "string" && (DEMO_KEYS as string[]).includes(k);

/** The three Demo Businesses: account, Department and the name of the Office the seed gives it. */
export const DEMO_BUSINESSES = [
  { key: "office", department: "Roads", name: "Roads Sub-division G-9" },
  { key: "officeSanitation", department: "Sanitation", name: "Sanitation Depot G-9" },
  { key: "officeElectrical", department: "Electrical", name: "Electrical Works G-9" },
] as const satisfies readonly { key: DemoKey; department: string; name: string }[];

/** Seeded people rows use auth_id "demo-<key>". */
export const demoAuthId = (k: DemoKey) => `demo-${k}`;
