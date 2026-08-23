"use client";

import { use, useEffect, useState } from "react";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";

const API_BASE_URL = "http://localhost:8080";

interface ApprovalList {
  id: number;
  listId: string;
  boardMeetingDate: string;
  actualMeetingDate?: string;
  status: string;
  type: string;
  createdAt: string;
}

interface ScholarshipRequest {
  id: number;
  requestNo: string;
  memberId: string;
  studentName: string;
  marksObtained: number;
  disbursementOption: string;
  status: string;
}

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

// use for print approval list 
export default function Grade5ApprovalListPrintPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [list, setList] = useState<ApprovalList | null>(null);
  const [requests, setRequests] = useState<ScholarshipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [listRes, requestsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/grade5/approval-lists/all`),
          fetch(
            `${API_BASE_URL}/api/grade5/approval-lists/${encodeURIComponent(
              listId
            )}/requests`
          ),
        ]);

        if (!listRes.ok || !requestsRes.ok) {
          throw new Error("Failed to load the approval list");
        }

        const allLists: ApprovalList[] = await listRes.json();
        const listRequests: ScholarshipRequest[] = await requestsRes.json();

        if (cancelled) return;

        setList(allLists.find((l) => l.listId === listId) ?? null);
        setRequests(listRequests);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load the approval list"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [listId]);

  if (user && !hasPermission(user.role, "G5_LIST_PRINT")) {
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
        {error ?? "Grade 5 approval list not found."}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 12mm; }

        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
          }

          /* Release the shell's scroll containers - the clipping that printed blank. */
          body * {
            overflow: visible !important;
          }

          main {
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
          }

          /* App chrome and this page's own toolbar. The sidebar is position:fixed, so it
             would otherwise be stamped on top of the sheet. */
          .no-print,
          nav,
          aside,
          header,
          [data-sidebar="sidebar"],
          [data-sidebar="rail"],
          [data-sidebar="trigger"] {
            display: none !important;
          }

          .print-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

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
            Grade 5 Scholarship Request List for Board Approval
          </p>
        </div>

        {/* Meeting particulars */}
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-5">
          {[
            ["List ID", list.listId],
            ["List Type", list.type === "DEVIATION" ? "Deviation" : "Normal"],
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
                "Request No",
                "Member ID",
                "Student Name",
                "Marks Obtained",
                "Disbursement",
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
                <td className="border border-neutral-300 px-2 py-1.5 text-center">
                  {i + 1}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {request.requestNo ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {request.memberId ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {request.studentName ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 text-center">
                  {request.marksObtained ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {request.disbursementOption ?? "—"}
                </td>
                {/* Left blank deliberately — marked by hand at the meeting. */}
                <td className="border border-neutral-300 px-2 py-1.5" />
                <td className="border border-neutral-300 px-2 py-1.5" />
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="border border-neutral-300 px-2 py-4 text-center text-neutral-500"
                >
                  No Grade 5 scholarship requests in this list.
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
