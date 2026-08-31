"use client";

import { use, useEffect, useState } from "react";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  getBoardApprovalListByListId,
  getBoardApprovalListApplications,
  type BoardApprovalListDTO,
} from "@/lib/api/boardApprovalLists";
import type { MemberApplicationDTO } from "@/lib/api/memberApplications";
import { useAuth } from "@/lib/auth-context";
import { BOARD_GOVERNANCE_ROLES, hasRole } from "@/lib/permissions";

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/**
 * "Application List for Board Approval" report (spec 5.1).
 *
 * Rendered as an on-screen printed-template view — per the spec's assumptions the
 * system only has to present the printable layout, not drive a physical device.
 * The Decision / Signature columns are intentionally blank: this sheet is taken
 * into the Board Meeting and marked up by hand.
 */
export default function BoardApprovalListPrintPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [list, setList] = useState<BoardApprovalListDTO | null>(null);
  const [applications, setApplications] = useState<MemberApplicationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getBoardApprovalListByListId(listId),
      getBoardApprovalListApplications(listId),
    ])
      .then(([listData, apps]) => {
        if (cancelled) return;
        setList(listData);
        setApplications(apps);
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
          className="flex items-center gap-2 text-sm text-neutral-600 hover:text-[#953002]"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-[#953002] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7a2700]"
        >
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      <div className="print-sheet mx-4 mb-8 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm md:mx-6">
        {/* Letterhead */}
        <div className="border-b-2 border-[#953002] pb-4 text-center">
          <h1 className="text-xl font-bold tracking-tight text-[#953002]">
            Future Finance Institute
          </h1>
          <p className="mt-1 text-sm font-semibold text-neutral-700">
            Application List for Board Approval
          </p>
        </div>

        {/* Meeting particulars */}
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
          {[
            ["List ID", list.listId],
            ["Board Meeting Date", formatDate(list.boardMeetingDate)],
            ["Total Applications", String(applications.length)],
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

        {/* Applications */}
        <table className="mt-6 w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-neutral-100 text-left">
              {[
                "#",
                "Application ID",
                "Name with Initials",
                "NIC",
                "Designation",
                "Working Location",
                "District / Zone",
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
            {applications.map((app, i) => (
              <tr key={app.id ?? i}>
                <td className="border border-neutral-300 px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {app.applicationID ?? "—"}
                  {app.rejoinFlag && (
                    <span className="ml-1 font-bold text-red-600" title="Rejoin application">
                      (R)
                    </span>
                  )}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {app.nameWithInitials || app.fullName || "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {app.nicNumber ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">{app.designation ?? "—"}</td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {app.workingLocation ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {[app.educationalDistrict, app.educationalZone].filter(Boolean).join(" / ") || "—"}
                </td>
                {/* Left blank deliberately — marked by hand at the meeting. */}
                <td className="border border-neutral-300 px-2 py-1.5" />
                <td className="border border-neutral-300 px-2 py-1.5" />
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="border border-neutral-300 px-2 py-4 text-center text-neutral-500"
                >
                  No applications in this list.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {applications.some((a) => a.rejoinFlag) && (
          <p className="mt-2 text-[10px] text-neutral-600">
            <span className="font-bold text-red-600">(R)</span> — Rejoin: applicant was
            previously a terminated member.
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
