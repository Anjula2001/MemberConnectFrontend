"use client";

import FundRequest from "@/src/components/UniSholarships/FundRequest";
import { useAuth } from "@/lib/auth-context";
import { canAccessFundRequests } from "@/lib/permissions";
import AccessRestricted from "@/src/components/AccessRestricted";

export default function FundRequestsPage() {
  const { user } = useAuth();

  if (user && !canAccessFundRequests(user.role)) {
    return (
      <AccessRestricted
        message="University Scholarship Fund Requests are restricted to Head Office, Board Secretariat, Scholarship and Accounts personnel."
        fallbackHref="/membership/directory"
        fallbackLabel="Back to Member Directory"
      />
    );
  }

  return (
    /*
     * h-full on the wrapper and flex-1 on the panel, NOT min-h-screen.
     *
     * <main> is already shorter than the viewport — the 64px top header sits above it
     * and it carries p-6 of its own — so a panel with min-height:100vh is taller than
     * the space it lives in by construction. Whenever the content is shorter than the
     * viewport that forced height became scrollable emptiness below the form: measured
     * at 264px of dead scroll on a 2000px-tall window, where the panel was stretched
     * from its natural 1744px to a full 2000px.
     *
     * h-full resolves against <main>, which has a definite height as a flex item, so
     * the panel fills exactly the space available and no more. flex-1 still lets it
     * grow past that when the form really is longer, which is when scrolling is real.
     */
    <div className="flex h-full flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex-1 rounded-xl bg-muted/50 p-4">
        <div className="w-full max-w-7xl mx-auto p-4">
          <FundRequest />
        </div>
      </div>
    </div>
  );
}
