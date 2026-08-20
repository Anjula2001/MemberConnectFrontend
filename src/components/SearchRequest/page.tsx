"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Lock, Search } from "lucide-react";

import { getEducationalDistricts } from "@/lib/api/education";
import {
  detailRouteFor,
  searchProfileChanges,
  STATUS_LABELS,
  TYPE_LABELS,
  type ProfileChangeRow,
  type ProfileChangeSortBy,
  type ProfileChangeStatus,
  type ProfileChangeType,
  type RequestReceivedOn,
} from "@/lib/api/profileChanges";
import { useAuth } from "@/lib/auth-context";
import { MEMBER_REGISTRATION_ROLES, hasRole } from "@/lib/permissions";

/**
 * MMC28 — All Member Profile Change Requests List.
 *
 * One search and filter section for all five request types, replacing the separate
 * filter blocks that previously lived on this screen and on the Member Transfer
 * retrieve screen.
 *
 * Scope: this is a LIST/search screen only. Every row navigates into the detail
 * screen already owned by that module; no save, update, delete or approval logic
 * lives here, and none of those modules' controllers were changed to build it.
 *
 * Authorization reuses the existing mechanism — MEMBER_REGISTRATION_ROLES matches
 * the roles on ProfileChangeController's @PreAuthorize exactly. The backend remains
 * the enforcement point; this only decides what is rendered.
 *
 * Location is freely selectable for every role, including District Office. That is
 * deliberate and follows the decision recorded in ProfileChangeController: the client
 * settled that a District Office user searches all locations, because per MMC01 a
 * member may raise a request at any district regardless of where they work.
 */

const TYPE_OPTIONS: ProfileChangeType[] = [
  "BASIC_PROFILE",
  "NAME",
  "NOMINEE",
  "REMITTANCE",
  "MEMBER_TRANSFER",
];

const STATUS_OPTIONS: ProfileChangeStatus[] = [
  "SUBMITTED_FOR_APPROVAL",
  "APPROVED",
  "REJECTED",
  "INACTIVE",
];

const RECEIVED_ON_OPTIONS: { value: RequestReceivedOn; label: string }[] = [
  { value: "ALL_DAYS", label: "All Days" },
  { value: "THIS_MONTH", label: "This Month" },
  { value: "THIS_AND_LAST_MONTH", label: "This and Last Month" },
  { value: "DATE_PERIOD", label: "Date Period" },
];

const SORT_OPTIONS: { value: ProfileChangeSortBy; label: string }[] = [
  { value: "REQUESTED_DATE", label: "Requested Date" },
  { value: "STATUS", label: "Status" },
  { value: "MEMBER_ID", label: "Member ID" },
];

