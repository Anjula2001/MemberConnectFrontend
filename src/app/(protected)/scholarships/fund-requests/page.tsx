"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, ChevronDown, Pencil, RotateCcw, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  canAccessFundRequests,
  canEditFundRequest,
  canSelectAllLocations,
} from "@/lib/permissions";
import AccessRestricted from "@/src/components/AccessRestricted";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Input } from "@/src/components/ui/input";
import { StatusBadge } from "@/src/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { TablePagination, clampPage, pageSlice } from "@/src/components/ui/table-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { authFetch } from "@/lib/api/authFetch";

type ScholarshipFundRequest = {
  id?: number | string;
  requestId?: string;
  scholarshipRequestId?: string;
  requestedDate?: string;
  requestedPeriod?: string;
  requestedAmount?: number;
  disbursedAmount?: number;
  disbursementDate?: string;
  status?: string;
};

type FundRequestRow = ScholarshipFundRequest & {
  rowId: string;
  scholarshipRequestId: string;
  studentName?: string;
  memberName?: string;
  memberId?: string;
  universityName?: string;
  nic?: string;
  location?: string;
  /** What the server calls the parent's district; copied to `location` on load. */
  submissionLocation?: string;
};

const locationOptions = [
  { value: "colombo", label: "Colombo" },
  { value: "kandy", label: "Kandy" },
  { value: "galle", label: "Galle" },
  { value: "matara", label: "Matara" },
  { value: "jaffna", label: "Jaffna" },
  { value: "kilinochchi", label: "Kilinochchi" },
  { value: "mannar", label: "Mannar" },
  { value: "mullaitivu", label: "Mullaitivu" },
  { value: "vavuniya", label: "Vavuniya" },
  { value: "puttalam", label: "Puttalam" },
  { value: "kurunagala", label: "Kurunagala" },
  { value: "kaluthara", label: "Kaluthara" },
  { value: "gampaha", label: "Gampaha" },
  { value: "anuradhapura", label: "Anuradhapura" },
  { value: "polonnaruwa", label: "Polonnaruwa" },
  { value: "mathale", label: "Mathale" },
  { value: "nuwaraeliya", label: "Nuwara Eliya" },
  { value: "kegalla", label: "Kegalla" },
  { value: "rathnapura", label: "Rathnapura" },
  { value: "trincomalee", label: "Trincomalee" },
  { value: "batticaloa", label: "Batticaloa" },
  { value: "ampara", label: "Ampara" },
  { value: "badulla", label: "Badulla" },
  { value: "monaragala", label: "Monaragala" },
  { value: "hambantota", label: "Hambantota" },
];

