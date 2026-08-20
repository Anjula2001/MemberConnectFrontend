"use client";

import { use, useEffect, useState } from "react";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  getTerminationApprovalListByListId,
  getTerminationApprovalListRequests,
  type TerminationApprovalListDTO,
} from "@/lib/api/terminationApprovalLists";
import type { TerminationRequestResponse } from "@/lib/api/terminationRequests";
import { useAuth } from "@/lib/auth-context";
import { TERMINATION_BOARD_ROLES, hasRole } from "@/lib/permissions";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/**
 * "Termination Request List for Board Approval" report (SRS MMT08, section 5.1).
 *
 * Rendered as an on-screen printed-template view rather than a server-generated
 * PDF — per the spec's assumptions the system only has to present the printable
 * layout, not drive a physical device. The Approve / Reject columns are
 * deliberately blank: this sheet is taken into the Board Meeting and marked up
 * by hand, then the outcome is keyed back in through MMT09.
 */
export default function TerminationApprovalListPrintPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [list, setList] = useState<TerminationApprovalListDTO | null>(null);
  const [requests, setRequests] = useState<TerminationRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getTerminationApprovalListByListId(listId),
      getTerminationApprovalListRequests(listId),
    ])
      .then(([listData, listRequests]) => {
        if (cancelled) return;
        setList(listData);
        setRequests(listRequests);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load the approval list");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listId]);

  if (user && !hasRole(user.role, TERMINATION_BOARD_ROLES)) {
    return (
      <div className="p-10 text-center text-sm text-neutral-500">
        You do not have permission to view this report.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="p-10 text-center text-sm text-red-600">
        {error ?? "Termination approval list not found."}
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
            Termination Request List for Board Approval
          </p>
        </div>

        {/* Meeting particulars */}
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
          {[
            ["List ID", list.listId],
            ["Board Meeting Date", formatDate(list.boardMeetingDate)],
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
                "Name with Initials",
                "NIC",
                "Termination Reason",
                "Requested Date",
                "Effective Date",
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
                  {request.requestNo ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {request.memberId ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {request.nameWithInitials || request.memberFullName || "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {request.nic ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {request.terminationReason ?? "—"}
                  {/* The board needs to see an unresolved obligation before it
                      votes, not after — these are the same two flags the list
                      screen shows as icons. */}
                  {request.hasLoanBalance && (
                    <span className="ml-1 font-bold text-amber-700">(L)</span>
                  )}
                  {request.hasIndirectObligations && (
                    <span className="ml-1 font-bold text-red-600">(O)</span>
                  )}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {formatDate(request.requestedDate)}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {formatDate(request.effectiveDate)}
                </td>
                {/* Left blank deliberately — marked by hand at the meeting. */}
                <td className="border border-neutral-300 px-2 py-1.5" />
                <td className="border border-neutral-300 px-2 py-1.5" />
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="border border-neutral-300 px-2 py-4 text-center text-neutral-500"
                >
                  No termination requests in this list.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {requests.some((r) => r.hasLoanBalance || r.hasIndirectObligations) && (
          <p className="mt-2 text-[10px] text-neutral-600">
            <span className="font-bold text-amber-700">(L)</span> — outstanding loan balance
            {"   "}
            <span className="ml-3 font-bold text-red-600">(O)</span> — indirect loan obligation
            (nominee on another member&apos;s active loan)
          </p>
        )}

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
