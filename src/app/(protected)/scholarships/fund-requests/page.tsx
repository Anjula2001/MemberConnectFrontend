"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, ChevronDown, Eye, Pencil, RotateCcw, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { canAccessFundRequests, canSelectAllLocations } from "@/lib/permissions";
import AccessRestricted from "@/src/components/AccessRestricted";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Input } from "@/src/components/ui/input";
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

type ScholarshipRow = {
  id?: number | string;
  requestId?: string;
  studentName?: string;
  memberName?: string;
  memberId?: string;
  universityName?: string;
  nic?: string;
  address?: string;
  fundRequests?: ScholarshipFundRequest[];
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

function getStatusColor(status?: string) {
  const statusLower = normalizeStatus(status);

  if (statusLower === "new") return "bg-blue-100 border-blue-200 text-blue-500";
  if (statusLower === "incomplete") return "bg-pink-100 border-pink-200 text-pink-500";
  if (statusLower === "approved") return "bg-green-100 border-green-200 text-green-500";
  if (statusLower === "rejected") return "bg-red-100 border-red-200 text-red-500";
  if (statusLower === "submittedforcommitteeapproval") return "bg-purple-100 border-purple-200 text-purple-500";
  if (statusLower === "inactive") return "bg-gray-100 border-gray-200 text-gray-500";

  return "bg-yellow-100 border-yellow-200 text-yellow-500";
}

function formatStatusLabel(status?: string) {
  const statusUpper = (status || "").toUpperCase().replace(/[\s_]+/g, "");

  switch (statusUpper) {
    case "NEW":
      return "New";
    case "INCOMPLETE":
      return "Incomplete";
    case "SUBMITTEDFORCOMMITTEEAPPROVAL":
      return "Submitted for Approval";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "INACTIVE":
      return "Inactive";
    default:
      return status ? status.replace(/_/g, " ") : "-";
  }
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

  // Previously hardcoded to `true` / "colombo", which pinned every user to a district
  // they may have nothing to do with and let restricted users browse all locations.
  const hasMultipleLocationAccess = canSelectAllLocations(user?.role);
  const currentLocation = user?.assignedDistrict ?? "";
  const isLocationFilterDisabled = !hasMultipleLocationAccess;
  const hasEditRights = true;

  useEffect(() => {
    if (isLocationFilterDisabled) {
      setSelectedLocations([currentLocation]);
    }
  }, [currentLocation, isLocationFilterDisabled]);

  useEffect(() => {
    let filtered = [...requests];

    if (selectedLocations.length > 0) {
      filtered = filtered.filter((request) => {
        const location = (request.location || "").toLowerCase().trim();
        return selectedLocations.some((selected) => location.includes(selected.toLowerCase().trim()));
      });
    }

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((request) => selectedStatuses.includes(normalizeStatus(request.status)));
    }

    if (requestReceivedOn !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((request) => {
        const requestedDate = parseYMD(request.requestedDate);
        if (!requestedDate) return false;

        if (requestReceivedOn === "thisMonth") {
          return requestedDate.getMonth() === today.getMonth() && requestedDate.getFullYear() === today.getFullYear();
        }

        if (requestReceivedOn === "thisAndLastMonth") {
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          lastMonth.setHours(0, 0, 0, 0);
          return requestedDate >= lastMonth && requestedDate <= today;
        }

        if (requestReceivedOn === "datePeriod" && fromDate && toDate) {
          const start = parseYMD(fromDate);
          const end = parseYMD(toDate);
          return Boolean(start && end && requestedDate >= start && requestedDate <= end);
        }

        return true;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((request) =>
        (request.requestId || "").toLowerCase().includes(query) ||
        (request.scholarshipRequestId || "").toLowerCase().includes(query) ||
        (request.studentName || "").toLowerCase().includes(query) ||
        (request.memberName || "").toLowerCase().includes(query) ||
        (request.memberId || "").toLowerCase().includes(query) ||
        (request.nic || "").toLowerCase().includes(query) ||
        (request.universityName || "").toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "requested-date") {
        comparison = (a.requestedDate || "").localeCompare(b.requestedDate || "");
      } else if (sortBy === "status") {
        comparison = (a.status || "").localeCompare(b.status || "");
      } else if (sortBy === "scholarship-id") {
        comparison = (a.scholarshipRequestId || "").localeCompare(b.scholarshipRequestId || "");
      }

      return sortAsc ? comparison : -comparison;
    });

    setDisplayed(filtered);
  }, [fromDate, requestReceivedOn, requests, searchQuery, selectedLocations, selectedStatuses, sortAsc, sortBy, toDate]);

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

      const response = await authFetch("http://localhost:8080/api/university-scholarships");
      if (!response.ok) {
        throw new Error("Failed to retrieve university scholarship fund requests");
      }

      const data: ScholarshipRow[] = await response.json();
      const rows = data.flatMap((scholarship) => {
        const scholarshipRequestId = String(scholarship.requestId || scholarship.id || "");

        return (scholarship.fundRequests || []).map((fundRequest) => ({
          ...fundRequest,
          rowId: String(fundRequest.id || fundRequest.requestId || `${scholarshipRequestId}-${fundRequest.requestedDate || ""}`),
          scholarshipRequestId: fundRequest.scholarshipRequestId || scholarshipRequestId,
          studentName: scholarship.studentName,
          memberName: scholarship.memberName,
          memberId: scholarship.memberId,
          universityName: scholarship.universityName,
          nic: scholarship.nic,
          location: scholarship.address,
        }));
      });

      setRequests(rows);
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

        <div className="rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-sm text-gray bold">
                  <th className="px-4 py-4 font-medium">Fund Request ID</th>
                  <th className="px-4 py-4 font-medium">Scholarship ID</th>
                  <th className="px-4 py-4 font-medium">Member</th>
                  <th className="px-4 py-4 font-medium">Requested Date</th>
                  <th className="px-4 py-4 font-medium">Requested Period</th>
                  <th className="px-4 py-4 font-medium">Requested Amount</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-4 text-center text-gray-500">
                      {hasRetrieved ? "No data available" : "Use Retrieve to load fund requests"}
                    </td>
                  </tr>
                ) : (
                  displayed.map((item) => {
                    const fundRequestId = String(item.requestId || item.id || "");
                    const viewHref = `/membership/directory/university-scholarship-fundrequest?scholarshipRequestId=${encodeURIComponent(item.scholarshipRequestId)}&fundRequestId=${encodeURIComponent(fundRequestId)}&mode=view`;
                    const editHref = `/membership/directory/university-scholarship-fundrequest?scholarshipRequestId=${encodeURIComponent(item.scholarshipRequestId)}&fundRequestId=${encodeURIComponent(fundRequestId)}&mode=edit`;
                    const canEdit = hasEditRights && normalizeStatus(item.status) === "new";

                    return (
                      <tr key={item.rowId} className="border-t text-sm text-gray-600">
                        <td className="px-4 py-4 font-medium">
                          <Link href={viewHref} className="text-[#953002] hover:underline">
                            {item.requestId || item.id || "-"}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-gray-600">{item.scholarshipRequestId || "-"}</td>
                        <td className="px-4 py-4 text-gray-600">{item.memberName || item.memberId || "-"}</td>
                        <td className="px-4 py-4 text-gray-600">{formatDate(item.requestedDate)}</td>
                        <td className="px-4 py-4 text-gray-600">{item.requestedPeriod || "-"}</td>
                        <td className="px-4 py-4 text-gray-600">{formatCurrency(item.requestedAmount)}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full border px-2 py-1 text-[11px] ${getStatusColor(item.status)}`}>
                            {formatStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {canEdit ? (
                            <Link
                              href={editHref}
                              className="text-[#953002] transition-colors hover:text-[#c44515]"
                              aria-label="Edit fund request"
                            >
                              <Pencil size={18} />
                            </Link>
                          ) : (
                            <Link
                              href={viewHref}
                              className="text-[#953002] transition-colors hover:text-[#c44515]"
                              aria-label="View fund request"
                            >
                              <Eye size={18} />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
