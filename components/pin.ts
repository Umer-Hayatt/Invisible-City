import type { Status } from "@/lib/types";

/** The colour of an Issue's pin: red for a critical Issue still waiting, otherwise what stage it is at. */
export function pinColor(status: Status, critical: boolean) {
  if (critical) return "var(--color-danger)";
  switch (status) {
    case "open":
      return "var(--color-pin-open)";
    case "resolved":
      return "var(--color-pin-done)";
    case "closed_unconfirmed":
      return "var(--color-pin-closed)";
    default:
      return "var(--color-pin-work)";
  }
}
