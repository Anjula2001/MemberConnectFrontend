"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";

import { authFetch } from "@/lib/api/authFetch";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import AccessRestricted from "@/src/components/AccessRestricted";

const API_BASE_URL = "http://localhost:8080";

type RequestRow = {
  id: number;
  requestId?: string;
  studentName?: string;
  memberName?: string;
  memberId?: string;
  universityName?: string;
  nic?: string;
  approvalListId?: string;
  scheduledDate?: string;
  boardMeetingName?: string;
};

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/**
 * "University Scholarship Request List for Board Approval" report.
 *
 * A dedicated report route, matching the Grade 5, Termination and Dormant approval
 * lists. The Print button on the approvals screen used to call window.print() on the
 * live page, which printed the sidebar, the tab bar and the search panel along with it.
 *
 * The list has no endpoint of its own - requests carry their approvalListId - so the
 * sheet is assembled by filtering the scholarship requests on that id, which is how the
 * approvals screen groups them too.
 *
 * Approve and Reject are left blank: the sheet is marked by hand at the meeting and the
 * outcome keyed back in afterwards.
 */
export default function UniversityApprovalListPrintPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const canPrint = hasPermission(user?.role, "US_LIST_PRINT");

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/university-scholarships`);
        if (!res.ok) throw new Error("Could not load the approval list.");

        const all: RequestRow[] = await res.json();
        if (cancelled) return;
        setRequests(all.filter((r) => r.approvalListId === listId));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load the approval list.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [listId]);

  const isDeviation = listId.startsWith("USDL-");
  const meetingDate = requests[0]?.scheduledDate;

  if (user && !canPrint) {
    return (
      <AccessRestricted
        message="Printing University Scholarship approval lists is restricted to board roles."
        fallbackHref="/scholarships/university/approvals"
        fallbackLabel="Back to Approval Lists"
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-neutral-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading report…
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <>
      {/* Print rules: hide the app chrome and this toolbar, and lay the sheet out
          landscape so the table columns fit without wrapping. */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body { background: #fff !important; }
          .no-print, nav, aside, header, [data-sidebar] { display: none !important; }
          .print-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between px-4 pt-4 md:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-neutral-600 hover:text-[#9d3602]"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-[#9e3600] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8b2f00]"
        >
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      <div className="print-sheet mx-4 mb-8 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm md:mx-6">
        {/* Letterhead */}
        <div className="border-b-2 border-[#9e3600] pb-4 text-center">
          <h1 className="text-xl font-bold tracking-tight text-[#9e3600]">
            Future Finance Institute
          </h1>
          <p className="mt-1 text-sm font-semibold text-neutral-700">
            University Scholarship Request List for Board Approval
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {isDeviation ? "Deviation Board Approval" : "Normal Board Approval"}
          </p>
        </div>

        {/* Meeting particulars */}
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
          {[
            ["List ID", listId],
            ["Board Meeting Date", formatDate(meetingDate)],
            ["Total Requests", String(requests.length)],
            ["Printed On", formatDate(new Date().toISOString())],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">
                {label}
              </p>
              <p className="text-neutral-900">{value || "—"}</p>
            </div>
          ))}
        </div>

        {/* Requests */}
        <table className="mt-6 w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-neutral-100 text-left">
              {[
                "#",
                "Request ID",
                "Member ID",
                "Member Name",
                "Student Name",
                "NIC",
                "University",
                "Approve",
                "Reject",
              ].map((h) => (
                <th
                  key={h}
                  className="border border-neutral-300 px-2 py-1.5 font-semibold text-neutral-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map((request, i) => (
              <tr key={request.id ?? i}>
                <td className="border border-neutral-300 px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {request.requestId ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {request.memberId ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {request.memberName ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {request.studentName ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {request.nic ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {request.universityName ?? "—"}
                </td>
                {/* Left blank deliberately — marked by hand at the meeting. */}
                <td className="border border-neutral-300 px-2 py-1.5" />
                <td className="border border-neutral-300 px-2 py-1.5" />
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="border border-neutral-300 px-2 py-4 text-center text-neutral-500"
                >
                  No scholarship requests in this list.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Board sign-off */}
        <div className="mt-12 grid grid-cols-3 gap-8 text-[11px]">
          {["Secretary", "Chairperson", "Board Member"].map((role) => (
            <div key={role}>
              <div className="h-10 border-b border-neutral-400" />
              <p className="mt-1 text-neutral-600">{role}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
