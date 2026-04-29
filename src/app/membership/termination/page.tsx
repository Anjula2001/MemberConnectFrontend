"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
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
import { Badge } from "@/src/components/ui/badge";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  AlertTriangle,
  CircleDollarSign,
  Pencil,
  ChevronDown,
} from "lucide-react";

interface TerminationRequest {
  id: string;
  requestId: string;
  date: string;
  member: string;
  nameAsInPayroll: string;
  nameWithInitials: string;
  memberNumber: string;
  nicNumber: string;
  hasLoanBalance: boolean;
  hasIndirectObligations: boolean;
  reason: string;
  status: "NEW" | "SUBMITTED_FOR_APPROVAL" | "ADDED_TO_APPROVAL_LIST" | "APPROVED" | "REJECTED" | "INCOMPLETE";
}

type TerminationRequestApiRow = {
  id?: string | number;
  requestId?: string;
  requestNo?: string;
  requestNumber?: string;
  requestedDate?: string;
  date?: string;
  memberName?: string;
  member?: {
    fullName?: string;
    nameWithInitials?: string;
    memberName?: string;
    memberId?: string;
  } | string;
  fullName?: string;
  nameWithInitials?: string;
  employeeName?: string;
  memberFullName?: string;
  nameAsInPayroll?: string;
  memberId?: string;
  memberNumber?: string;
  memberNo?: string;
  nic?: string;
  nicNumber?: string;
  nicNo?: string;
  memberNic?: string;
  hasLoanBalance?: boolean;
  hasOutstandingLoans?: boolean;
  hasLoanObligations?: boolean;
  hasIndirectObligations?: boolean;
  indirectObligations?: boolean;
  totalOutstandingLoanBalance?: number;
  reason?: string;
  terminationReason?: string;
  status?: TerminationRequest["status"];
};

type TerminationRequestApiResponse =
  | TerminationRequestApiRow[]
  | {
      content?: TerminationRequestApiRow[];
      data?: TerminationRequestApiRow[];
      requests?: TerminationRequestApiRow[];
    };

type RequestType = "termination" | "retirement" | "member_deaths" | "all";
type StatusType = 
  | "new" 
  | "submitted_for_approval" 
  | "added_to_approval_list" 
  | "approved" 
  | "rejected" 
  | "incomplete"
  | "pending_review"
  | "approved_by_board"
  | "disbursement_initiated"
  | "disbursement_completed"
  | "awaiting_nominee_confirmation"
  | "on_hold"
  | "district-committee"
  | "pnd-committee"
  | "inactive"
  ;

type DateFilterType = "all_days" | "this_month" | "this_and_last_month" | "date_period";
type SortBy = "requestedDate" | "status" | "memberId";
type SortOrder = "asc" | "desc";

const API_BASE_URL = "http://localhost:8080";
const TODAY = new Date().toISOString().split("T")[0];
const DEFAULT_RETIREMENT_STATUSES: StatusType[] = [
  "new",
  "submitted_for_approval",
];
const NON_EDITABLE_STATUSES: TerminationRequest["status"][] = [
  "SUBMITTED_FOR_APPROVAL",
  "ADDED_TO_APPROVAL_LIST",
  "APPROVED",
  "REJECTED",
];

// Status options by request type
const STATUS_OPTIONS_BY_TYPE: Record<RequestType, { value: StatusType; label: string }[]> = {
  termination: [
    { value: "new", label: "New" },
    { value: "submitted_for_approval", label: "Submitted for Approval" },
    { value: "added_to_approval_list", label: "Added to Approval List" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "inactive", label: "Inactive" },

  ],
  retirement: [
    { value: "new", label: "New" },
    { value: "incomplete", label: "Incomplete" },
    { value: "submitted_for_approval", label: "Submitted for Approval" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "inactive", label: "Inactive" },
  ],
  member_deaths: [
    { value: "new", label: "New" },
    { value: "incomplete", label: "Incomplete" },
    { value: "submitted_for_approval", label: "Submitted for Approval" },
    { value: "district-committee", label: "District Committee" },
    { value: "pnd-committee", label: "P&D Committee" },
    { value: "rejected", label: "Rejected" },
    { value: "approved", label: "Approved" },
    { value: "inactive", label: "Inactive" },


  ],
  all: [
    { value: "new", label: "New" },
    { value: "submitted_for_approval", label: "Submitted for Approval" },
    { value: "added_to_approval_list", label: "Added to Approval List" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "incomplete", label: "Incomplete" },
    { value: "pending_review", label: "Pending Review" },
    { value: "approved_by_board", label: "Approved by Board" },
    { value: "awaiting_nominee_confirmation", label: "Awaiting Nominee Confirmation" },
    { value: "disbursement_initiated", label: "Disbursement Initiated" },
    { value: "disbursement_completed", label: "Disbursement Completed" },
    { value: "on_hold", label: "On Hold" },
  ],
};

