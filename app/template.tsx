import { PageTransition } from "@/components/animate";

/**
 * Remounts on every navigation, so each page arrives with a short fade and rise (PageTransition). The bars, the
 * sidebar and the footer live in the layout and stay put. Quick for the workspace pages, a little longer elsewhere.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
