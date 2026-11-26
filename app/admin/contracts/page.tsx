"use client";

import { Suspense } from "react";
import ContractList from "@/components/ContractCard";
import Gate from "@/components/Gate";
import { ListSkeleton } from "@/components/ui";

/** Contracts sent in the Authority's area: waiting for the Business, and answered. */
export default function AuthorityContractsPage() {
  return (
    <Gate roles={["authority"]} next="/admin/contracts">
      <Suspense fallback={<ListSkeleton />}>
        <ContractList side="authority" />
      </Suspense>
    </Gate>
  );
}
