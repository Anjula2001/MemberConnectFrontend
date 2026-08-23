"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/src/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/src/components/ui/select";
import { Input } from "@/src/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Checkbox } from "@/src/components/ui/checkbox";
import { AlertTriangle, CircleDollarSign, Pencil, ChevronDown, ShieldAlert, X, } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { SRI_LANKAN_DISTRICTS } from "@/lib/districts";
import { useAuth } from "@/lib/auth-context";
import {
  BOARD_MEETING_VIEW_ROLES,
  MEMBER_DEATH_ENTRY_ROLES,
  MEMBER_DEATH_ONLY_ROLES,
  MEMBER_DEATH_VIEW_ROLES,
  TERMINATION_BOARD_ROLES,
  TERMINATION_VIEW_ROLES,
  hasRetPermission,
  hasRole,
  isLocationRestricted,
} from "@/lib/permissions";
import { getBoardMeetings, type BoardMeetingDTO } from "@/lib/api/boardMeeting";
import {
  createTerminationApprovalList,
  type TerminationApprovalListDTO,
} from "@/lib/api/terminationApprovalLists";
import { searchRetirementRequests } from "@/lib/api/retirementRequests";
import { cn } from "@/lib/utils";

interface TerminationRequest {
  id: string;
  requestId: string;
  sourceType: "termination" | "retirement" | "member_death";
  date: string;
  member: string;
  nameAsInPayroll: string;
  nameWithInitials: string;
  memberNumber: string;
  nicNumber: string;
  hasLoanBalance: boolean;
  hasIndirectObligations: boolean;
  reason: string;
  status: "NEW" | "SUBMITTED_FOR_APPROVAL" | "ADDED_TO_APPROVAL_LIST" | "APPROVED" | "REJECTED" | "INCOMPLETE" | "DISTRICT_COMMITTEE" | "PD_COMMITTEE" | "INACTIVE";
  selectable: boolean;
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
  status?: TerminationRequest["status"] | string;
  recordNo?: string;
  informedDate?: string;
  causeOfDeathName?: string;
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
  | "pending_review" | "approved_by_board" | "disbursement_initiated" | "disbursement_completed"
  | "awaiting_nominee_confirmation" | "on_hold" | "district-committee" | "pnd-committee" | "inactive";

type DateFilterType = "all_days" | "this_month" | "this_and_last_month" | "date_period";
type SortBy = "requestedDate" | "status" | "memberId";
type SortOrder = "asc" | "desc";

const TODAY = new Date().toISOString().split("T")[0];


const filterSchema = z
  .object({
    dateFilter: z.string(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dateFilter !== "date_period") return;

    if (!data.fromDate) {
      ctx.addIssue({
        code: "custom",
        path: ["fromDate"],
        message: "From Date is required",
      });
    }

    if (!data.toDate) {
      ctx.addIssue({
        code: "custom",
        path: ["toDate"],
        message: "To Date is required",
      });
    }

    if (data.fromDate && data.fromDate > TODAY) {
      ctx.addIssue({
        code: "custom",
        path: ["fromDate"],
        message: "From Date cannot be a future date",
      });
    }

    if (data.toDate && data.toDate > TODAY) {
      ctx.addIssue({
        code: "custom",
        path: ["toDate"],
        message: "To Date cannot be a future date",
      });
    }

    if (data.fromDate && data.toDate && data.toDate < data.fromDate) {
      ctx.addIssue({
        code: "custom",
        path: ["toDate"],
        message: "To Date cannot be earlier than From Date",
      });
    }
  });
  
const DEFAULT_RETIREMENT_STATUSES: StatusType[] = ["new", "submitted_for_approval",];
const DEFAULT_TERMINATION_STATUSES: StatusType[] = ["submitted_for_approval", "rejected", "added_to_approval_list",];

// Committee statuses will be selected." Those are the four that still need somebody to act on them.
const DEFAULT_MEMBER_DEATH_STATUSES: StatusType[] = [
  "new",
  "submitted_for_approval",
  "district-committee",
  "pnd-committee",
];
const TERMINATION_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  SUBMITTED_FOR_APPROVAL: "Submitted for Approval",
  ADDED_TO_APPROVAL_LIST: "Added to Termination Approval List",
  DISTRICT_COMMITTEE: "District Committee",
  PD_COMMITTEE: "P&D Committee",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  INCOMPLETE: "Incomplete",
  INACTIVE: "Inactive",
};
const SELECTABLE_TERMINATION_STATUSES: TerminationRequest["status"][] = ["SUBMITTED_FOR_APPROVAL", "REJECTED",];
const NON_EDITABLE_STATUSES: TerminationRequest["status"][] = ["SUBMITTED_FOR_APPROVAL", "ADDED_TO_APPROVAL_LIST", "APPROVED", "REJECTED",];

