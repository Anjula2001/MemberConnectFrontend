"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { DORMANT_BOARD_ROLES, hasRole } from "@/lib/permissions";
import {
  formatDormantDate,
  getDormantApprovalList,
  type DormantApprovalList,
} from "@/lib/api/dormant";

/**
 * MMD16 / SRS 6.2 — the "Inactivation Approval List for Dormant Members" report.
 *
 * A real route rather than the window.print() of a hand-built HTML string this
 * replaces, for the same reasons every other module has one: the sheet is a
 * formal board document, it needs a stable URL so it can be reopened and
 * re-printed after the meeting, and building it as markup means the Approve and
 * Reject columns are laid out once rather than assembled by string concatenation.
 *
 * Printed BEFORE the meeting, so the decision columns are deliberately blank
 * boxes for the board to mark by hand. The signed sheet then comes back as the
 * upload on the MMD17 confirmation step.
 */
export default function DormantApprovalListPrintPage() {
  const params = useParams<{ listId: string }>();
  const listId = params?.listId;
  const { user } = useAuth();

  const [list, setList] = useState<DormantApprovalList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const canPrint = hasRole(user?.role, DORMANT_BOARD_ROLES);

  useEffect(() => {
    if (!listId || !canPrint) {
      setLoading(false);
      return;
    }
    getDormantApprovalList(listId)
      .then(setList)
      .catch(() => setError("Could not load this Inactivation Approval List."))
      .finally(() => setLoading(false));
  }, [listId, canPrint]);

  if (user && !canPrint) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert className="h-8 w-8 text-[#953002]" />
        <h2 className="text-xl font-bold text-neutral-800">Access Restricted</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          This report is restricted to Head Office and Board Secretariat personnel.
        </p>
      </div>
    );
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading report...</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!list) return <div className="p-6 text-sm text-muted-foreground">No list found.</div>;

  return (
    <div className="print-root bg-white p-8 text-black">
      <style>{`
        @page { size: A4 landscape; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          .print-root { padding: 0 !important; }
        }
        .rpt { width: 100%; border-collapse: collapse; font-size: 11px; }
        .rpt th, .rpt td { border: 1px solid #999; padding: 5px 6px; text-align: left; }
        .rpt th { background: #f0f0f0; font-weight: 600; }
        .mark-box { width: 46px; height: 18px; border: 1px solid #666; display: inline-block; }
      `}</style>

      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={() => window.print()}
          className="rounded bg-[#953002] px-4 py-2 text-sm text-white"
        >
          Print
        </button>
      </div>

      <div className="mb-4 text-center">
        <h1 className="text-lg font-bold">Future Finance Institute</h1>
        <h2 className="text-base font-semibold">
          Inactivation Approval List for Dormant Members
        </h2>
      </div>

      <div className="mb-3 flex justify-between text-xs">
        <span>
          <b>List ID:</b> {list.listId}
        </span>
        <span>
          <b>Board Meeting Date:</b> {formatDormantDate(list.boardMeetingDate)}
        </span>
        <span>
          <b>Total Members:</b> {list.members.length}
        </span>
      </div>

      <table className="rpt">
        <thead>
          <tr>
            <th style={{ width: "32px" }}>#</th>
            <th>Member ID</th>
            <th>Name with Initials</th>
            <th>NIC</th>
            <th>Location</th>
            <th>Last Activity</th>
            <th>Selected for Dormant</th>
            <th style={{ width: "60px" }}>Approve</th>
            <th style={{ width: "60px" }}>Reject</th>
          </tr>
        </thead>
        <tbody>
          {list.members.map((m, i) => (
            <tr key={m.memberId}>
              <td>{i + 1}</td>
              <td>
                {m.memberId}
                {/* Matches the on-screen warning, so the board sees it on paper too. */}
                {m.hasIndirectObligations && " (O)"}
                {m.activitySinceListing && " (A)"}
              </td>
              <td>{m.nameWithInitials || m.fullName}</td>
              <td>{m.nic}</td>
              <td>{m.location}</td>
              <td>{formatDormantDate(m.lastActivityDate)}</td>
              <td>{formatDormantDate(m.dormantSelectionDate)}</td>
              <td>
                <span className="mark-box" />
              </td>
              <td>
                <span className="mark-box" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 text-[10px] text-neutral-600">
        (O) indirect loan obligation &middot; (A) account activity recorded since this
        list was prepared
      </p>

      <div className="mt-12 flex justify-between text-xs">
        <div className="w-1/3 text-center">
          <div className="mx-6 border-t border-black pt-1">Prepared by</div>
        </div>
        <div className="w-1/3 text-center">
          <div className="mx-6 border-t border-black pt-1">Board Secretary</div>
        </div>
        <div className="w-1/3 text-center">
          <div className="mx-6 border-t border-black pt-1">Chairperson</div>
        </div>
      </div>
    </div>
  );
}
