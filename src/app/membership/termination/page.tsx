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
import { Eye, Pencil, ChevronDown } from "lucide-react";

interface TerminationRequest {
  id: string;
  requestId: string;
  date: string;
  member: string;
  memberNumber: string;
  reason: string;
  status: "NEW" | "SUBMITTED_FOR_APPROVAL" | "ADDED_TO_APPROVAL_LIST" | "APPROVED" | "REJECTED" | "INCOMPLETE";
}

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

// Location configuration
const AVAILABLE_LOCATIONS = [
  { id: "all", name: "All Locations" },
  { id: "district1", name: "District 1" },
  { id: "district2", name: "District 2" },
  { id: "district3", name: "District 3" },
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
  const [requestType, setRequestType] = useState<RequestType>("termination");
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");  const [dateFilter, setDateFilter] = useState<DateFilterType>("all_days");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("requestedDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Get current status options based on request type
  const currentStatusOptions = STATUS_OPTIONS_BY_TYPE[requestType];

  // Handle request type change - reset selected statuses
  const handleRequestTypeChange = (newType: RequestType) => {
    setRequestType(newType);
    setSelectedStatuses([]); // Reset selected statuses when type changes
  };

  // Sample data - replace with API data
  const requests: TerminationRequest[] = [
    {
      id: "1",
      requestId: "TR-2026-003",
      date: "2026-02-06",
      member: "Jane Smith",
      memberNumber: "MR-001002",
      reason: "Personal reasons",
      status: "NEW",
    },
  ];
  const filteredRequests = useMemo(() => {
    let filtered = requests.filter((request) => {
      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(request.status.toLowerCase() as StatusType);
      const matchesSearch =
        searchQuery === "" ||
        request.member.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.memberNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.requestId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = requestType === "all" || (requestType === "termination" ? true : true);

      // Date filtering logic
      let matchesDateFilter = true;
      const requestDate = new Date(request.date);

      if (dateFilter === "this_month") {
        const { from, to } = getCurrentMonthRange();
        matchesDateFilter = requestDate >= new Date(from) && requestDate <= new Date(to);
      } else if (dateFilter === "this_and_last_month") {
        const { from, to } = getThisAndLastMonthRange();
        matchesDateFilter = requestDate >= new Date(from) && requestDate <= new Date(to);
      } else if (dateFilter === "date_period") {
        if (fromDate && toDate) {
          matchesDateFilter = requestDate >= new Date(fromDate) && requestDate <= new Date(toDate);
        }
      }

      return matchesStatus && matchesSearch && matchesType && matchesDateFilter;
    });

    // Sorting logic
    filtered.sort((a, b) => {
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

    return filtered;
  }, [requests, selectedStatuses, searchQuery, requestType, dateFilter, fromDate, toDate, sortBy, sortOrder]);

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

  const handleViewRequest = (requestId: string) => {
    console.log("View request:", requestId);
  };

  const handleEditRequest = (requestId: string) => {
    console.log("Edit request:", requestId);
  };

  const handleRetrieve = () => {
    console.log("Retrieving requests with filters:", { 
      location: selectedLocation,
      requestType, 
      selectedStatuses, 
      searchQuery,
      dateFilter,
      fromDate,
      toDate,
    });
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
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#8B4513]">Termination & Retirement Requests</h1>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-52">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_LOCATIONS.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="w-40">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">To Date</label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </>
            )}            <div className="w-52">
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
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
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
              <TableHead className="font-semibold">Request ID</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Member</TableHead>
              <TableHead className="font-semibold">Reason</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRequests.includes(request.id)}
                      onCheckedChange={() => handleSelectRequest(request.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{request.requestId}</TableCell>
                  <TableCell>{request.date}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{request.member}</span>
                      <span className="text-sm text-muted-foreground">{request.memberNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell>{request.reason}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewRequest(request.id)} className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditRequest(request.id)} className="h-8 w-8 p-0">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No requests found. Try adjusting your search criteria.</TableCell>
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