// Status options by request type
const STATUS_OPTIONS_BY_TYPE: Record<RequestType, { value: StatusType; label: string }[]> = {
  termination: [
    { value: "new", label: "New" },
    { value: "submitted_for_approval", label: "Submitted for Approval" },
    { value: "added_to_approval_list", label: "Added to Termination Approval List" },
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
    { value: "added_to_approval_list", label: "Added to Termination Approval List" },
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
  availableLocations,
  disabled = false,
}: {
  selectedLocations: string[];
  onLocationChange: (locations: string[]) => void;
  availableLocations: { id: string; name: string }[];
  /**a user with access to only their own district gets this un-editable. */
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locationOptions = availableLocations;
  const allSelected = selectedLocations.includes(ALL_LOCATIONS_OPTION.id);

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
    if (locationId === ALL_LOCATIONS_OPTION.id) {
      onLocationChange(allSelected ? [] : [ALL_LOCATIONS_OPTION.id]);
      return;
    }

    const withoutAll = selectedLocations.filter(
      (id) => id !== ALL_LOCATIONS_OPTION.id
    );

    onLocationChange(
      withoutAll.includes(locationId)
        ? withoutAll.filter((id) => id !== locationId)
        : [...withoutAll, locationId]
    );
  };

  const displayText =
    allSelected || selectedLocations.length === 0
      ? ALL_LOCATIONS_OPTION.name
      : selectedLocations.length === 1
        ? locationOptions.find((location) => location.id === selectedLocations[0])?.name
        : `${selectedLocations.length} selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        title={disabled ? "You can only view your own district's requests." : undefined}
        className={cn(
          "w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-transparent flex items-center justify-between",
          disabled
            ? "bg-gray-100 text-gray-600 cursor-not-allowed"
            : "bg-white hover:bg-gray-50"
        )}
      >
        <span className="text-sm">{displayText}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && !disabled && (
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


const ALL_LOCATIONS_OPTION = { id: "all", name: "All Locations" };


const LOCATION_OPTIONS = [
  ALL_LOCATIONS_OPTION,
  ...SRI_LANKAN_DISTRICTS.map((district) => ({ id: district, name: district })),
];


const resolveLocationId = (
  district: string | null | undefined,
  options: { id: string; name: string }[]
): string | null => {
  if (!district?.trim()) return null;

  const key = (value: string) => value.trim().toLowerCase().replace(/[\s_]+/g, " ");
  const target = key(district);

  const match = options.find(
    (location) =>
      location.id !== ALL_LOCATIONS_OPTION.id &&
      (key(location.id) === target || key(location.name) === target)
  );

  return match?.id ?? null;
};

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
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();


  const canViewRetirement = hasRetPermission(user?.role, "RET_REQUEST_VIEW");
  const canEditRetirement = hasRetPermission(user?.role, "RET_REQUEST_EDIT");


  // District Office is the only role that lands here.
  const locationRestricted = isLocationRestricted(user?.role);


  const isMemberDeathOnlyUser = hasRole(user?.role, MEMBER_DEATH_ONLY_ROLES);
  const canViewTerminationsAndRetirements = hasRole(user?.role, TERMINATION_VIEW_ROLES);
  const canViewMemberDeaths = hasRole(user?.role, MEMBER_DEATH_VIEW_ROLES);
  const canEditMemberDeaths = hasRole(user?.role, MEMBER_DEATH_ENTRY_ROLES);

  //Fiter state value
  const [requestType, setRequestType] = useState<RequestType>(
    isMemberDeathOnlyUser ? "member_deaths" : "all"
  );
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>(
    isMemberDeathOnlyUser ? DEFAULT_MEMBER_DEATH_STATUSES : DEFAULT_RETIREMENT_STATUSES
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const availableLocations = LOCATION_OPTIONS;

  const pinnedLocationId = resolveLocationId(user?.assignedDistrict, availableLocations);

  const [dateFilter, setDateFilter] = useState<DateFilterType>("all_days");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<SortBy>("requestedDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [requests, setRequests] = useState<TerminationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showBoardMeetingModal, setShowBoardMeetingModal] = useState(false);
  const [selectedBoardMeeting, setSelectedBoardMeeting] = useState("");
  const [boardMeetings, setBoardMeetings] = useState<BoardMeetingDTO[]>([]);
  const [isSavingApprovalList, setIsSavingApprovalList] = useState(false);
  const [createdApprovalList, setCreatedApprovalList] =
    useState<TerminationApprovalListDTO | null>(null);
  const [showCreationConfirmModal, setShowCreationConfirmModal] = useState(false);
  const [approvalListError, setApprovalListError] = useState("");
  const showRequestTypeColumn = requestType === "all";
  const tableColumnCount = 8 + (showRequestTypeColumn ? 1 : 0);

  const showApprovalListActions =
    requestType === "termination" && hasRole(user?.role, TERMINATION_BOARD_ROLES);
  const canViewBoardMeetings = hasRole(user?.role, BOARD_MEETING_VIEW_ROLES);

  const selectableRowIds = requests
    .filter(
      (row) =>
        row.sourceType === "termination" &&
        row.selectable &&
        SELECTABLE_TERMINATION_STATUSES.includes(row.status)
    )
    .map((row) => row.requestId);

  const selectedTerminationCount = selectableRowIds.filter((id) =>
    selectedRows.includes(id)
  ).length;

  const isAllSelectableSelected =
    selectableRowIds.length > 0 &&
    selectedTerminationCount === selectableRowIds.length;

  const isSomeSelectableSelected =
    selectedTerminationCount > 0 &&
    selectedTerminationCount < selectableRowIds.length;

  const boardMeetingOptions = boardMeetings.map((meeting) => ({
    value: String(meeting.id ?? ""),
    label: `${meeting.scheduledDate ?? "Unknown date"} (${meeting.boardMeetingId ?? meeting.id ?? ""})`,
  }));

  // Get current status options based on request type
  const currentStatusOptions = STATUS_OPTIONS_BY_TYPE[requestType];

  // use for location restricted user
  useEffect(() => {
    if (locationRestricted && pinnedLocationId) {
      setSelectedLocations([pinnedLocationId]);
    }
  }, [locationRestricted, pinnedLocationId]);

  // get board meeting details
  useEffect(() => {
    if (isAuthLoading || !canViewBoardMeetings) return;

    const loadBoardMeetings = async () => {
      try {
        const meetings = await getBoardMeetings();
        setBoardMeetings(meetings);
      } catch (meetingError) {
        console.error("Failed to load board meetings:", meetingError);
      }
    };

    loadBoardMeetings();
  }, [isAuthLoading, canViewBoardMeetings]);

  // Handle request type change - reset selected statuses
  const handleRequestTypeChange = (newType: RequestType) => {
    setRequestType(newType);
    setSelectedStatuses(
      newType === "retirement"
        ? DEFAULT_RETIREMENT_STATUSES
        : newType === "termination"
          ? DEFAULT_TERMINATION_STATUSES
          : newType === "member_deaths"
            ? DEFAULT_MEMBER_DEATH_STATUSES
            : []
    );
  };


  const normalizeStatusForApi = (status: StatusType) => {
    const normalized = status.toUpperCase().replaceAll("-", "_");
    return normalized === "PND_COMMITTEE" ? "PD_COMMITTEE" : normalized;
  };

  const normalizeMemberDeathRows = (
    rows: TerminationRequestApiRow[]
  ): TerminationRequest[] =>
    rows.map((row) => ({
      id: row.recordNo ?? row.requestNo ?? String(row.id ?? ""),
      requestId: row.recordNo ?? row.requestNo ?? "-",
      sourceType: "member_death",
      date: row.informedDate ?? row.requestedDate ?? row.date ?? "-",
      member:
        row.memberFullName ??
        row.nameWithInitials ??
        row.fullName ??
        "-",
      nameAsInPayroll: row.nameAsInPayroll ?? "-",
      nameWithInitials: row.nameWithInitials ?? "-",
      memberNumber: row.memberId ?? row.memberNumber ?? "-",
      nicNumber: row.memberNic ?? row.nicNumber ?? row.nic ?? "-",
      hasLoanBalance: row.hasLoanBalance ?? row.hasOutstandingLoans ?? false,
      hasIndirectObligations:
        row.hasIndirectObligations ?? row.hasLoanObligations ?? false,
      reason: row.causeOfDeathName ?? row.reason ?? "-",
      status: (row.status ?? "NEW") as TerminationRequest["status"],
      selectable: false,
    }));

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
        status: (row.status ?? "NEW") as TerminationRequest["status"],
        selectable:
          sourceType === "termination" &&
          (row.status === "SUBMITTED_FOR_APPROVAL" || row.status === "REJECTED"),
      };
    });
  };

  const buildQueryParams = (statuses: StatusType[] = selectedStatuses) => {
    const params = new URLSearchParams();

    selectedLocations.forEach((locId) => {
      if (locId !== "all") {
        const locObj = availableLocations.find((l) => l.id === locId);
        const nameToSend = locObj ? locObj.name : locId;
        params.append("locations", nameToSend);
      }
    });

    statuses.forEach((status) => params.append("statuses", normalizeStatusForApi(status)));

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


    selectedLocations
      .filter((location) => location !== ALL_LOCATIONS_OPTION.id)
      .forEach((location) => params.append("locations", location));

    return params;
  };

  const fetchMemberDeathRequestsFromApi = async (
    statuses: StatusType[] = selectedStatuses
  ) => {
    const { data } = await apiClient.get<TerminationRequestApiRow[]>(
      `/api/member-death-records?${buildQueryParams(statuses).toString()}`
    );
    return normalizeMemberDeathRows(data);
  };

  const fetchRequestsFromApi = async (
    apiPath: "termination-requests" | "retirement-requests",
    sourceType: "termination" | "retirement",
    statuses: StatusType[] = selectedStatuses
  ) => {
    const { data } = await apiClient.get<TerminationRequestApiResponse>(
      `/api/${apiPath}?${buildQueryParams(statuses).toString()}`
    );
    return normalizeApiRows(data, sourceType);
  };

  const fetchRetirementRequestsFromApi = async (
    statuses: StatusType[] = selectedStatuses
  ) => {
    const params = buildQueryParams(statuses);
    const data = (await searchRetirementRequests({
      locations: params.getAll("locations"),
      statuses: params.getAll("statuses"),
      fromDate: params.get("fromDate") ?? undefined,
      toDate: params.get("toDate") ?? undefined,
      searchKey: params.get("searchKey") ?? undefined,
      sortBy: params.get("sortBy") ?? undefined,
      sortOrder: params.get("sortOrder") ?? undefined,
    })) as TerminationRequestApiResponse;

    return normalizeApiRows(data, "retirement");
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

  const fetchRequests = async (statuses: StatusType[] = selectedStatuses) => {
    try {
      setLoading(true);
      setError("");

      let retrievedRequests: TerminationRequest[];

      if (requestType === "all") {

        const [terminationRequests, retirementRequests, memberDeathRequests] =
          await Promise.all([
            fetchRequestsFromApi("termination-requests", "termination", statuses),
            canViewRetirement
              ? fetchRetirementRequestsFromApi(statuses)
              : Promise.resolve([] as TerminationRequest[]),
            fetchMemberDeathRequestsFromApi(statuses),
          ]);
        retrievedRequests = sortMergedRequests([
          ...terminationRequests,
          ...retirementRequests,
          ...memberDeathRequests,
        ]);
      } else if (requestType === "termination") {
        retrievedRequests = await fetchRequestsFromApi(
          "termination-requests",
          "termination",
          statuses
        );
      } else if (requestType === "retirement") {
        retrievedRequests = await fetchRetirementRequestsFromApi(statuses);
      } else {
        retrievedRequests = await fetchMemberDeathRequestsFromApi(statuses);
      }

      setRequests(retrievedRequests);
      setSelectedRows([]);
      setHasFetched(true);
    } catch (requestError) {
      console.error("Retrieve termination requests error:", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to retrieve requests."
      );
      setRequests([]);
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: TerminationRequest["status"]) => {
    const config: Record<string, { color: string; label: string }> = {
      NEW: { color: "bg-blue-100 text-blue-800", label: TERMINATION_STATUS_LABELS.NEW },
      SUBMITTED_FOR_APPROVAL: {
        color: "bg-purple-100 text-purple-800",
        label: TERMINATION_STATUS_LABELS.SUBMITTED_FOR_APPROVAL,
      },
      ADDED_TO_APPROVAL_LIST: {
        color: "bg-indigo-100 text-indigo-800",
        label: TERMINATION_STATUS_LABELS.ADDED_TO_APPROVAL_LIST,
      },
      DISTRICT_COMMITTEE: {
        color: "bg-orange-100 text-orange-800",
        label: TERMINATION_STATUS_LABELS.DISTRICT_COMMITTEE,
      },
      PD_COMMITTEE: {
        color: "bg-orange-100 text-orange-800",
        label: TERMINATION_STATUS_LABELS.PD_COMMITTEE,
      },
      APPROVED: { color: "bg-green-100 text-green-800", label: TERMINATION_STATUS_LABELS.APPROVED },
      REJECTED: { color: "bg-red-100 text-red-800", label: TERMINATION_STATUS_LABELS.REJECTED },
      INCOMPLETE: { color: "bg-gray-100 text-gray-800", label: TERMINATION_STATUS_LABELS.INCOMPLETE },
      INACTIVE: { color: "bg-gray-100 text-gray-600", label: TERMINATION_STATUS_LABELS.INACTIVE },
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

  const getRequestBasePath = (sourceType: TerminationRequest["sourceType"]) => {
    if (sourceType === "termination") {
      return "/membership/directory/termination-request";
    }
    if (sourceType === "member_death") {
      return "/membership/directory/record-member-death";
    }
    return "/membership/directory/retirement";
  };

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

  const toggleRow = (requestId: string) => {
    setSelectedRows((prev) =>
      prev.includes(requestId)
        ? prev.filter((id) => id !== requestId)
        : [...prev, requestId]
    );
  };

  const toggleAllSelectableRows = (checked: boolean) => {
    setSelectedRows((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...selectableRowIds]));
      }
      return prev.filter((id) => !selectableRowIds.includes(id));
    });
  };

  const handleOpenBoardMeetingModal = () => {
    if (selectedTerminationCount === 0) return;
    setApprovalListError("");
    setShowBoardMeetingModal(true);
  };

  const handleCloseBoardMeetingModal = () => {
    setShowBoardMeetingModal(false);
    setSelectedBoardMeeting("");
  };

  const handleSaveApprovalList = async () => {
    if (!selectedBoardMeeting) return;

    const meetingId = Number(selectedBoardMeeting);
    const meeting = boardMeetings.find((item) => item.id === meetingId);
    if (!meeting?.id || !meeting.scheduledDate) {
      setApprovalListError("Selected board meeting is not available.");
      return;
    }

    try {
      setIsSavingApprovalList(true);
      setApprovalListError("");

      const createdList = await createTerminationApprovalList({
        boardMeetingId: meeting.id,
        boardMeetingDate: meeting.scheduledDate,
        requestNos: selectedRows,
      });

      const savedRequestIds = [...selectedRows];
      const updatedStatuses: StatusType[] = selectedStatuses.includes("added_to_approval_list")
        ? selectedStatuses
        : [...selectedStatuses, "added_to_approval_list"];

      setCreatedApprovalList(createdList);
      setShowBoardMeetingModal(false);
      setSelectedBoardMeeting("");
      setShowCreationConfirmModal(true);
      setSelectedStatuses(updatedStatuses);
      setSelectedRows([]);

      if (requestType === "termination" || requestType === "all") {
        await fetchRequests(updatedStatuses);
      } else {
        setRequests((prev) =>
          prev.map((row) =>
            savedRequestIds.includes(row.requestId)
              ? { ...row, status: "ADDED_TO_APPROVAL_LIST", selectable: false }
              : row
          )
        );
      }
    } catch (saveError) {
      console.error("Create termination approval list error:", saveError);
      setApprovalListError(
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
    const listId = createdApprovalList?.listId;
    router.push(
      listId
        ? `/membership/termination/approval-lists?listId=${encodeURIComponent(listId)}`
        : "/membership/termination/approval-lists"
    );
  };

  const handleRetrieve = () => {
    const result = filterSchema.safeParse({
      dateFilter,
      fromDate,
      toDate,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};

      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        errors[field] = errors[field] ?? issue.message;
      });

      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    fetchRequests();
  };


  if (user && !canViewTerminationsAndRetirements && !canViewMemberDeaths) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-800">Access Restricted</h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500">
          Termination, Retirement and Member Death requests are restricted to District Office and Head Office personnel.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 w-full px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#8B4513]">Termination & Retirement Requests</h1>
        {showApprovalListActions && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-neutral-300"
              onClick={() => router.push("/membership/termination/approval-lists")}
            >
              View Approval Lists
            </Button>
            <Button
              className="bg-[#e3ac00] hover:bg-[#c99500] text-white"
              disabled={selectedTerminationCount === 0}
              onClick={handleOpenBoardMeetingModal}
            >
              Create Termination Approval List
              {selectedTerminationCount > 0 ? ` (${selectedTerminationCount})` : ""}
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-[#953002] mb-4">
          Search & Filter
        </h2>


        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Location</label>
            <LocationMultiSelect
              selectedLocations={selectedLocations}
              availableLocations={availableLocations}
              onLocationChange={setSelectedLocations}
              disabled={locationRestricted}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Request Type</label>
            <Select value={requestType} onValueChange={(value) => handleRequestTypeChange(value as RequestType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {canViewTerminationsAndRetirements && (
                  <>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="termination">Termination</SelectItem>
                    {canViewRetirement && (
                      <SelectItem value="retirement">Retirement</SelectItem>
                    )}
                  </>
                )}
                {canViewMemberDeaths && (
                  <SelectItem value="member_deaths">Member Deaths</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Request Received On</label>
            <Select
              value={dateFilter}
              onValueChange={(value) => {
                setDateFilter(value as DateFilterType);
                setFieldErrors({});
              }}
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

          {dateFilter === "date_period" && (
            <>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">From Date</label>
                <Input
                  type="date"
                  value={fromDate}
                  max={toDate && toDate <= TODAY ? toDate : TODAY}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFromDate(value);
                    setFieldErrors((prev) => ({ ...prev, fromDate: "" }));
                    // Drop a To Date that is now before the new From Date.
                    if (value && toDate && toDate < value) {
                      setToDate("");
                      setFieldErrors((prev) => ({ ...prev, toDate: "" }));
                    }
                  }}
                  className="w-full"
                />
                {fieldErrors.fromDate && (
                  <p className="text-sm text-red-500 mt-1">{fieldErrors.fromDate}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">To Date</label>
                <Input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  max={TODAY}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, toDate: "" }));
                  }}
                  className="w-full"
                />
                {fieldErrors.toDate && (
                  <p className="text-sm text-red-500 mt-1">{fieldErrors.toDate}</p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
            <StatusMultiSelect
              selectedStatuses={selectedStatuses}
              onStatusChange={setSelectedStatuses}
              statusOptions={currentStatusOptions}
            />
          </div>


          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Search Member</label>
            <Input
              type="text"
              placeholder="Name, NIC, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
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

          <div>
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
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={handleRetrieve} className="bg-[#8B4513] hover:bg-[#A0522D] text-white px-6">Retrieve</Button>
        </div>
      </div>


      <div className="rounded-md border bg-white">
        {error && (
          <p className="border-b px-4 py-3 text-sm text-red-600">{error}</p>
        )}
        {approvalListError && (
          <p className="border-b px-4 py-3 text-sm text-red-600">{approvalListError}</p>
        )}

        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              {showApprovalListActions && (
                <TableHead className="w-12 px-4 py-3">
                  <Checkbox
                    checked={isAllSelectableSelected}
                    data-state={isSomeSelectableSelected ? "indeterminate" : undefined}
                    onCheckedChange={(checked) => toggleAllSelectableRows(checked === true)}
                    disabled={selectableRowIds.length === 0}
                    className="data-[state=checked]:bg-[#953002] data-[state=checked]:border-[#953002]"
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
                  {showApprovalListActions && (
                    <TableCell className="px-4">
                      {request.sourceType === "termination" && request.selectable ? (
                        <Checkbox
                          checked={selectedRows.includes(request.requestId)}
                          onCheckedChange={() => toggleRow(request.requestId)}
                          className="data-[state=checked]:bg-[#953002] data-[state=checked]:border-[#953002]"
                        />
                      ) : null}
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
                    <TableCell className="px-6 capitalize">
                      {request.sourceType === "member_death"
                        ? "Member Death"
                        : request.sourceType}
                    </TableCell>
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
                      {!request.hasLoanBalance && !request.hasIndirectObligations && (
                        <span className="text-muted-foreground"></span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className=" text-center">
                    <div className="flex items-center justify-center gap-2">

                      {!NON_EDITABLE_STATUSES.includes(request.status) &&
                        (request.sourceType !== "retirement" || canEditRetirement) &&
                        (request.sourceType !== "member_death" || canEditMemberDeaths) && (
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
                <TableCell colSpan={tableColumnCount} className="text-center py-8 text-muted-foreground">
                  {loading
                    ? "Loading..."
                    : hasFetched
                      ? "No request found"
                      : "To load data click retrive button"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {requests.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {requests.length} request(s)
        </div>
      )}

      {showBoardMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[460px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <h2 className="text-2xl font-semibold text-[#953002]">Select Board Meeting</h2>
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

            <div className="px-5 pb-5 pt-1">
              <p className="mb-4 text-sm text-gray-600">
                Select the board meeting to attach {selectedTerminationCount} termination
                request(s).
              </p>

              <Select value={selectedBoardMeeting} onValueChange={setSelectedBoardMeeting}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select board meeting" />
                </SelectTrigger>
                <SelectContent>
                  {boardMeetingOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="mt-6 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseBoardMeetingModal}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-[#953002] text-white hover:bg-[#7a2700]"
                  disabled={!selectedBoardMeeting || isSavingApprovalList}
                  onClick={handleSaveApprovalList}
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
              <h2 className="text-2xl font-semibold text-[#953002]">Confirmation</h2>
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
                {createdApprovalList?.requestNos?.length ?? 0} request(s) has been created. Do
                you want to view the list?
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
                  className="bg-[#953002] text-white hover:bg-[#7a2700]"
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

