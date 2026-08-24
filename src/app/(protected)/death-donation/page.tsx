"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  Landmark,
  Pencil,
  Send,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Input } from "@/src/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  searchDeathDonationRequests,
  type DeathDonationRequest,
} from "@/lib/api/deathDonation";
import { getEducationalDistricts } from "@/lib/api/education";
import { useAuth } from "@/lib/auth-context";
import { DEATH_DONATION_VIEW_ROLES, hasRole } from "@/lib/permissions";

const TODAY = new Date().toISOString().split("T")[0];

type DateFilterType = "all_days" | "this_month" | "this_and_last_month" | "date_period";
type SortBy = "requestedDate" | "deceasedDate" | "status" | "memberId";
type SortOrder = "asc" | "desc";
type DeathDonationStatus =
  | "NEW"
  | "INCOMPLETE"
  | "SUBMITTED_FOR_APPROVAL"
  | "DISTRICT_COMMITTEE"
  | "PD_COMMITTEE"
  | "REJECTED"
  | "APPROVED"
  | "INACTIVE";

/*
 * MMD02: "By default, All statuses except Incomplete, Rejected, Approved and Inactive
 * will be displayed."
 *
 * Which is to say: the four stages that still need somebody to act. Approved and
 * Rejected were also selected here, so the default view opened padded with settled
 * requests - the opposite of what the filter is for.
 */
const DEFAULT_STATUSES: DeathDonationStatus[] = [
  "NEW",
  "SUBMITTED_FOR_APPROVAL",
  "DISTRICT_COMMITTEE",
  "PD_COMMITTEE",
];

const NON_EDITABLE_STATUSES: DeathDonationStatus[] = [
  "SUBMITTED_FOR_APPROVAL",
  "DISTRICT_COMMITTEE",
  "PD_COMMITTEE",
  "APPROVED",
  "REJECTED",
  "INACTIVE",
];

const STATUS_OPTIONS: { value: DeathDonationStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "INCOMPLETE", label: "Incomplete" },
  { value: "SUBMITTED_FOR_APPROVAL", label: "Submitted for Approval" },
  { value: "DISTRICT_COMMITTEE", label: "District Committee" },
  { value: "PD_COMMITTEE", label: "P&D Committee" },
  { value: "REJECTED", label: "Rejected" },
  { value: "APPROVED", label: "Approved" },
  { value: "INACTIVE", label: "Inactive" },
];



// Locations come from the Educational Districts master (/api/education/districts),
// the same source the Member Directory and Termination filters use, so the three
// screens cannot drift apart. This list used to be 25 district names hardcoded
// here as lowercase slugs, which the server can no longer match: MMD02 scoping
// now compares the request's submission_location by equality, so the filter has
// to send real district names.
const ALL_LOCATIONS_OPTION = { id: "all", name: "All Locations" };

function getCurrentMonthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: firstDay.toISOString().split("T")[0],
    to: lastDay.toISOString().split("T")[0],
  };
}

function getThisAndLastMonthRange() {
  const now = new Date();
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: firstDayLastMonth.toISOString().split("T")[0],
    to: lastDayThisMonth.toISOString().split("T")[0],
  };
}