/** Small multi-select used by the Location and Status filters. */
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  renderLabel,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  renderLabel?: (value: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const summary =
    selected.length === 0
      ? "All"
      : selected.length === 1
        ? (renderLabel?.(selected[0]) ?? selected[0])
        : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <label className="mb-1.5 block text-sm font-semibold text-neutral-600">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700"
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
          {options.length === 0 && (
            <p className="px-3 py-2 text-xs text-neutral-400">No options available</p>
          )}
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-[#fdf5f2]"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggle(option)}
                className="accent-[#953002]"
              />
              <span className="truncate">{renderLabel?.(option) ?? option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfileChangeRequests() {
  const router = useRouter();
  const { user } = useAuth();
  const canAccess = hasRole(user?.role, MEMBER_REGISTRATION_ROLES);

  // ── Filters (MMC28) ──────────────────────────────────────────────────────
  const [type, setType] = useState<ProfileChangeType>("BASIC_PROFILE");
  const [locations, setLocations] = useState<string[]>([]);
  const [receivedOn, setReceivedOn] = useState<RequestReceivedOn>("ALL_DAYS");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  // MMC28: "By default, Submitted for Approval status will be selected."
  const [statuses, setStatuses] = useState<ProfileChangeStatus[]>(["SUBMITTED_FOR_APPROVAL"]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<ProfileChangeSortBy>("REQUESTED_DATE");
  const [ascending, setAscending] = useState(true);

  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [rows, setRows] = useState<ProfileChangeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRetrieved, setHasRetrieved] = useState(false);
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getEducationalDistricts()
      .then((districts) => {
        if (!cancelled) setDistrictOptions(districts);
      })
      .catch(() => {
        /* filter simply shows no options */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // No fetch on mount — the table stays empty until Retrieve is pressed, matching
  // the Member Directory and New Registrations screens.
  const handleRetrieve = async () => {
    if (receivedOn === "DATE_PERIOD" && fromDate && toDate && fromDate > toDate) {
      setDateError("From Date cannot be after To Date.");
      return;
    }
    setDateError("");
    setLoading(true);
    setError(null);
    try {
      const result = await searchProfileChanges({
        types: [type],
        statuses: statuses.length ? statuses : undefined,
        locations: locations.length ? locations : undefined,
        receivedOn,
        from: receivedOn === "DATE_PERIOD" && fromDate ? fromDate : undefined,
        to: receivedOn === "DATE_PERIOD" && toDate ? toDate : undefined,
        search: search || undefined,
        sortBy,
        descending: !ascending,
      });
      setRows(result);
      setHasRetrieved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retrieve requests.");
      setRows([]);
      setHasRetrieved(true);
    } finally {
      setLoading(false);
    }
  };

  const openRow = (row: ProfileChangeRow) => {
    const route = detailRouteFor(row);
    if (route) router.push(route);
  };

  if (user && !canAccess) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-800">Access Restricted</h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500">
          Member Profile Change Requests are available to District Office and Head Office
          personnel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#953002]">All Member Profile Change Requests</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Search every profile change request type from one place (MMC28).
        </p>
      </div>

      {/* ── The single Search &amp; Filter section ─────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-bold text-[#953002]">Search &amp; Filter</h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Type */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-600">Type</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as ProfileChangeType);
                setHasRetrieved(false);
                setRows([]);
              }}
              className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <MultiSelect
            label="Location"
            options={districtOptions}
            selected={locations}
            onChange={setLocations}
          />

          {/* Status */}
          <MultiSelect
            label="Status"
            options={STATUS_OPTIONS}
            selected={statuses}
            onChange={(next) => setStatuses(next as ProfileChangeStatus[])}
            renderLabel={(v) => STATUS_LABELS[v] ?? v}
          />

          {/* Request Received On */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-600">
              Request Received On
            </label>
            <select
              value={receivedOn}
              onChange={(e) => setReceivedOn(e.target.value as RequestReceivedOn)}
              className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700"
            >
              {RECEIVED_ON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* From / To — only meaningful for Date Period */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-600">From Date</label>
            <input
              type="date"
              value={fromDate}
              disabled={receivedOn !== "DATE_PERIOD"}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700 disabled:bg-neutral-100 disabled:text-neutral-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-600">To Date</label>
            <input
              type="date"
              value={toDate}
              disabled={receivedOn !== "DATE_PERIOD"}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700 disabled:bg-neutral-100 disabled:text-neutral-400"
            />
          </div>

          {/* Search — MMC28: Full Name, Name as in Payroll, Name with Initials,
              Member Number and NIC */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-neutral-600">
              Search Member
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Member name, Member number or NIC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleRetrieve()}
                className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-3 text-sm text-neutral-700"
              />
            </div>
          </div>

          {/* Sort + direction */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-600">Sort By</label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ProfileChangeSortBy)}
                className="h-10 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setAscending((v) => !v)}
                title={ascending ? "Ascending" : "Descending"}
                className="h-10 shrink-0 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
              >
                {ascending ? "Asc" : "Desc"}
              </button>
            </div>
          </div>
        </div>

        {dateError && <p className="mt-3 text-sm text-red-600">{dateError}</p>}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => void handleRetrieve()}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#953002] px-10 text-sm font-bold text-white hover:bg-[#7a2500] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retrieve"}
          </button>
        </div>
      </div>

      {/* ── One normalised result list ────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-neutral-100 bg-[#fdfdfd] text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Request No</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Member ID</th>
                <th className="px-4 py-3 font-semibold">Member Name</th>
                <th className="px-4 py-3 font-semibold">NIC</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Requested Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {error && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-red-600">
                    {error}
                  </td>
                </tr>
              )}

              {!error && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-neutral-500">
                    {hasRetrieved
                      ? "No records found. Adjust your filters and click Retrieve."
                      : "Click Retrieve to load requests."}
                  </td>
                </tr>
              )}

              {!error &&
                rows.map((row, i) => (
                  <tr
                    key={`${row.type}-${row.requestId ?? row.requestNo ?? i}`}
                    className="hover:bg-[#fdf5f2]/60"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openRow(row)}
                        className="font-medium text-[#953002] hover:underline"
                      >
                        {row.requestNo ?? `#${row.requestId ?? "—"}`}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {row.typeLabel ?? TYPE_LABELS[row.type]}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{row.memberId ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">
                      {row.nameWithInitials || row.fullName || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{row.nic ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {row.submissionLocation ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {row.requestedDate ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
                        {STATUS_LABELS[row.status ?? ""] ?? row.status ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {hasRetrieved && rows.length > 0 && (
          <div className="border-t border-neutral-100 px-4 py-2.5 text-xs text-neutral-500">
            {rows.length} request{rows.length === 1 ? "" : "s"}
          </div>
        )}
      </div>
    </div>
  );
}
