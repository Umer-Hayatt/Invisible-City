"use client";

import { Suspense } from "react";
import ContractList from "@/components/ContractCard";
import Gate from "@/components/Gate";
import { ListSkeleton } from "@/components/ui";

/** Contracts the city offers this Business: accept (the job is then its own) or decline. */
export default function OfficeContractsPage() {
  return (
    <Gate roles={["office"]} next="/office/contracts">
      <Suspense fallback={<ListSkeleton />}>
        <ContractList side="office" />
      </Suspense>
    </Gate>
  );
}