const statusOptions = [
  { value: "new", label: "New" },
  { value: "incomplete", label: "Incomplete" },
  { value: "submittedforcommitteeapproval", label: "Submitted for Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "inactive", label: "Inactive" },
];

function normalizeStatus(status?: string) {
  return (status || "").toLowerCase().replace(/[\s_]+/g, "");
}

function formatDate(date?: string) {
  return date ? new Date(date).toLocaleDateString() : "-";
}

function formatCurrency(amount?: number) {
  return typeof amount === "number"
    ? `LKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "LKR 0.00";
}

function parseYMD(input?: string | null) {
  if (!input) return null;

  const match = String(input).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setHours(0, 0, 0, 0);
  return date;
}

function MultiSelect({
  disabled = false,
  options,
  selected,
  onChange,
  placeholder = "Select...",
}: {
  disabled?: boolean;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  };

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find(
          (o) => o.value.toLowerCase() === selected[0].toLowerCase()
        )?.label ?? selected[0])
        : selected.length === options.length
          ? "All Selected"
          : `${selected.length} Selected`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="border-input flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected.length === 0 ? "text-muted-foreground" : ""}>
          {label}
        </span>
        <ChevronDown size={14} className="text-muted-foreground shrink-0" />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full min-w-[8rem] rounded-md border border-border bg-popover shadow-md">
          <div className="flex flex-col gap-0.5 p-1">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Checkbox
                  checked={selected.includes(option.value)}
                  onCheckedChange={() => toggle(option.value)}
                  className="data-[state=checked]:bg-[#953002] data-[state=checked]:border-[#953002]"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UniversityScholarshipFundRequestsPage() {
  const { user } = useAuth();
  const canViewFundRequests = canAccessFundRequests(user?.role);

  const [requests, setRequests] = useState<FundRequestRow[]>([]);
  const [displayed, setDisplayed] = useState<FundRequestRow[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRetrieved, setHasRetrieved] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [requestReceivedOn, setRequestReceivedOn] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("requested-date");
  const [sortAsc, setSortAsc] = useState(true);

  const hasMultipleLocationAccess = canSelectAllLocations(user?.role);
  const currentLocation = user?.assignedDistrict ?? "";
  const isLocationFilterDisabled = !hasMultipleLocationAccess;
  // Must agree with the Edit mode on the fund request itself — a pencil that opens a
  // read-only form is worse than no pencil. Was hardcoded true until 2026-08-27.
  const hasEditRights = canEditFundRequest(user);

  useEffect(() => {
    if (isLocationFilterDisabled) {
      setSelectedLocations([currentLocation]);
    }
  }, [currentLocation, isLocationFilterDisabled]);

  /*
   * The client-side filter that used to live here is gone. Location, Status, Received
   * On, the date period, Search and Sort are all applied by
   * /api/university-scholarship-fund-requests/search, and `displayed` is set from the
   * response in handleRetrieve.
   *
   * Location must stay server-side in particular: resolveLocationScope pins a District
   * Office caller to their own district, which a browser filter cannot enforce.
   */


  // Clamped every render rather than only on paging: the effect above re-filters on any
  // criteria change, which can shrink the result set under the current page.
  const safePage = clampPage(page, displayed.length);
  const pagedRequests = pageSlice(displayed, safePage);

  const validateDates = () => {
    setDateError("");

    if (requestReceivedOn !== "datePeriod") return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!fromDate || !toDate) {
      setDateError("Both From Date and To Date are required.");
      return false;
    }

    const start = parseYMD(fromDate);
    const end = parseYMD(toDate);

    if (!start || !end) {
      setDateError("Please enter valid From Date and To Date values.");
      return false;
    }

    if (start > today || end > today) {
      setDateError("From Date and To Date must be past dates.");
      return false;
    }

    if (start >= end) {
      setDateError("From Date must be before To Date.");
      return false;
    }

    return true;
  };

  const handleRetrieve = async () => {
    if (!validateDates()) return;

    try {
      setIsLoading(true);

      /*
       * A dedicated fund-request search. This used to read the scholarship endpoint and
       * flatten fund requests out of the nested payload in the browser, which meant
       * downloading every scholarship request to render a page of ten fund requests.
       * The server now returns fund requests directly, with the member and student
       * details already flattened onto each row.
       */
      const params = new URLSearchParams();
      selectedLocations.forEach((location) => params.append("locations", location));
      selectedStatuses.forEach((status) => params.append("statuses", status));
      params.append("receivedOn", requestReceivedOn);
      params.append("sortBy", sortBy);
      params.append("sortDirection", sortAsc ? "asc" : "desc");
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (requestReceivedOn === "datePeriod") {
        if (fromDate) params.append("fromDate", fromDate);
        if (toDate) params.append("toDate", toDate);
      }

      const response = await authFetch(
        `http://localhost:8080/api/university-scholarship-fund-requests/search?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error("Failed to retrieve university scholarship fund requests");
      }

      const data = await response.json();
      const rows: FundRequestRow[] = (Array.isArray(data) ? data : []).map(
        (row: FundRequestRow) => ({
          ...row,
          // The table keys on rowId; the server has no equivalent, so it is composed here.
          rowId: String(row.id || row.requestId || `${row.scholarshipRequestId}-${row.requestedDate || ""}`),
          location: row.submissionLocation,
        })
      );

      // Already filtered and sorted server-side, so displayed mirrors the response.
      setRequests(rows);
      setDisplayed(rows);
      setPage(1);
      setHasRetrieved(true);
    } catch (error) {
      console.error("Failed to retrieve university scholarship fund requests:", error);
      setRequests([]);
      setDisplayed([]);
      setHasRetrieved(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (user && !canViewFundRequests) {
    return (
      <AccessRestricted
        message="University Scholarship Fund Requests are restricted to Head Office, Board Secretariat, Scholarship and Accounts personnel."
        fallbackHref="/scholarships/university"
        fallbackLabel="Back to University Scholarships"
      />
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#953002]">
          University Scholarship Fund Request
        </h1>
      </div>

      <div className="px-6">
        <Card className="mb-4 rounded-xl py-0 shadow-sm">
          <CardHeader className="px-5 pb-3 pt-5">
            <CardTitle className="text-base text-[#953002]">Search Criteria</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 px-5 pb-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Location (District)</label>
                <MultiSelect
                  disabled={isLocationFilterDisabled}
                  options={locationOptions}
                  selected={selectedLocations}
                  onChange={setSelectedLocations}
                  placeholder="All Locations"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Request Received On</label>
                <Select value={requestReceivedOn} onValueChange={(value) => { setRequestReceivedOn(value); setDateError(""); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Days</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="thisAndLastMonth">This and Last Month</SelectItem>
                    <SelectItem value="datePeriod">Date Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Status</label>
                <MultiSelect
                  options={statusOptions}
                  selected={selectedStatuses}
                  onChange={setSelectedStatuses}
                  placeholder="Select Status"
                />
              </div>
            </div>

            {requestReceivedOn === "datePeriod" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">From Date</label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(event) => { setFromDate(event.target.value); setDateError(""); }}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">To Date</label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(event) => { setToDate(event.target.value); setDateError(""); }}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>
            )}

            {dateError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {dateError}
              </div>
            )}

            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-medium text-gray-600">
                  Search (FundRequestID / ScholarshipRequestID / MemberName / MemberID / StudentName / StudentNIC)
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by fund request, scholarship request, student, member or NIC..."
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Fund Requested Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requested-date">Fund Requested Date</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="scholarship-id">Scholarship ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Sort Order</label>
                <div className="flex items-center gap-2">
                  <Select value={sortAsc ? "asc" : "desc"} onValueChange={(val) => setSortAsc(val === "asc")}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Ascending" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button className="bg-[#7a2700] text-white hover:bg-[#953002] whitespace-nowrap" onClick={handleRetrieve} disabled={isLoading}>
                    <RotateCcw size={14} className={isLoading ? "animate-spin" : ""} />
                    {isLoading ? "Retrieving..." : "Retrieve"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results - shadcn Table, matching the Membership Directory. */}
        <Card className="overflow-hidden rounded-xl border-neutral-300 py-0 shadow-none">
          <CardContent className="overflow-x-auto px-0">
            <Table className="border-collapse">
              <TableHeader>
                <TableRow className="bg-[#fafafa] hover:bg-[#fafafa]">
                  {[
                    "Fund Request ID",
                    "Scholarship ID",
                    "Member",
                    "Requested Date",
                    "Requested Period",
                    "Requested Amount",
                    "Status",
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase"
                    >
                      {h}
                    </TableHead>
                  ))}
                  <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-neutral-500">
                      {hasRetrieved ? "No data available" : "Use Retrieve to load fund requests"}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRequests.map((item) => {
                    const fundRequestId = String(item.requestId || item.id || "");
                    const viewHref = `/membership/directory/university-scholarship-fundrequest?scholarshipRequestId=${encodeURIComponent(item.scholarshipRequestId)}&fundRequestId=${encodeURIComponent(fundRequestId)}&mode=view`;
                    const editHref = `/membership/directory/university-scholarship-fundrequest?scholarshipRequestId=${encodeURIComponent(item.scholarshipRequestId)}&fundRequestId=${encodeURIComponent(fundRequestId)}&mode=edit`;
                    const editableStatus = normalizeStatus(item.status);
                    const canEdit =
                      hasEditRights
                      && (editableStatus === "new" || editableStatus === "incomplete");

                    return (
                      <TableRow key={item.rowId} className="hover:bg-neutral-50">
                        <TableCell className="px-4 py-4 font-medium">
                          <Link href={viewHref} className="text-[#953002] hover:underline">
                            {item.requestId || item.id || "-"}
                          </Link>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-neutral-700">
                          {item.scholarshipRequestId || "-"}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-neutral-700">
                          {item.memberName || item.memberId || "-"}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-neutral-700 tabular-nums">
                          {formatDate(item.requestedDate)}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-neutral-700">
                          {item.requestedPeriod || "-"}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-neutral-700 tabular-nums">
                          {formatCurrency(item.requestedAmount)}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <StatusBadge status={item.status} vocabulary="scholarship" />
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right">
                          {canEdit && (
                            <Link
                              href={editHref}
                              className="inline-flex text-[#953002] transition-colors hover:text-[#c44515]"
                              aria-label="Edit fund request"
                            >
                              <Pencil size={16} />
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {displayed.length > 0 && (
              <TablePagination
                page={safePage}
                total={displayed.length}
                onPageChange={setPage}
                itemLabel="fund request"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
