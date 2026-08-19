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
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4">
        <div className="w-full max-w-7xl mx-auto p-4">
          <FundRequest />
        </div>
      </div>
    </div>
  );
}
