"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";

import { searchMembers, type MemberDTO } from "@/lib/api/member";
import { useAuth } from "@/lib/auth-context";
import { REGISTRATION_ROLES, hasRole } from "@/lib/permissions";

const formatDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/**
 * Member Profile Search Report (spec 5.4).
 *
 * Re-runs the Membership Profile Search with the filters passed in the URL, so the
 * report always matches what the Member Directory was showing — and stays
 * shareable/bookmarkable rather than depending on in-memory state.
 *
 * Columns deliberately mirror the directory table, as the spec requires the report
 * to show the same information as the screen.
 */
export default function MemberProfileSearchReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rebuild the exact search the directory ran.
  const criteria = useMemo(() => {
    const statuses = searchParams.getAll("statuses");
    const locations = searchParams.getAll("locations");
    return {
      query: searchParams.get("query") || undefined,
      statuses: statuses.length > 0 ? statuses : undefined,
      locations: locations.length > 0 ? locations : undefined,
      workingLocationType: searchParams.get("workingLocationType") || undefined,
      educationalZone: searchParams.get("educationalZone") || undefined,
      educationalDistrict: searchParams.get("educationalDistrict") || undefined,
      membershipStartFrom: searchParams.get("membershipStartFrom") || undefined,
      membershipStartTo: searchParams.get("membershipStartTo") || undefined,
    };
  }, [searchParams]);

  const sortBy = searchParams.get("sortBy") || "membership-date";
  // Mirror the directory's direction so the printed report matches the screen.
  const sortAsc = searchParams.get("sortDirection") !== "desc";

  useEffect(() => {
    let cancelled = false;
    searchMembers(criteria)
      .then((data) => {
        if (cancelled) return;
        const sorted = [...data].sort((a, b) => {
          let cmp = 0;
          if (sortBy === "memberID") cmp = (a.memberId ?? "").localeCompare(b.memberId ?? "");
          else if (sortBy === "status") cmp = (a.status ?? "").localeCompare(b.status ?? "");
          else cmp = (a.membershipStartDate ?? "").localeCompare(b.membershipStartDate ?? "");
          return sortAsc ? cmp : -cmp;
        });
        setMembers(sorted);
      })
      .catch((e: unknown) =>
        !cancelled && setError(e instanceof Error ? e.message : "Failed to load members")
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [criteria, sortBy, sortAsc]);

  // Human-readable summary of the filters, so a printed copy is self-explanatory.
  const appliedFilters = useMemo(() => {
    const parts: string[] = [];
    if (criteria.query) parts.push(`Search: "${criteria.query}"`);
    if (criteria.statuses) parts.push(`Status: ${criteria.statuses.join(", ")}`);
    if (criteria.locations) parts.push(`Location: ${criteria.locations.join(", ")}`);
    if (criteria.workingLocationType) parts.push(`Working Location Type: ${criteria.workingLocationType}`);
    if (criteria.educationalDistrict) parts.push(`Educational District: ${criteria.educationalDistrict}`);
    if (criteria.educationalZone) parts.push(`Educational Zone: ${criteria.educationalZone}`);
    if (criteria.membershipStartFrom || criteria.membershipStartTo) {
      parts.push(
        `Membership Start: ${criteria.membershipStartFrom || "any"} to ${criteria.membershipStartTo || "any"}`
      );
    }
    return parts.length > 0 ? parts.join(" · ") : "No filters applied — all membership records";
  }, [criteria]);

  if (user && !hasRole(user.role, REGISTRATION_ROLES)) {
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

  if (error) {
    return <div className="p-10 text-center text-sm text-red-600">{error}</div>;
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
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
            Member Profile Search Report
          </p>
        </div>

        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between gap-6">
            <p className="text-neutral-600">
              <span className="text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">
                Criteria:{" "}
              </span>
              {appliedFilters}
            </p>
            <p className="shrink-0 text-neutral-600">
              <span className="text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">
                Printed:{" "}
              </span>
              {formatDate(new Date().toISOString())}
            </p>
          </div>
          <p className="text-neutral-900">
            <span className="text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">
              Records:{" "}
            </span>
            {members.length}
          </p>
        </div>

        <table className="mt-6 w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-neutral-100 text-left">
              {["#", "Member ID", "Name with Initials", "NIC", "Joined Date", "Location", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    className="border border-neutral-300 px-2 py-1.5 font-semibold text-neutral-700"
                  >
                    {h}
                  </th>
                )
              )}
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
                <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap">
                  {formatDate(m.membershipStartDate)}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">
                  {m.submissionLocation ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5">{m.status ?? "—"}</td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="border border-neutral-300 px-2 py-4 text-center text-neutral-500"
                >
                  No membership records match these criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
