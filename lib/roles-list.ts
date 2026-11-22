/** The four roles, kept free of server code so screens can import it. */
export const ROLES = ["citizen", "authority", "office", "super_admin"] as const;
export type Role = (typeof ROLES)[number];
