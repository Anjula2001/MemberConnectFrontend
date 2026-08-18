"use client";

import DocumentPrintScreen from "@/src/components/membership/DocumentPrintScreen";

export default function PrintSignatureCardsPage() {
  return (
    <DocumentPrintScreen
      documentType="SIGNATURE_CARD"
      title="Print Signature Cards"
      description="Issue signature cards to be posted, signed and returned for scanning (MR16)."
      printedAt={(m) => m.signatureCardPrintedAt}
      printRoute="signature-card"
      withoutLabel="Members without Signature Cards"
    />
  );
}
