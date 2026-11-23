import { ViewTransition } from "react";

/**
 * Remounts on every navigation, so each page arrives and leaves with the "page" view transition
 * (fade, slight rise, soft blur; see Motion in globals.css). The Nav and footer live in the layout and stay put.
 * Browsers without the View Transitions API simply switch pages as before.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
