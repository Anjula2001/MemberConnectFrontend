"use client";

import DocumentPrintScreen from "@/src/components/membership/DocumentPrintScreen";

export default function PrintPassbooksPage() {
  return (
    <DocumentPrintScreen
      documentType="PASSBOOK"
      title="Print Passbooks"
      description="Print member details onto pre-printed passbook stock (MR17)."
      printedAt={(m) => m.passbookPrintedAt}
      printRoute="passbook"
      withoutLabel="Members without Passbooks"
    />
  );
}
