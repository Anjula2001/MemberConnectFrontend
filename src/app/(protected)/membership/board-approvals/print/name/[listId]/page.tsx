"use client";

import { use, useEffect, useState } from "react";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  getBoardApprovalListByListId,
  getNameChangeRequestsByListId,
  type BoardApprovalListDTO,
} from "@/lib/api/boardApprovalLists";
import { useAuth } from "@/lib/auth-context";
import { BOARD_GOVERNANCE_ROLES, hasRole } from "@/lib/permissions";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

/** Joins the parts of a name into one line, dropping the blanks. */
const nameLine = (title?: string | null, full?: string | null) =>
  [title, full].filter(Boolean).join(" ") || "—";

/**
 * "Name Change Request List for Board Approval" report (Requirement 02, MMC11).
 *
 * Modelled on the Application List report: an on-screen printed-template view, laid
 * out landscape, with the Approve / Reject columns left blank because the sheet is
 * taken into the meeting and marked up by hand.
 *
 * The one difference that matters is the content. A membership application is judged
 * on its own; a name change is judged as a comparison, so every row prints the current
 * name beside the requested one. Without that the board is approving a new name with
 * nothing to weigh it against.
 */
export default function NameChangeApprovalListPrintPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [list, setList] = useState<BoardApprovalListDTO | null>(null);
  const [requests, setRequests] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getBoardApprovalListByListId(listId),
      getNameChangeRequestsByListId(listId),
    ])
      .then(([listData, reqs]) => {
        if (cancelled) return;
        setList(listData);
        setRequests((reqs ?? []) as Record<string, unknown>[]);
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

  if (user && !hasRole(user.role, BOARD_GOVERNANCE_ROLES)) {
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
        {error ?? "Approval list not found."}
      </div>
    );
  }

  const str = (row: Record<string, unknown>, key: string) => {
    const v = row[key];
    return typeof v === "string" && v.trim() ? v : null;
  };

  return (
    <>
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
        <div className="border-b-2 border-[#9e3600] pb-4 text-center">
          <h1 className="text-xl font-bold tracking-tight text-[#9e3600]">
            Future Finance Institute
          </h1>
          <p className="mt-1 text-sm font-semibold text-neutral-700">
            Name Change Request List for Board Approval
          </p>
        </div>

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

        <table className="mt-6 w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-neutral-100 text-left">
              {[
                "#",
                "Request ID",
                "Member ID",
                "NIC",
                "Current Name",
                "Current Name with Initials",
                "Requested Name",
                "Requested Name with Initials",
                "Requested Name as in Payroll",
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
            {requests.map((row, i) => (
              <tr key={String(row.nameChangeRequestID ?? i)}>
                <td className="border border-neutral-300 px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {str(row, "requestNo") ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {str(row, "memberId") ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {str(row, "memberNic") ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {nameLine(str(row, "oldTitle"), str(row, "oldFullName"))}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {str(row, "oldNameWithInitials") ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 font-semibold">
                  {nameLine(str(row, "newTitle"), str(row, "newFullName"))}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 font-semibold">
                  {str(row, "newNameWithInitials") ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {str(row, "newNameAsInPayroll") ?? "—"}
                </td>
                {/* Left blank deliberately — marked by hand at the meeting. */}
                <td className="border border-neutral-300 px-2 py-1.5" />
                <td className="border border-neutral-300 px-2 py-1.5" />
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="border border-neutral-300 px-2 py-4 text-center text-neutral-500"
                >
                  No name change requests in this list.
                </td>
              </tr>
            )}
          </tbody>
        </table>

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
