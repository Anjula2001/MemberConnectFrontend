"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,} from "@/src/components/ui/select";
import { Input } from "@/src/components/ui/input";
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow,} from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Checkbox } from "@/src/components/ui/checkbox";
import {AlertTriangle,CircleDollarSign,Pencil,ChevronDown,X,} from "lucide-react";
import { getBoardMeetings, type BoardMeetingDTO } from "@/lib/api/boardMeeting";
import {
  createTerminationApprovalList,
  type TerminationApprovalListDTO,
} from "@/lib/api/terminationApprovalLists";

interface TerminationRequest {
  id: string;
  requestId: string;
  sourceType: "termination" | "retirement";
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
type StatusType = | "new" | "submitted_for_approval" | "added_to_approval_list" | "approved" | "rejected" | "incomplete"
                  |"pending_review"| "approved_by_board"| "disbursement_initiated"| "disbursement_completed"
                  | "awaiting_nominee_confirmation"| "on_hold"| "district-committee"| "pnd-committee"| "inactive";

type DateFilterType = "all_days" | "this_month" | "this_and_last_month" | "date_period";
type SortBy = "requestedDate" | "status" | "memberId";
type SortOrder = "asc" | "desc";

const API_BASE_URL = "http://localhost:8080";
const TODAY = new Date().toISOString().split("T")[0];
const DEFAULT_RETIREMENT_STATUSES: StatusType[] = ["new","submitted_for_approval",];
const DEFAULT_TERMINATION_STATUSES: StatusType[] = ["new","submitted_for_approval"];
const NON_EDITABLE_STATUSES: TerminationRequest["status"][] = ["SUBMITTED_FOR_APPROVAL","ADDED_TO_APPROVAL_LIST","APPROVED","REJECTED",];
const APPROVAL_LIST_SELECTABLE_STATUSES: TerminationRequest["status"][] = [
  "SUBMITTED_FOR_APPROVAL",
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

  //Fiter state value
  const [requestType, setRequestType] = useState<RequestType>("all");
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>(DEFAULT_RETIREMENT_STATUSES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all_days");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("requestedDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [requests, setRequests] = useState<TerminationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showBoardMeetingModal, setShowBoardMeetingModal] = useState(false);
  const [selectedBoardMeeting, setSelectedBoardMeeting] = useState("");
  const [boardMeetings, setBoardMeetings] = useState<BoardMeetingDTO[]>([]);
  const [isSavingApprovalList, setIsSavingApprovalList] = useState(false);
  const [createdApprovalList, setCreatedApprovalList] =
    useState<TerminationApprovalListDTO | null>(null);
  const [showCreationConfirmModal, setShowCreationConfirmModal] = useState(false);
  const [createdListRequestCount, setCreatedListRequestCount] = useState(0);
  const showRowSelection = requestType === "termination";
  const showRequestTypeColumn = requestType === "all";
  const tableColumnCount =
    7 + (showRequestTypeColumn ? 1 : 0) + (showRowSelection ? 1 : 0);

  // Get current status options based on request type
  const currentStatusOptions = STATUS_OPTIONS_BY_TYPE[requestType];

  // Handle request type change - reset selected statuses
  const handleRequestTypeChange = (newType: RequestType) => {
    setRequestType(newType);
    setSelectedStatuses(
      newType === "retirement"
        ? DEFAULT_RETIREMENT_STATUSES
        : newType === "termination"
          ? DEFAULT_TERMINATION_STATUSES
          : []
    );
  };

  const normalizeApiRows = (
    responseData: TerminationRequestApiResponse,
    sourceType: "termination" | "retirement"
  ): TerminationRequest[] => {
    const rows = Array.isArray(responseData)
      ? responseData
      : responseData.content ?? responseData.data ?? responseData.requests ?? [];

    return rows.map((row) => {
      const nestedMember =
        typeof row.member === "object" && row.member !== null
          ? row.member
          : null;

      const requestId = row.requestId ?? row.requestNo ?? row.requestNumber ?? "-";

      return {
        id: requestId !== "-" ? requestId : `${sourceType}-${String(row.id ?? "")}`,
        requestId,
        sourceType,
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

  const buildQueryParams = () => {
    const params = new URLSearchParams();

    selectedStatuses.forEach((status) =>
      params.append("statuses", status.toUpperCase())
    );

    if (searchQuery.trim()) {
      params.append("searchKey", searchQuery.trim());
    }

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

    return params;
  };

  const fetchRequestsFromApi = async (
    apiPath: "termination-requests" | "retirement-requests",
    sourceType: "termination" | "retirement"
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/api/${apiPath}?${buildQueryParams().toString()}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to retrieve requests.");
    }

    const data = (await response.json()) as TerminationRequestApiResponse;
    return normalizeApiRows(data, sourceType);
  };

  const sortMergedRequests = (requests: TerminationRequest[]) => {
    return [...requests].sort((a, b) => {
      let result = 0;

      if (sortBy === "status") {
        result = a.status.localeCompare(b.status);
      } else if (sortBy === "memberId") {
        result = a.memberNumber.localeCompare(b.memberNumber);
      } else {
        result = a.date.localeCompare(b.date);
      }

      return sortOrder === "desc" ? -result : result;
    });
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");
      
      //Validate Dates
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

      if (requestType !== "all" && requestType !== "retirement" && requestType !== "termination") {
        setRequests([]);
        setSelectedRequests([]);
        return;
      }

      let retrievedRequests: TerminationRequest[];

      if (requestType === "all") {
        const [terminationRequests, retirementRequests] = await Promise.all([
          fetchRequestsFromApi("termination-requests", "termination"),
          fetchRequestsFromApi("retirement-requests", "retirement"),
        ]);
        retrievedRequests = sortMergedRequests([
          ...terminationRequests,
          ...retirementRequests,
        ]);
      } else if (requestType === "termination") {
        retrievedRequests = await fetchRequestsFromApi(
          "termination-requests",
          "termination"
        );
      } else {
        retrievedRequests = await fetchRequestsFromApi(
          "retirement-requests",
          "retirement"
        );
      }

      setRequests(retrievedRequests);
      setSelectedRequests([]);
    } catch (requestError) {
      console.error("Retrieve termination requests error:", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to retrieve requests."
      );
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const isSelectableRequest = (request: TerminationRequest) =>
    request.sourceType === "termination" &&
    APPROVAL_LIST_SELECTABLE_STATUSES.includes(request.status);

  const selectableRequests = useMemo(
    () => requests.filter(isSelectableRequest),
    [requests]
  );

  const handleSelectRequest = (requestId: string) => {
    const request = requests.find((item) => item.id === requestId);
    if (!request || !isSelectableRequest(request)) return;

    setSelectedRequests((prev) =>
      prev.includes(requestId) ? prev.filter((id) => id !== requestId) : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    const selectableIds = selectableRequests.map((req) => req.id);
    const allSelected =
      selectableIds.length > 0 &&
      selectableIds.every((id) => selectedRequests.includes(id));

    if (allSelected) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(selectableIds);
    }
  };

  useEffect(() => {
    if (!showBoardMeetingModal) return;

    const loadBoardMeetings = async () => {
      try {
        const meetings = await getBoardMeetings();
        setBoardMeetings(meetings);
      } catch (loadError) {
        console.error("Failed to load board meetings:", loadError);
        setError("Failed to load board meetings.");
      }
    };

    loadBoardMeetings();
  }, [showBoardMeetingModal]);

  const boardMeetingOptions = useMemo(
    () =>
      boardMeetings
        .filter((meeting) => meeting.id != null && meeting.scheduledDate)
        .map((meeting) => ({
          value: String(meeting.id),
          label: `${meeting.scheduledDate}${meeting.boardMeetingId ? ` (${meeting.boardMeetingId})` : ""}`,
        })),
    [boardMeetings]
  );

  const getStatusBadge = (status: TerminationRequest["status"]) => {
    const config: Record<string, { color: string; label: string }> = {
      NEW: { color: "bg-blue-100 text-blue-800", label: "NEW" },
      SUBMITTED_FOR_APPROVAL: { color: "bg-purple-100 text-purple-800", label: "SUBMITTED FOR APPROVAL" },
      ADDED_TO_APPROVAL_LIST: { color: "bg-indigo-100 text-indigo-800", label: "ADDED TO APPROVAL LIST" },
      APPROVED: { color: "bg-green-100 text-green-800", label: "APPROVED" },
      REJECTED: { color: "bg-red-100 text-red-800", label: "REJECTED" },
      INCOMPLETE: { color: "bg-gray-100 text-gray-800", label: "INCOMPLETE" },
      INACTIVE: { color: "bg-gray-100 text-gray-600", label: "INACTIVE" },
    };

    const { color, label } = config[status] ?? {
      color: "bg-gray-100 text-gray-800",
      label: status.replaceAll("_", " "),
    };
    return (
      <Badge variant="secondary" className={`${color} hover:${color}`}>
        {label}
      </Badge>
    );
  };

  const getRequestBasePath = (sourceType: TerminationRequest["sourceType"]) =>
    sourceType === "termination"
      ? "/membership/directory/termination-request"
      : "/membership/directory/retirement";

  const handleEditRequest = (request: TerminationRequest) => {
    router.push(
      `${getRequestBasePath(request.sourceType)}?requestId=${encodeURIComponent(request.id)}&memberId=${encodeURIComponent(request.memberNumber)}&mode=edit`
    );
  };

  const handleOpenRequest = (request: TerminationRequest) => {
    router.push(
      `${getRequestBasePath(request.sourceType)}?requestId=${encodeURIComponent(request.id)}&memberId=${encodeURIComponent(request.memberNumber)}&mode=view`
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
      setError("Please select at least one termination request to create an approval list.");
      return;
    }
    setShowBoardMeetingModal(true);
  };

  const handleCloseBoardMeetingModal = () => {
    setShowBoardMeetingModal(false);
    setSelectedBoardMeeting("");
  };

  const handleSaveBoardMeeting = async () => {
    if (!selectedBoardMeeting) return;

    const meetingId = Number(selectedBoardMeeting);
    const meeting = boardMeetings.find((item) => item.id === meetingId);
    if (!meeting?.id || !meeting.scheduledDate) {
      setError("Selected board meeting is not available.");
      return;
    }

    try {
      setIsSavingApprovalList(true);
      setError("");

      const createdList = await createTerminationApprovalList({
        boardMeetingId: meeting.id,
        boardMeetingDate: meeting.scheduledDate,
        requestNos: selectedRequests,
      });

      setCreatedApprovalList(createdList);
      setCreatedListRequestCount(selectedRequests.length);
      setRequests((prev) =>
        prev.map((row) =>
          selectedRequests.includes(row.id)
            ? { ...row, status: "ADDED_TO_APPROVAL_LIST" as const }
            : row
        )
      );
      setSelectedRequests([]);
      setShowBoardMeetingModal(false);
      setSelectedBoardMeeting("");
      setShowCreationConfirmModal(true);
    } catch (saveError) {
      console.error("Failed to create termination approval list:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to create termination approval list."
      );
    } finally {
      setIsSavingApprovalList(false);
    }
  };

  const handleCloseCreationConfirmModal = () => {
    setShowCreationConfirmModal(false);
    setCreatedApprovalList(null);
  };

  const handleViewCreatedList = () => {
    setShowCreationConfirmModal(false);
    setCreatedApprovalList(null);
    router.push("/membership/termination/approval-lists");
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
              Create Termination Approval List
            </Button>
            <Button
              onClick={handleViewApprovalLists}
              variant="outline"
              className="border-[#8B4513] text-[#8B4513] hover:bg-[#8B4513] hover:text-white"
            >
              View Termination Approval Lists
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-[#953002] mb-4">
          Search & Filter
        </h2>
       
       
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
      </div>
      

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
                      selectableRequests.length > 0 &&
                      selectableRequests.every((req) => selectedRequests.includes(req.id))
                    }
                    onCheckedChange={handleSelectAll}
                    disabled={selectableRequests.length === 0}
                  />
                </TableHead>
              )}
              <TableHead className="font-semibold px-6 py-3">Request ID</TableHead>
              {showRequestTypeColumn && (
                <TableHead className="font-semibold px-6 py-3">Type</TableHead>
              )}
              <TableHead className="font-semibold px-6 py-3">Date</TableHead>
              <TableHead className="font-semibold px-6 py-3">Member ID</TableHead>
              <TableHead className="font-semibold px-6 py-3">Member Name</TableHead>
              <TableHead className="font-semibold px-6 py-3">Indicators</TableHead>
              <TableHead className="font-semibold px-6 py-3">Status</TableHead>
              <TableHead className="font-semibold text-center px-6 py-3">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={tableColumnCount} className="text-center py-8 text-muted-foreground">
                  Loading requests...
                </TableCell>
              </TableRow>
            ) : requests.length > 0 ? (
              requests.map((request) => (
                <TableRow className="h-12" key={request.id}>
                  {showRowSelection && (
                    <TableCell>
                      <Checkbox
                        checked={selectedRequests.includes(request.id)}
                        onCheckedChange={() => handleSelectRequest(request.id)}
                        disabled={!isSelectableRequest(request)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="px-6">
                    <button
                      type="button"
                      onClick={() => handleOpenRequest(request)}
                      className="font-medium text-[#8B4513] hover:underline"
                    >
                      {request.requestId}
                    </button>
                  </TableCell>
                  {showRequestTypeColumn && (
                    <TableCell className="px-6 capitalize">{request.sourceType}</TableCell>
                  )}
                  <TableCell className="px-6">{request.date}</TableCell>
                  <TableCell className="px-6">{request.memberNumber}</TableCell>
                  <TableCell className="px-6">{request.member}</TableCell>
                  <TableCell className="px-6">
                    <div className="flex px-6 items-center gap-2">
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
                      {!request.hasLoanBalance &&!request.hasIndirectObligations && (
                        <span className="text-muted-foreground"></span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className=" text-center">
                    <div className="flex items-center justify-center gap-2">
                      {!NON_EDITABLE_STATUSES.includes(request.status) && (
                        <Button variant="ghost" size="sm" 
                          onClick={() => handleEditRequest(request)} 
                          className="h-8 w-8 p-0">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="h-12">
                <TableCell colSpan={tableColumnCount} className="text-center py-8 text-muted-foreground">To load data click retrive button </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {requests.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {requests.length} request(s){selectedRequests.length > 0 && ` • ${selectedRequests.length} selected`}
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
                  Select the Board Meeting for {selectedRequests.length} termination request(s).
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-gray-500"
                onClick={handleCloseBoardMeetingModal}
                aria-label="Close board meeting modal"
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
                      <SelectItem value="no-meetings" disabled>
                        No board meetings available
                      </SelectItem>
                    ) : (
                      boardMeetingOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-7 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-gray-700"
                  onClick={handleCloseBoardMeetingModal}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-[#8B4513] text-white hover:bg-[#A0522D]"
                  disabled={!selectedBoardMeeting || isSavingApprovalList}
                  onClick={handleSaveBoardMeeting}
                >
                  {isSavingApprovalList ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreationConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[460px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <h2 className="text-3xl font-semibold text-[#8B4513]">Confirmation</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-gray-500"
                onClick={handleCloseCreationConfirmModal}
                aria-label="Close confirmation modal"
              >
                <X size={18} />
              </Button>
            </div>

            <div className="px-5 pb-5 pt-1">
              <p className="text-lg leading-relaxed text-gray-600">
                The Termination Approval List for{" "}
                {createdApprovalList?.requestNos?.length ?? createdListRequestCount} request(s)
                has been created. Do you want to view the list?
              </p>

              <div className="mt-6 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  className="bg-[#e3ac00] text-white hover:bg-[#c99500]"
                  onClick={handleCloseCreationConfirmModal}
                >
                  No
                </Button>
                <Button
                  type="button"
                  className="bg-[#8B4513] text-white hover:bg-[#A0522D]"
                  onClick={handleViewCreatedList}
                >
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