function LocationMultiSelect({
  selectedLocations,
  onLocationChange,
  availableLocations,
  disabled = false,
}: {
  selectedLocations: string[];
  onLocationChange: (locations: string[]) => void;
  availableLocations: { id: string; name: string }[];
  /** A District Office user is pinned to their own district and cannot widen it. */
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locationOptions = availableLocations.filter(
    (location) => location.id !== ALL_LOCATIONS_OPTION.id
  );
  const isAllSelected =
    selectedLocations.length === 0 || selectedLocations.includes("all");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const selectAllLocations = () => {
    onLocationChange(["all"]);
  };

  const toggleLocation = (locationId: string) => {
    const withoutAll = selectedLocations.filter((id) => id !== "all");
    const nextLocations = withoutAll.includes(locationId)
      ? withoutAll.filter((id) => id !== locationId)
      : [...withoutAll, locationId];

    onLocationChange(nextLocations.length === 0 ? ["all"] : nextLocations);
  };

  const displayText = isAllSelected
    ? "All Locations"
    : selectedLocations.length === 1
      ? locationOptions.find((location) => location.id === selectedLocations[0])?.name
      : `${selectedLocations.length} selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-left shadow-sm hover:bg-gray-50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#8B4513] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
      >
        <span className="text-sm">{displayText}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
          <div className="max-h-64 overflow-y-auto p-2">
            <label className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 hover:bg-gray-100">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={selectAllLocations}
                onClick={(event) => event.stopPropagation()}
              />
              <span className="text-sm font-medium">All Locations</span>
            </label>
            {locationOptions.map((location) => (
              <label
                key={location.id}
                className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 hover:bg-gray-100"
              >
                <Checkbox
                  checked={!isAllSelected && selectedLocations.includes(location.id)}
                  onCheckedChange={() => toggleLocation(location.id)}
                  onClick={(event) => event.stopPropagation()}
                />
                <span className="text-sm">{location.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusMultiSelect({
  selectedStatuses,
  onStatusChange,
}: {
  selectedStatuses: DeathDonationStatus[];
  onStatusChange: (statuses: DeathDonationStatus[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const toggleStatus = (status: DeathDonationStatus) => {
    onStatusChange(
      selectedStatuses.includes(status)
        ? selectedStatuses.filter((value) => value !== status)
        : [...selectedStatuses, status]
    );
  };

  const displayText =
    selectedStatuses.length === 0
      ? "Select statuses"
      : selectedStatuses.length === 1
        ? STATUS_OPTIONS.find((option) => option.value === selectedStatuses[0])?.label
        : `${selectedStatuses.length} selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-left shadow-sm hover:bg-gray-50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
      >
        <span className="text-sm">{displayText}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
          <div className="max-h-64 overflow-y-auto p-2">
            {STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 hover:bg-gray-100"
              >
                <Checkbox
                  checked={selectedStatuses.includes(option.value)}
                  onCheckedChange={() => toggleStatus(option.value)}
                  onClick={(event) => event.stopPropagation()}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeathDonationPage() {
  const router = useRouter();

  const [selectedLocations, setSelectedLocations] = useState<string[]>(["all"]);
  const [selectedStatuses, setSelectedStatuses] =
    useState<DeathDonationStatus[]>(DEFAULT_STATUSES);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all_days");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("requestedDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [requests, setRequests] = useState<DeathDonationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasRetrieved, setHasRetrieved] = useState(false);
  const [availableLocations, setAvailableLocations] = useState([ALL_LOCATIONS_OPTION]);

  const { user } = useAuth();
  const canViewDonations = hasRole(user?.role, DEATH_DONATION_VIEW_ROLES);

  // A District Office user only ever sees their own district (MMD02). The server
  // pins this regardless, ignoring whatever the client asks for; showing the
  // filter as fixed keeps the screen honest about what it will return rather
  // than offering a choice that is silently overridden.
  const pinnedDistrict =
    user?.role === "DISTRICT_OFFICE" ? user?.assignedDistrict ?? null : null;

  useEffect(() => {
    if (!canViewDonations) return;

    let cancelled = false;
    getEducationalDistricts()
      .then((districts) => {
        if (cancelled) return;
        setAvailableLocations([
          ALL_LOCATIONS_OPTION,
          ...districts.map((district) => ({ id: district, name: district })),
        ]);
      })
      .catch(() => {
        /* leave the master unloaded - the filter simply offers no districts */
      });
    return () => {
      cancelled = true;
    };
  }, [canViewDonations]);

  useEffect(() => {
    if (pinnedDistrict) {
      setSelectedLocations([pinnedDistrict]);
    }
  }, [pinnedDistrict]);

  const buildSearchParams = () => {
    const params: {
      locations: string[];
      statuses: string[];
      fromDate?: string;
      toDate?: string;
      searchKey?: string;
      sortBy: SortBy;
      sortOrder: SortOrder;
    } = {
      locations:
        selectedLocations.length === 0 || selectedLocations.includes("all")
          ? ["all"]
          : selectedLocations,
      statuses: selectedStatuses,
      sortBy,
      sortOrder,
    };

    if (searchQuery.trim()) {
      params.searchKey = searchQuery.trim();
    }

    if (dateFilter === "this_month") {
      const { from, to } = getCurrentMonthRange();
      params.fromDate = from;
      params.toDate = to;
    } else if (dateFilter === "this_and_last_month") {
      const { from, to } = getThisAndLastMonthRange();
      params.fromDate = from;
      params.toDate = to;
    } else if (dateFilter === "date_period" && fromDate && toDate) {
      params.fromDate = fromDate;
      params.toDate = toDate;
    }

    return params;
  };

  const handleRetrieve = async () => {
    if (dateFilter === "date_period") {
      if (fromDate && fromDate > TODAY) {
        setError("From Date cannot be a future date.");
        setRequests([]);
        return;
      }
      if (toDate && toDate > TODAY) {
        setError("To Date cannot be a future date.");
        setRequests([]);
        return;
      }
      if (fromDate && toDate && fromDate > toDate) {
        setError("From Date cannot be after To Date.");
        setRequests([]);
        return;
      }
    }

    try {
      setLoading(true);
      setError("");
      const data = await searchDeathDonationRequests(buildSearchParams());
      setRequests(data);
      setHasRetrieved(true);
    } catch (err) {
      console.error("Retrieve death donation requests error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to retrieve death donation requests"
      );
      setRequests([]);
      setHasRetrieved(true);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => (
    <StatusBadge status={status} vocabulary="donation" />
  );

  const getStatusIndicators = (status?: string) => {
    if (status === "SUBMITTED_FOR_APPROVAL") {
      return (
        <span title="Submitted for approval">
          <Send className="h-4 w-4 text-green-700" aria-label="Submitted for approval" />
        </span>
      );
    }
    if (status === "DISTRICT_COMMITTEE") {
      return (
        <span title="District Committee">
          <Building2 className="h-4 w-4 text-yellow-700" aria-label="District Committee" />
        </span>
      );
    }
    if (status === "PD_COMMITTEE" || status === "P_AND_D_COMMITTEE") {
      return (
        <span title="P&D Committee">
          <Landmark className="h-4 w-4 text-blue-700" aria-label="P&D Committee" />
        </span>
      );
    }
    return <span className="text-muted-foreground">-</span>;
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    return value.split("T")[0];
  };

  const buildRequestUrl = (
    request: DeathDonationRequest,
    mode: "view" | "edit"
  ) => {
    if (!request.memberId || !request.requestNo) return "#";
    const params = new URLSearchParams({
      memberId: request.memberId,
      requestNo: request.requestNo,
      mode,
      source: "death-donation",
    });
    return `/membership/directory/death-donation-request?${params.toString()}`;
  };

  const openRequest = (request: DeathDonationRequest) => {
    if (!request.memberId || !request.requestNo) return;
    router.push(buildRequestUrl(request, "view"));
  };

  const canEdit = (status?: string) =>
    !!status && !NON_EDITABLE_STATUSES.includes(status as DeathDonationStatus);

  // SRS Requirement 05 names only the District Office and Head Office System
  // Users as actors. Everyone else is turned away here as well as by the server,
  // so a role that reaches the URL directly gets an explanation rather than a
  // screen full of 403s.
  if (user && !canViewDonations) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
        <h1 className="text-xl font-bold text-gray-800">Access Restricted</h1>
        <p className="max-w-md text-sm text-gray-500">
          Death Donation requests are restricted to District Office, District and P&amp;D
          Committee, and Head Office personnel.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-bold text-[#8B4513]">Death Donation Requests</h1>
        <p className="text-sm text-muted-foreground">MMD02 - Search existing Death Donation Requests</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-6 text-lg font-bold text-[#8B3205]">Search Criteria</h2>

          {/* Same arrangement as the Termination, Dormant and Profile Changes screens:
              the filters on one row (where, when, which status), the date pair only when
              a period is chosen, then search with sort and Retrieve. Previously a single
              flex-wrap row of fixed-width fields, so they reflowed into ragged rows and
              Retrieve landed wherever the wrap left it. */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Location</label>
                <LocationMultiSelect
                  selectedLocations={selectedLocations}
                  onLocationChange={setSelectedLocations}
                  availableLocations={availableLocations}
                  disabled={!!pinnedDistrict}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Request Received On</label>
                <Select
                  value={dateFilter}
                  onValueChange={(value) => setDateFilter(value as DateFilterType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_days">All Days</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="this_and_last_month">This and Last Month</SelectItem>
                    <SelectItem value="date_period">Date Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Status</label>
                <StatusMultiSelect
                  selectedStatuses={selectedStatuses}
                  onStatusChange={setSelectedStatuses}
                />
              </div>
            </div>

            {dateFilter === "date_period" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">From Date</label>
                  <Input
                    type="date"
                    value={fromDate}
                    max={TODAY}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">To Date</label>
                  <Input
                    type="date"
                    value={toDate}
                    max={TODAY}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-medium text-gray-600">Search Member</label>
                <Input
                  type="text"
                  placeholder="Member name, member number, NIC, death certificate no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Sort By</label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select sort option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requestedDate">Requested Date</SelectItem>
                    <SelectItem value="deceasedDate">Deceased Date</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="memberId">Member ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Sort Order</label>
                <div className="flex items-center gap-2">
                  <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => void handleRetrieve()}
                    disabled={loading}
                    className="whitespace-nowrap bg-[#8B4513] text-white hover:bg-[#A0522D]"
                  >
                    {loading ? "Retrieving..." : "Retrieve"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-white">
        {error && <p className="border-b px-4 py-3 text-sm text-red-600">{error}</p>}

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Request ID</TableHead>
              <TableHead className="font-semibold">Req. Date</TableHead>
              <TableHead className="font-semibold">Deceased</TableHead>
              <TableHead className="font-semibold">Member ID</TableHead>
              <TableHead className="font-semibold">Member Name</TableHead>
              <TableHead className="font-semibold">Indicators</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-center font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Loading death donation requests...
                </TableCell>
              </TableRow>
            ) : !hasRetrieved ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Click Retrieve to load death donation requests.
                </TableCell>
              </TableRow>
            ) : requests.length > 0 ? (
              requests.map((request) => (
                <TableRow key={request.id ?? request.requestNo}>
                  <TableCell className="font-medium">
                    {request.requestNo ? (
                      <button
                        type="button"
                        onClick={() => openRequest(request)}
                        className="font-medium text-[#8B4513] hover:underline"
                      >
                        {request.requestNo}
                      </button>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{formatDate(request.requestedDate)}</TableCell>
                  <TableCell>{request.deceasedName ?? "-"}</TableCell>
                  <TableCell>
                    {request.memberId ? (
                      <button
                        type="button"
                        onClick={() => openRequest(request)}
                        className="font-medium text-[#8B4513] hover:underline"
                      >
                        {request.memberId}
                      </button>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{request.memberFullName ?? "-"}</TableCell>
                  <TableCell>{getStatusIndicators(request.status)}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-center">
                    {canEdit(request.status) && request.memberId && request.requestNo ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 w-8 p-0"
                      >
                        <Link href={buildRequestUrl(request, "edit")}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No requests found. Try adjusting your search criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {hasRetrieved && !loading && (
        <div className="text-sm text-muted-foreground">
          Showing {requests.length} request(s)
        </div>
      )}
    </div>
  );
}
