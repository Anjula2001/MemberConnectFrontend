"use client";

import { use, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  getDispatch,
  type MemberDocumentDispatchDTO,
} from "@/lib/api/membershipDocuments";
import { useAuth } from "@/lib/auth-context";
import { DISPATCH_ROLES, hasRole } from "@/lib/permissions";

const formatDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/**
 * Dispatch Report (spec 5.5) — the record of which members had their membership
 * documentation posted in a given dispatch. Rendered as a printed-template view,
 * consistent with the other reports in this module.
 */
export default function DispatchReportPage({
  params,
}: {
  params: Promise<{ dispatchNo: string }>;
}) {
  const { dispatchNo } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [dispatch, setDispatch] = useState<MemberDocumentDispatchDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDispatch(dispatchNo)
      .then((d) => !cancelled && setDispatch(d))
      .catch((e: unknown) =>
        !cancelled && setError(e instanceof Error ? e.message : "Failed to load the dispatch")
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dispatchNo]);

  if (user && !hasRole(user.role, DISPATCH_ROLES)) {
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

  if (error || !dispatch) {
    return (
      <div className="p-10 text-center text-sm text-red-600">
        {error ?? "Dispatch not found."}
      </div>
    );
  }

  const members = dispatch.members ?? [];

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          body { background: #fff !important; }
          .no-print, nav, aside, header, [data-sidebar] { display: none !important; }
          .print-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; }
          tr { page-break-inside: avoid; }
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
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <div className="print-sheet mx-4 mb-8 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm md:mx-6">
        <div className="border-b-2 border-[#953002] pb-4 text-center">
          <h1 className="text-xl font-bold tracking-tight text-[#953002]">
            Future Finance Institute
          </h1>
          <p className="mt-1 text-sm font-semibold text-neutral-700">
            Membership Documentation Dispatch Report
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
          {[
            ["Dispatch No", dispatch.dispatchNo],
            ["Dispatch Date", formatDate(dispatch.dispatchDate)],
            ["Members", String(dispatch.memberCount ?? members.length)],
            ["Dispatched By", dispatch.dispatchedBy],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">
                {label as string}
              </p>
              <p className="text-neutral-900">{(value as string) || "—"}</p>
            </div>
          ))}
        </div>

        <table className="mt-6 w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-neutral-100 text-left">
              {["#", "Member ID", "Name", "NIC", "Posting Address"].map((h) => (
                <th key={h} className="border border-neutral-300 px-2 py-1.5 font-semibold text-neutral-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.id ?? i}>
                <td className="border border-neutral-300 px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {m.memberId ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {m.nameWithInitials || m.fullName || "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {m.nic ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {m.permanentPrivateAddress ?? "—"}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="border border-neutral-300 px-2 py-4 text-center text-neutral-500">
                  No members in this dispatch.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-12 grid grid-cols-2 gap-8 text-[11px]">
          {["Dispatched By", "Received by Post Office"].map((role) => (
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
