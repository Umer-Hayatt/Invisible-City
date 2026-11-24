"use client";

import ContractList from "@/components/ContractCard";
import Gate from "@/components/Gate";

/** Contracts sent in the Authority's area: waiting for the Business, and answered. */
export default function AuthorityContractsPage() {
  return (
    <Gate roles={["authority"]} next="/admin/contracts">
      <ContractList side="authority" />
    </Gate>
  );
}
