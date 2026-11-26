import type { Metadata } from "next";
import Prototype from "./Prototype";

// Throwaway clickable prototype (docs/PLAN.md step 0). Delete app/prototype/ once the layouts are approved.
export const metadata: Metadata = { title: "Prototype · Civora" };

export default function PrototypePage() {
  return <Prototype />;
}
