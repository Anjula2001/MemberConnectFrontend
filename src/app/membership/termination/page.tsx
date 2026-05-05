"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { ChevronDown, X, RefreshCw } from "lucide-react";
import { getBoardMeetings, type BoardMeetingDTO } from "@/lib/api/boardMeeting";
import { createTerminationApprovalList, type TerminationApprovalListDTO } from "@/lib/api/terminationApprovalLists";
import { getAllMemberDeathRecords } from "@/lib/api/memberDeath";

interface TerminationRequest {
  id: string; // Unique ID (type-numericId)
  originalId: string; // Database ID
  requestId: string;
  date: string;
  member: string;
  memberNumber: string;
  reason: string;
  type: RequestType;
  status: "NEW" | "SUBMITTED_FOR_APPROVAL" | "ADDED_TO_APPROVAL_LIST" | "APPROVED" | "REJECTED" | "INCOMPLETE" | "PENDING" | "PROCESSED" | "CANCELLED" | "DISTRICT_COMMITTEE" | "PD_COMMITTEE" | "INACTIVE";
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
  | "pending"
  | "processed"
  | "cancelled"
  ;

type DateFilterType = "all_days" | "this_month" | "this_and_last_month" | "date_period";
type SortBy = "requestedDate" | "status" | "memberId";
type SortOrder = "asc" | "desc";

// Status options by request type
const STATUS_OPTIONS_BY_TYPE: Record<RequestType, { value: StatusType; label: string }[]> = {
  termination: [
    { value: "new", label: "New" },
    { value: "pending", label: "Pending" },
    { value: "submitted_for_approval", label: "Submitted for Approval" },
    { value: "added_to_approval_list", label: "Added to Approval List" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "processed", label: "Processed" },
    { value: "cancelled", label: "Cancelled" },
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
    { value: "pending", label: "Pending" },
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
    { value: "processed", label: "Processed" },
    { value: "cancelled", label: "Cancelled" },
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
  const [requestType, setRequestType] = useState<RequestType>("all");
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(null);
      }
    }
    if (showStatusDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showStatusDropdown]);

  const ALL_STATUSES: { value: TerminationRequest["status"]; label: string }[] = [
    { value: "NEW",                   label: "New" },
    { value: "PENDING",               label: "Pending" },
    { value: "SUBMITTED_FOR_APPROVAL",label: "Submitted for Approval" },
    { value: "ADDED_TO_APPROVAL_LIST",label: "Added to Approval List" },
    { value: "APPROVED",              label: "Approved" },
    { value: "REJECTED",              label: "Rejected" },
    { value: "PROCESSED",             label: "Processed" },
    { value: "CANCELLED",             label: "Cancelled" },
    { value: "INCOMPLETE",            label: "Incomplete" },
  ];

  const handleChangeStatus = async (requestId: string, newStatus: TerminationRequest["status"]) => {
    setIsChangingStatus(true);
    try {
      // Find the request to get its type and originalId
      const request = requests.find(r => r.id === requestId);
      if (!request || request.type !== "termination") {
        alert("Status change only implemented for terminations here.");
        return;
      }

      const response = await fetch(
        `http://localhost:8080/api/terminations/updateTermination/${request.originalId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ terminationStatus: newStatus }),
        }
      );
      if (response.ok) {
        setRequests(prev =>
          prev.map(req => req.id === requestId ? { ...req, status: newStatus } : req)
        );
      } else {
        const err = await response.json().catch(() => ({ message: "Failed to update status" }));
        alert(err.message ?? "Failed to update status");
      }
    } catch {
      alert("Network error — could not update status.");
    } finally {
      setIsChangingStatus(false);
      setShowStatusDropdown(null);
    }
  };
  const [showBoardMeetingModal, setShowBoardMeetingModal] = useState(false);
  const [selectedBoardMeeting, setSelectedBoardMeeting] = useState("");
  const [boardMeetings, setBoardMeetings] = useState<BoardMeetingDTO[]>([]);
  const [isSavingApprovalList, setIsSavingApprovalList] = useState(false);
  const [createdApprovalList, setCreatedApprovalList] = useState<TerminationApprovalListDTO | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const loadBoardMeetings = async () => {
      try {
        const meetings = await getBoardMeetings();
        if (!isCancelled) setBoardMeetings(meetings);
      } catch (error) {
        console.error("Failed to load board meetings", error);
      }
    };
    void loadBoardMeetings();
    return () => { isCancelled = true; };
  }, []);

  const boardMeetingOptions = boardMeetings.map((meeting) => ({
    value: String(meeting.id ?? ""),
    label: `${meeting.scheduledDate ?? "Unknown date"} (${meeting.boardMeetingId ?? meeting.id ?? ""})`,
  }));

  const [selectedLocation, setSelectedLocation] = useState<string>("all"); const [dateFilter, setDateFilter] = useState<DateFilterType>("all_days");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("requestedDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [requests, setRequests] = useState<TerminationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTerminations = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/terminations/getAllTerminations");
        if (response.ok) {
          const data = await response.json();
        const mappedData: TerminationRequest[] = data.map((item: any) => ({
            id: `termination-${item.id}`,
            originalId: item.id?.toString() || "",
            requestId: item.terminationId || "",
            date: item.requestedDate || item.terminationDate || (item.createdAt ? item.createdAt.split('T')[0] : ""),
            member: item.memberName || "",
            memberNumber: item.memberId_Code || "",
            reason: item.terminationReason || "",
            type: "termination" as RequestType, // currently API only returns terminations
            status: item.terminationStatus || "PENDING",
          }));

          // Fetch member death records
          let deathRecords: TerminationRequest[] = [];
          try {
            const deaths = await getAllMemberDeathRecords();
            deathRecords = deaths.map((d: any) => ({
              id: `member_deaths-${d.id}`,
              originalId: d.id.toString(),
              requestId: d.recordId,
              date: d.informedDate || (d.createdAt ? d.createdAt.split('T')[0] : ""),
              member: d.memberName || "",
              memberNumber: d.memberNic || "",
              reason: d.causeOfDeath || "",
              type: "member_deaths" as RequestType,
              status: d.status,
            }));
          } catch (e) {
            console.error("Failed to fetch member death records", e);
          }

          setRequests([...mappedData, ...deathRecords]);
        } else {
          console.error("Failed to fetch terminations");
        }
      } catch (error) {
        console.error("Error fetching terminations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTerminations();
  }, []);

  // Get current status options based on request type
  const currentStatusOptions = STATUS_OPTIONS_BY_TYPE[requestType];

  // Handle request type change - reset selected statuses
  const handleRequestTypeChange = (newType: RequestType) => {
    setRequestType(newType);
    setSelectedStatuses([]); // Reset selected statuses when type changes
  };
  const filteredRequests = useMemo(() => {
    let filtered = requests.filter((request) => {
      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(request.status.toLowerCase() as StatusType);
      const matchesSearch =
        searchQuery === "" ||
        request.member.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.memberNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.requestId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = requestType === "all" || request.type === requestType;

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


  const selectableRequests = filteredRequests.filter(req => req.status === "SUBMITTED_FOR_APPROVAL" || req.status === "REJECTED");

  const handleSelectRequest = (requestId: string) => {
    setSelectedRequests((prev) =>
      prev.includes(requestId) ? prev.filter((id) => id !== requestId) : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRequests.length === selectableRequests.length && selectableRequests.length > 0) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(selectableRequests.map((req) => req.id));
    }
  };

  const getStatusBadge = (status: TerminationRequest["status"]) => {
    const config: Record<string, { color: string; label: string }> = {
      NEW: { color: "bg-blue-100 text-blue-800", label: "NEW" },
      PENDING: { color: "bg-yellow-100 text-yellow-800", label: "PENDING" },
      SUBMITTED_FOR_APPROVAL: { color: "bg-purple-100 text-purple-800", label: "SUBMITTED FOR APPROVAL" },
      ADDED_TO_APPROVAL_LIST: { color: "bg-indigo-100 text-indigo-800", label: "ADDED TO APPROVAL LIST" },
      APPROVED: { color: "bg-green-100 text-green-800", label: "APPROVED" },
      REJECTED: { color: "bg-red-100 text-red-800", label: "REJECTED" },
      INCOMPLETE: { color: "bg-gray-100 text-gray-800", label: "INCOMPLETE" },
      PROCESSED: { color: "bg-teal-100 text-teal-800", label: "PROCESSED" },
      CANCELLED: { color: "bg-gray-100 text-gray-800", label: "CANCELLED" },
      DISTRICT_COMMITTEE: { color: "bg-purple-100 text-purple-800", label: "DISTRICT COMMITTEE" },
      PD_COMMITTEE: { color: "bg-orange-100 text-orange-800", label: "P&D COMMITTEE" },
      INACTIVE: { color: "bg-gray-300 text-gray-800", label: "INACTIVE" },
    };

    const badgeConfig = config[status] || { color: "bg-gray-100 text-gray-800", label: status };
    return (
      <Badge variant="secondary" className={`${badgeConfig.color} hover:${badgeConfig.color}`}>
        {badgeConfig.label}
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
    setShowBoardMeetingModal(true);
  };

  const handleSaveBoardMeeting = async () => {
    if (!selectedBoardMeeting) return;
    const meetingId = Number(selectedBoardMeeting);
    const meeting = boardMeetings.find((m) => m.id === meetingId);
    if (!meeting || !meeting.id || !meeting.scheduledDate) {
      alert("Selected board meeting is not available.");
      return;
    }
    try {
      setIsSavingApprovalList(true);
      // We need to pass the original numeric IDs to the backend
      const originalTerminationIds = requests
        .filter(r => selectedRequests.includes(r.id) && r.type === "termination")
        .map(r => r.originalId);

      const createdList = await createTerminationApprovalList({
        boardMeetingId: meeting.id,
        boardMeetingDate: meeting.scheduledDate,
        terminationIds: originalTerminationIds,
      });
      setCreatedApprovalList(createdList);

      // Update local state to reflect new status
      setRequests(requests.map(req =>
        selectedRequests.includes(req.id) ? { ...req, status: "ADDED_TO_APPROVAL_LIST" } : req
      ));
      setSelectedRequests([]);

      setShowBoardMeetingModal(false);
      setSelectedBoardMeeting("");
      setShowConfirmModal(true);
    } catch (error) {
      console.error("Failed to create approval list", error);
      alert(error instanceof Error ? error.message : "Failed to create approval list");
    } finally {
      setIsSavingApprovalList(false);
    }
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
            Create Termination Approval List
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
                    selectedRequests.length === selectableRequests.length &&
                    selectableRequests.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                  disabled={selectableRequests.length === 0}
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading requests...</TableCell>
              </TableRow>
            ) : filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    {request.status === "SUBMITTED_FOR_APPROVAL" || request.status === "REJECTED" ? (
                      <Checkbox
                        checked={selectedRequests.includes(request.id)}
                        onCheckedChange={() => handleSelectRequest(request.id)}
                      />
                    ) : (
                      <span className="size-4 block" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={request.type === "member_deaths" ? `/membership/directory/record-member-death?id=${request.originalId}` : `/membership/directory/request-termination?terminationId=${request.originalId}&mode=view`} className="text-[#8B4513] hover:underline">
                      {request.requestId}
                    </Link>
                  </TableCell>
                  <TableCell>{request.date}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{request.member}</span>
                      <Link href={request.type === "member_deaths" ? `/membership/directory/record-member-death?id=${request.originalId}` : `/membership/directory/request-termination?terminationId=${request.originalId}&mode=view`} className="text-sm text-[#8B4513] hover:underline">
                        {request.memberNumber}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>{request.reason}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-center">
                    <div className="relative inline-block" ref={showStatusDropdown === request.id ? statusDropdownRef : undefined}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowStatusDropdown(showStatusDropdown === request.id ? null : request.id)}
                        className="h-8 gap-1.5 px-2 text-xs text-[#8B4513] hover:bg-[#8B4513]/10"
                        disabled={isChangingStatus}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Change Status
                        <ChevronDown className={`h-3 w-3 transition-transform ${showStatusDropdown === request.id ? "rotate-180" : ""}`} />
                      </Button>

                      {showStatusDropdown === request.id && (
                        <div className="absolute right-0 z-50 mt-1 w-52 rounded-md border border-gray-200 bg-white shadow-lg">
                          <div className="py-1">
                            {ALL_STATUSES.filter(s => s.value !== request.status).map(s => (
                              <button
                                key={s.value}
                                type="button"
                                onClick={() => void handleChangeStatus(request.id, s.value)}
                                className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-[#8B4513]/10 hover:text-[#8B4513] transition-colors"
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
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

      {showBoardMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[520px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <h2 className="text-[29px] font-semibold text-[#8B4513]">
                  Select Board Meeting
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select the Board Meeting date for these {selectedRequests.length} termination requests.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-500 h-8 w-8 p-0"
                onClick={() => setShowBoardMeetingModal(false)}
              >
                <X size={18} />
              </Button>
            </div>
            <div className="px-5 pb-5 pt-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Meeting Date</label>
                <Select value={selectedBoardMeeting} onValueChange={setSelectedBoardMeeting}>
                  <SelectTrigger className="h-11 w-full text-base">
                    <SelectValue placeholder="Select Meeting" />
                  </SelectTrigger>
                  <SelectContent>
                    {boardMeetingOptions.length === 0 ? (
                      <SelectItem value="no-meetings" disabled>No board meetings available</SelectItem>
                    ) : boardMeetingOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-7 flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" className="text-gray-700" onClick={() => setShowBoardMeetingModal(false)}>
                  Cancel
                </Button>
                <Button type="button" className="bg-[#8B4513] text-white hover:bg-[#A0522D]" disabled={!selectedBoardMeeting || isSavingApprovalList} onClick={handleSaveBoardMeeting}>
                  {isSavingApprovalList ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[460px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <h2 className="text-3xl font-semibold text-[#8B4513]">Confirmation</h2>
              <Button type="button" variant="ghost" size="sm" className="text-gray-500 h-8 w-8 p-0" onClick={() => setShowConfirmModal(false)}>
                <X size={18} />
              </Button>
            </div>
            <div className="px-5 pb-5 pt-1">
              <p className="text-lg leading-relaxed text-gray-600">
                The Termination Approval List for {createdApprovalList?.terminationIds?.length || 0} requests has been created. Do you want to view the list?
              </p>
              <div className="mt-6 flex items-center justify-end gap-2">
                <Button type="button" className="bg-[#e3ac00] text-white hover:bg-[#c99500]" onClick={() => setShowConfirmModal(false)}>
                  No
                </Button>
                <Button type="button" className="bg-[#8B4513] text-white hover:bg-[#A0522D]" onClick={() => { setShowConfirmModal(false); handleViewApprovalLists(); }}>
                  Yes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
