"use client";

import ContractList from "@/components/ContractCard";
import Gate from "@/components/Gate";

/** Contracts the city offers this Business: accept (the job is then its own) or decline. */
export default function OfficeContractsPage() {
  return (
    <Gate roles={["office"]} next="/office/contracts">
      <ContractList side="office" />
    </Gate>
  );
}
