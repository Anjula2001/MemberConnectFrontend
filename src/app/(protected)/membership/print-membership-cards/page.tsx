"use client";

import DocumentPrintScreen from "@/src/components/membership/DocumentPrintScreen";

export default function PrintMembershipCardsPage() {
  return (
    <DocumentPrintScreen
      documentType="MEMBERSHIP_CARD"
      title="Print Membership Cards"
      description="Issue membership cards for activated members (MR15)."
      printedAt={(m) => m.membershipCardPrintedAt}
      printRoute="membership-card"
      withoutLabel="Members without Membership Cards"
    />
  );
}