// Multi-select dropdown component
function StatusMultiSelect({
  selectedStatuses,
  onStatusChange,
  statusOptions,
}: {
  selectedStatuses: StatusType[];
  onStatusChange: (statuses: StatusType[]) => void;
  statusOptions: { value: StatusType; label: string }[];
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

  const toggleStatus = (status: StatusType) => {
    onStatusChange(
      selectedStatuses.includes(status)
        ? selectedStatuses.filter((s) => s !== status)
        : [...selectedStatuses, status]
    );
  };

  const displayText =
    selectedStatuses.length === 0
      ? "Select statuses"
      : selectedStatuses.length === 1
        ? statusOptions.find((s) => s.value === selectedStatuses[0])?.label
        : `${selectedStatuses.length} selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-transparent flex items-center justify-between"
      >
        <span className="text-sm">{displayText}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-2 max-h-64 overflow-y-auto">
            {statusOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded cursor-pointer"
              >
                <Checkbox
                  checked={selectedStatuses.includes(option.value)}
                  onCheckedChange={() => toggleStatus(option.value)}
                  onClick={(e) => e.stopPropagation()}
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

function LocationMultiSelect({
  selectedLocations,
  onLocationChange,
}: {
  selectedLocations: string[];
  onLocationChange: (locations: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locationOptions = AVAILABLE_LOCATIONS.filter(
    (location) => location.id !== "all"
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const toggleLocation = (locationId: string) => {
    onLocationChange(
      selectedLocations.includes(locationId)
        ? selectedLocations.filter((id) => id !== locationId)
        : [...selectedLocations, locationId]
    );
  };

  const displayText =
    selectedLocations.length === 0
      ? "All Locations"
      : selectedLocations.length === 1
        ? locationOptions.find((location) => location.id === selectedLocations[0])
            ?.name
        : `${selectedLocations.length} selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-transparent flex items-center justify-between"
      >
        <span className="text-sm">{displayText}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-2 max-h-64 overflow-y-auto">
            {locationOptions.map((location) => (
              <label
                key={location.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded cursor-pointer"
              >
                <Checkbox
                  checked={selectedLocations.includes(location.id)}
                  onCheckedChange={() => toggleLocation(location.id)}
                  onClick={(e) => e.stopPropagation()}
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

// Location configuration
const AVAILABLE_LOCATIONS = [
  { id: "all", name: "All Locations" },

  { id: "colombo", name: "Colombo" },
  { id: "gampaha", name: "Gampaha" },
  { id: "kalutara", name: "Kalutara" },

  { id: "kandy", name: "Kandy" },
  { id: "matale", name: "Matale" },
  { id: "nuwara_eliya", name: "Nuwara Eliya" },

  { id: "galle", name: "Galle" },
  { id: "matara", name: "Matara" },
  { id: "hambantota", name: "Hambantota" },

  { id: "jaffna", name: "Jaffna" },
  { id: "kilinochchi", name: "Kilinochchi" },
  { id: "mannar", name: "Mannar" },
  { id: "vavuniya", name: "Vavuniya" },
  { id: "mullaitivu", name: "Mullaitivu" },

  { id: "batticaloa", name: "Batticaloa" },
  { id: "ampara", name: "Ampara" },
  { id: "trincomalee", name: "Trincomalee" },

  { id: "kurunegala", name: "Kurunegala" },
  { id: "puttalam", name: "Puttalam" },

  { id: "anuradhapura", name: "Anuradhapura" },
  { id: "polonnaruwa", name: "Polonnaruwa" },

  { id: "badulla", name: "Badulla" },
  { id: "monaragala", name: "Monaragala" },

  { id: "ratnapura", name: "Ratnapura" },
  { id: "kegalle", name: "Kegalle" }
];

// Helper function to get current month date range
const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: firstDay.toISOString().split("T")[0],
    to: lastDay.toISOString().split("T")[0],
  };
};

// Helper function to get this and last month date range
const getThisAndLastMonthRange = () => {
  const now = new Date();
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: firstDayLastMonth.toISOString().split("T")[0],
    to: lastDayThisMonth.toISOString().split("T")[0],
  };
};

export default function TerminationPage() {
  const router = useRouter();
  const [requestType, setRequestType] = useState<RequestType>("retirement");
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>(
    DEFAULT_RETIREMENT_STATUSES
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [dateFilter, setDateFilter] =
    useState<DateFilterType>("all_days");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("requestedDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [requests, setRequests] = useState<TerminationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const showRowSelection = false;

  // Get current status options based on request type
  const currentStatusOptions =
    requestType === "all"
      ? STATUS_OPTIONS_BY_TYPE.retirement
      : STATUS_OPTIONS_BY_TYPE[requestType];

  // Handle request type change - reset selected statuses
  const handleRequestTypeChange = (newType: RequestType) => {
    setRequestType(newType);
    setSelectedStatuses(
      newType === "retirement" ? DEFAULT_RETIREMENT_STATUSES : []
    );
  };

  const normalizeApiRows = (
    responseData: TerminationRequestApiResponse
  ): TerminationRequest[] => {
    const rows = Array.isArray(responseData)
      ? responseData
      : responseData.content ?? responseData.data ?? responseData.requests ?? [];

    return rows.map((row) => {
      const nestedMember =
        typeof row.member === "object" && row.member !== null
          ? row.member
          : null;

      return {
        id: String(row.id ?? row.requestId ?? row.requestNo ?? row.requestNumber ?? ""),
        requestId: row.requestId ?? row.requestNo ?? row.requestNumber ?? "-",
        date: row.requestedDate ?? row.date ?? "-",
        member:
          row.memberName ??
          row.memberFullName ??
          row.fullName ??
          row.nameWithInitials ??
          row.employeeName ??
          nestedMember?.fullName ??
          nestedMember?.nameWithInitials ??
          nestedMember?.memberName ??
          (typeof row.member === "string" ? row.member : "-"),
        nameAsInPayroll: row.nameAsInPayroll ?? "-",
        nameWithInitials:
          row.nameWithInitials ?? nestedMember?.nameWithInitials ?? "-",
        memberNumber:
          row.memberNumber ??
          row.memberNo ??
          row.memberId ??
          nestedMember?.memberId ??
          "-",
        nicNumber: row.nicNumber ?? row.nicNo ?? row.memberNic ?? row.nic ?? "-",
        hasLoanBalance:
          row.hasLoanBalance ??
          row.hasOutstandingLoans ??
          Number(row.totalOutstandingLoanBalance ?? 0) > 0,
        hasIndirectObligations:
          row.hasIndirectObligations ??
          row.indirectObligations ??
          row.hasLoanObligations ??
          false,
        reason: row.reason ?? row.terminationReason ?? "-",
        status: row.status ?? "NEW",
      };
    });
  };

  const matchesCurrentFilters = (request: TerminationRequest) => {
    const matchesStatus =
      selectedStatuses.length === 0 ||
      selectedStatuses.includes(request.status.toLowerCase() as StatusType);
    const searchKey = searchQuery.toLowerCase();
    const matchesSearch =
      searchKey === "" ||
      request.member.toLowerCase().includes(searchKey) ||
      request.nameAsInPayroll.toLowerCase().includes(searchKey) ||
      request.nameWithInitials.toLowerCase().includes(searchKey) ||
      request.memberNumber.toLowerCase().includes(searchKey) ||
      request.nicNumber.toLowerCase().includes(searchKey);

    let matchesDateFilter = true;
    const requestDate = new Date(request.date);

    if (dateFilter === "this_month") {
      const { from, to } = getCurrentMonthRange();
      matchesDateFilter = requestDate >= new Date(from) && requestDate <= new Date(to);
    } else if (dateFilter === "this_and_last_month") {
      const { from, to } = getThisAndLastMonthRange();
      matchesDateFilter = requestDate >= new Date(from) && requestDate <= new Date(to);
    } else if (dateFilter === "date_period" && fromDate && toDate) {
      matchesDateFilter = requestDate >= new Date(fromDate) && requestDate <= new Date(toDate);
    }

    return matchesStatus && matchesSearch && matchesDateFilter;
  };

  const sortRequests = (rows: TerminationRequest[]) => {
    return [...rows].sort((a, b) => {
      let compareValue = 0;

      if (sortBy === "requestedDate") {
        compareValue = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === "status") {
        compareValue = a.status.localeCompare(b.status);
      } else if (sortBy === "memberId") {
        compareValue = a.memberNumber.localeCompare(b.memberNumber);
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      if (dateFilter === "date_period") {
        if (fromDate && fromDate > TODAY) {
          setError("From Date cannot be a future date.");
          setRequests([]);
          setSelectedRequests([]);
          return;
        }

        if (toDate && toDate > TODAY) {
          setError("To Date cannot be a future date.");
          setRequests([]);
          setSelectedRequests([]);
          return;
        }
      }

      if (requestType !== "all" && requestType !== "retirement") {
        setRequests([]);
        setSelectedRequests([]);
        return;
      }

      const params = new URLSearchParams();

      if (requestType === "all" || requestType === "retirement") {
        params.append("requestType", "retirement");
      }

      selectedStatuses.forEach((status) =>
        params.append("statuses", status.toUpperCase())
      );

      if (searchQuery.trim()) {
        params.append("searchKey", searchQuery.trim());
      }

      selectedLocations.forEach((location) =>
        params.append("location", location)
      );

      if (dateFilter === "this_month") {
        const { from, to } = getCurrentMonthRange();
        params.append("fromDate", from);
        params.append("toDate", to);
      } else if (dateFilter === "this_and_last_month") {
        const { from, to } = getThisAndLastMonthRange();
        params.append("fromDate", from);
        params.append("toDate", to);
      } else if (dateFilter === "date_period" && fromDate && toDate) {
        params.append("fromDate", fromDate);
        params.append("toDate", toDate);
      }

      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);

      const response = await fetch(
        `${API_BASE_URL}/api/retirement-requests?${params.toString()}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        setError(errorText || "Failed to retrieve requests.");
        setRequests([]);
        return;
      }

      const data = (await response.json()) as TerminationRequestApiResponse;
      const retrievedRequests = normalizeApiRows(data).filter(matchesCurrentFilters);
      setRequests(sortRequests(retrievedRequests));
      setSelectedRequests([]);
    } catch (requestError) {
      console.error("Retrieve termination requests error:", requestError);
      setError("Failed to retrieve requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests;
  }, [requests]);

  const handleSelectRequest = (requestId: string) => {
    setSelectedRequests((prev) =>
      prev.includes(requestId) ? prev.filter((id) => id !== requestId) : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.map((req) => req.id));
    }
  };

  const getStatusBadge = (status: TerminationRequest["status"]) => {
    const config: Record<string, { color: string; label: string }> = {
      NEW: { color: "bg-blue-100 text-blue-800", label: "NEW" },
      SUBMITTED_FOR_APPROVAL: { color: "bg-purple-100 text-purple-800", label: "SUBMITTED FOR APPROVAL" },
      ADDED_TO_APPROVAL_LIST: { color: "bg-indigo-100 text-indigo-800", label: "ADDED TO APPROVAL LIST" },
      APPROVED: { color: "bg-green-100 text-green-800", label: "APPROVED" },
      REJECTED: { color: "bg-red-100 text-red-800", label: "REJECTED" },
      INCOMPLETE: { color: "bg-gray-100 text-gray-800", label: "INCOMPLETE" },
    };

    const { color, label } = config[status];
    return (
      <Badge variant="secondary" className={`${color} hover:${color}`}>
        {label}
      </Badge>
    );
  };

  const handleEditRequest = (request: TerminationRequest) => {
    router.push(
      `/membership/directory/retirement?requestId=${encodeURIComponent(
        request.id
      )}&memberId=${encodeURIComponent(request.memberNumber)}&mode=edit`
    );
  };

  const handleOpenRequest = (request: TerminationRequest) => {
    router.push(
      `/membership/directory/retirement?requestId=${encodeURIComponent(
        request.id
      )}&memberId=${encodeURIComponent(request.memberNumber)}&mode=view`
    );
  };

  const handleRetrieve = () => {
    fetchRequests();
  };

  const handleViewApprovalLists = () => {
    router.push("/membership/termination/approval-lists");
  };

  const handleCreateApprovalList = () => {
    if (selectedRequests.length === 0) {
      alert("Please select at least one request to create an approval list.");
      return;
    }
    console.log("Creating approval list with selected requests:", selectedRequests);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-10 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#8B4513]">Termination & Retirement Requests</h1>
        {requestType !== "retirement" && (
          <div className="flex gap-2">
            <Button
              onClick={handleCreateApprovalList}
              disabled={selectedRequests.length === 0}
              className="bg-[#8B4513] hover:bg-[#A0522D] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Approval List
            </Button>
            <Button
              onClick={handleViewApprovalLists}
              variant="outline"
              className="border-[#8B4513] text-[#8B4513] hover:bg-[#8B4513] hover:text-white"
            >
              View Approval Lists
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-52">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Location</label>
              <LocationMultiSelect
                selectedLocations={selectedLocations}
                onLocationChange={setSelectedLocations}
              />
            </div>

            <div className="w-52">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Request Type</label>
              <Select value={requestType} onValueChange={(value) => handleRequestTypeChange(value as RequestType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="termination">Termination</SelectItem>
                  <SelectItem value="retirement">Retirement</SelectItem>
                  <SelectItem value="member_deaths">Member Deaths</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-52">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Request Received On</label>
              <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilterType)}>
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

            {dateFilter === "date_period" && (
              <>
                <div className="w-40">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">From Date</label>
                  <Input
                    type="date"
                    value={fromDate}
                    max={TODAY}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="w-40">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">To Date</label>
                  <Input
                    type="date"
                    value={toDate}
                    max={TODAY}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </>
            )}            
            
            <div className="w-52">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
              <StatusMultiSelect
                selectedStatuses={selectedStatuses}
                onStatusChange={setSelectedStatuses}
                statusOptions={currentStatusOptions}
              />
            </div>

            <div className="flex-1 min-w-45">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Search Member</label>
              <Input
                type="text"
                placeholder="Name, NIC, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="w-52">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select sort option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requestedDate">Requested Date</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="memberId">Member ID</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Sort Order</label>
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleRetrieve} className="bg-[#8B4513] hover:bg-[#A0522D] text-white">Retrieve</Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-white">
        {error && (
          <p className="border-b px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              {showRowSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedRequests.length === filteredRequests.length &&
                      filteredRequests.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                    disabled={filteredRequests.length === 0}
                  />
                </TableHead>
              )}
              <TableHead className="font-semibold">Request ID</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Member ID</TableHead>
              <TableHead className="font-semibold">Member Name</TableHead>
              <TableHead className="font-semibold">Indicators</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={showRowSelection ? 8 : 7} className="text-center py-8 text-muted-foreground">
                  Loading requests...
                </TableCell>
              </TableRow>
            ) : filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <TableRow className="h-12" key={request.id}>
                  {showRowSelection && (
                    <TableCell>
                      <Checkbox
                        checked={selectedRequests.includes(request.id)}
                        onCheckedChange={() => handleSelectRequest(request.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleOpenRequest(request)}
                      className="font-medium text-[#8B4513] hover:underline"
                    >
                      {request.requestId}
                    </button>
                  </TableCell>
                  <TableCell>{request.date}</TableCell>
                  <TableCell>{request.memberNumber}</TableCell>
                  <TableCell>{request.member}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {request.hasLoanBalance && (
                        <CircleDollarSign
                          className="h-4 w-4 text-amber-600"
                          aria-label="Request has loan balance"
                        />
                      )}
                      {request.hasIndirectObligations && (
                        <AlertTriangle
                          className="h-4 w-4 text-red-600"
                          aria-label="Request has indirect obligations"
                        />
                      )}
                      {!request.hasLoanBalance &&
                        !request.hasIndirectObligations && (
                          <span className="text-muted-foreground"></span>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {!NON_EDITABLE_STATUSES.includes(request.status) && (
                        <Button variant="ghost" size="sm" onClick={() => handleEditRequest(request)} className="h-8 w-8 p-0">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="h-12">
                <TableCell colSpan={showRowSelection ? 8 : 7} className="text-center py-8 text-muted-foreground">No requests found. Try adjusting your search criteria.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredRequests.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredRequests.length} request(s){selectedRequests.length > 0 && ` • ${selectedRequests.length} selected`}
        </div>
      )}
    </div>
  );
}

