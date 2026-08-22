"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Badge } from "@/src/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Input } from "@/src/components/ui/input";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  DELETE_RIGHTS_ROLES,
  DORMANT_BOARD_ROLES,
  DORMANT_CONFIG_ROLES,
  DORMANT_IDENTIFICATION_ROLES,
  DORMANT_VIEW_ROLES,
  hasRole,
  isDormantReadOnly,
} from "@/lib/permissions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DormantMember {
  id: number;
  memberId: string;
  fullName: string;
  nameWithInitials: string;
  nic: string;
  memberType: string;
  location: string;
  lastActivityDate: string | null;
  membershipDate: string | null;
  dormantSelectionDate: string | null;
  status: string;
  hasIndirectObligations: boolean;
}

interface DormantConfig {
  dormantPeriodMonths: number;
  scheduleDayOfMonth: number;
  scheduleHour: number;
  scheduleMinute: number;
  enabled: boolean;
}

interface DormantApprovalList {
  id?: number;
  listId: string;
  boardMeetingId?: number;
  boardMeetingDate?: string | null;
  actualMeetingDate?: string | null;
  memberIds: string[];
  members: DormantMember[];
  status: string;
  createdAt?: string;
  processedAt?: string;
  processedBy?: string;
  decision?: string;
  rejectReason?: string;
  boardRemarks?: string;
  inactivatedAt?: string;
}

interface BoardMeeting {
  id: number;
  boardMeetingId?: string;
  scheduledDate: string;
  actualDate?: string;
}

type DateFilter = "all" | "thisMonth" | "thisAndLastMonth" | "datePeriod";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "SELECTED_FOR_DORMANT", label: "Selected for Dormant" },
  { value: "SENT_FOR_DORMANT_APPROVAL", label: "Sent for Dormant Approval" },
  { value: "INACTIVE_DORMANT", label: "Inactive (Dormant)" },
];

const STATUS_LABELS: Record<string, string> = {
  SELECTED_FOR_DORMANT: "Selected for Dormant",
  SENT_FOR_DORMANT_APPROVAL: "Sent for Dormant Approval",
  INACTIVE_DORMANT: "Inactive (Dormant)",
};

const BASE = "/api/dormant-members";

function formatDate(value?: string | null): string {
  if (!value) return "-";
  return value.length > 10 ? value.substring(0, 10) : value;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

// ---------------------------------------------------------------------------
// Small inline multi-select dropdown (no new files allowed)
// ---------------------------------------------------------------------------

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  allLabel = "All",
  width = "w-64",
  disabled = false,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  allLabel?: string;
  width?: string;
  /** SRS 4.2.3: the Location filter is un-editable for a district-scoped user. */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const summary =
    selected.length === 0
      ? allLabel
      : options
          .filter((o) => selected.includes(o.value))
          .map((o) => o.label)
          .join(", ");

  return (
    <div className={width}>
      <label className="text-sm font-medium text-muted-foreground mb-2 block">
        {label}
      </label>
      <div className="relative" ref={ref}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="truncate text-left">{summary}</span>
          <svg className="ml-2 h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && !disabled && (
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white p-1 shadow-md">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => onChange([])}
            >
              <span className={`h-4 w-4 rounded border ${selected.length === 0 ? "bg-[#8B4513]" : ""}`} />
              {allLabel}
            </button>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                onClick={() => toggle(o.value)}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    selected.includes(o.value) ? "bg-[#8B4513] text-white" : ""
                  }`}
                >
                  {selected.includes(o.value) && (
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="truncate text-left">{o.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DormantMembersPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Server-side @PreAuthorize is the real gate; these keep a role that cannot
  // use a control from being shown it and handed a 403.
  const canSeeDormant = hasRole(user?.role, DORMANT_VIEW_ROLES);
  const canManageLists = hasRole(user?.role, DORMANT_BOARD_ROLES);
  const canRunIdentification = hasRole(user?.role, DORMANT_IDENTIFICATION_ROLES);
  const canEditConfig = hasRole(user?.role, DORMANT_CONFIG_ROLES);
  const canDeleteList = hasRole(user?.role, DELETE_RIGHTS_ROLES);
  const readOnly = isDormantReadOnly(user?.role);

  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Config
  const [config, setConfig] = useState<DormantConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [running, setRunning] = useState(false);

  // Filter metadata
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [memberTypeOptions, setMemberTypeOptions] = useState<string[]>([]);
  const [boardMeetings, setBoardMeetings] = useState<BoardMeeting[]>([]);

  // Filters
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [memberType, setMemberType] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    "SELECTED_FOR_DORMANT",
    "SENT_FOR_DORMANT_APPROVAL",
  ]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("lastActivity");
  const [sortOrder, setSortOrder] = useState("desc");

  // Results
  const [members, setMembers] = useState<DormantMember[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Approval lists
  const [approvalLists, setApprovalLists] = useState<DormantApprovalList[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createBoardMeetingId, setCreateBoardMeetingId] = useState<string>("");
  const [creatingList, setCreatingList] = useState(false);

  // Post-create confirmation ("...has been created. Do you want to view the list?")
  const [createdListInfo, setCreatedListInfo] = useState<{ list: DormantApprovalList; count: number } | null>(null);

  // Approval list retrieve filter (MMD14)
  const [showApprovalLists, setShowApprovalLists] = useState(false);
  const [listDateFilter, setListDateFilter] = useState("all");
  const [listFromDate, setListFromDate] = useState("");
  const [listToDate, setListToDate] = useState("");
  const [loadingLists, setLoadingLists] = useState(false);

  const [viewList, setViewList] = useState<DormantApprovalList | null>(null);

  const showBanner = useCallback((type: "success" | "error", text: string) => {
    setBanner({ type, text });
    window.setTimeout(() => setBanner(null), 6000);
  }, []);

  // -------------------- Loaders --------------------

  const loadConfig = useCallback(async () => {
    try {
      const { data } = await apiClient.get<DormantConfig>(`${BASE}/config`);
      setConfig(data);
    } catch (error) {
      showBanner("error", getErrorMessage(error));
    }
  }, [showBanner]);

  const loadMetadata = useCallback(async () => {
    try {
      const [locations, types] = await Promise.all([
        apiClient.get<string[]>(`${BASE}/locations`),
        apiClient.get<string[]>(`${BASE}/member-types`),
      ]);
      setLocationOptions(locations.data);
      setMemberTypeOptions(types.data);
    } catch (error) {
      showBanner("error", getErrorMessage(error));
    }

    // Board meetings are a separate call, not part of the batch above.
    // BoardMeetingController excludes the District Office outright, so batching
    // the three meant one 403 rejected all of them and left a district user
    // staring at two empty filter dropdowns and a generic error.
    if (!canManageLists) {
      setBoardMeetings([]);
      return;
    }

    try {
      const meetings = await apiClient.get<BoardMeeting[]>(
        `/api/board-meetings/getAllBoardMeetings`
      );
      setBoardMeetings(meetings.data ?? []);
    } catch (error) {
      showBanner("error", getErrorMessage(error));
    }
  }, [showBanner, canManageLists]);

  const loadApprovalLists = useCallback(async () => {
    // Approval lists are the board half (MMD14). A district user has no business
    // here and would only be handed a 403 banner on page load.
    if (!canManageLists) {
      setApprovalLists([]);
      return;
    }

    try {
      const { data } = await apiClient.get<DormantApprovalList[]>(`${BASE}/approval-lists`);
      setApprovalLists(data);
    } catch (error) {
      showBanner("error", getErrorMessage(error));
    }
  }, [showBanner, canManageLists]);

  useEffect(() => {
    loadConfig();
    loadMetadata();
    loadApprovalLists();
  }, [loadConfig, loadMetadata, loadApprovalLists]);

  // -------------------- Actions --------------------

  const handleSaveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    try {
      const { data } = await apiClient.put<DormantConfig>(`${BASE}/config`, config);
      setConfig(data);
      showBanner("success", "Dormant configuration saved.");
    } catch (error) {
      showBanner("error", getErrorMessage(error));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRunIdentification = async () => {
    setRunning(true);
    try {
      const { data } = await apiClient.post<{ selected: number; cleared: number }>(
        `${BASE}/run-identification`
      );
      showBanner(
        "success",
        `Identification complete. Newly selected: ${data.selected}, restored to active: ${data.cleared}.`
      );
      await handleRetrieve();
      await loadMetadata();
    } catch (error) {
      showBanner("error", getErrorMessage(error));
    } finally {
      setRunning(false);
    }
  };

  const handleRetrieve = useCallback(async () => {
    setLoadingResults(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      selectedLocations.forEach((l) => params.append("locations", l));
      if (memberType && memberType !== "all") params.set("memberType", memberType);
      params.set("dateFilter", dateFilter);
      if (dateFilter === "datePeriod") {
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);
      }
      selectedStatuses.forEach((s) => params.append("statuses", s));
      if (search.trim()) params.set("search", search.trim());
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const { data } = await apiClient.get<DormantMember[]>(`${BASE}/search?${params.toString()}`);
      setMembers(data);
      setSelectedMemberIds((prev) => prev.filter((id) => data.some((m) => m.memberId === id)));
    } catch (error) {
      showBanner("error", getErrorMessage(error));
    } finally {
      setLoadingResults(false);
    }
  }, [
    selectedLocations,
    memberType,
    dateFilter,
    fromDate,
    toDate,
    selectedStatuses,
    search,
    sortBy,
    sortOrder,
    showBanner,
  ]);

  const selectableMembers = useMemo(
    () =>
      members.filter(
        (m) => m.status === "SELECTED_FOR_DORMANT" && !m.hasIndirectObligations
      ),
    [members]
  );

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMemberIds.length === selectableMembers.length && selectableMembers.length > 0) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(selectableMembers.map((m) => m.memberId));
    }
  };

  const handleOpenCreate = () => {
    if (selectedMemberIds.length === 0) {
      showBanner("error", "Select at least one dormant member first.");
      return;
    }
    if (boardMeetings.length === 0) {
      showBanner("error", "No board meetings available. Create a board meeting first.");
      return;
    }
    setCreateBoardMeetingId(String(boardMeetings[0].id));
    setShowCreateModal(true);
  };

  const handleCreateList = async () => {
    setCreatingList(true);
    try {
      const count = selectedMemberIds.length;
      const { data } = await apiClient.post<DormantApprovalList>(`${BASE}/approval-lists`, {
        boardMeetingId: Number(createBoardMeetingId),
        memberIds: selectedMemberIds,
      });
      setShowCreateModal(false);
      setSelectedMemberIds([]);
      await handleRetrieve();
      await loadApprovalLists();
      // MMD13 confirmation with Yes/No option to view the created list.
      setCreatedListInfo({ list: data, count });
    } catch (error) {
      showBanner("error", getErrorMessage(error));
    } finally {
      setCreatingList(false);
    }
  };

  const handleMemberDecision = async (
    list: DormantApprovalList,
    member: DormantMember,
    decision: "Approve" | "Reject"
  ) => {
    if (
      !window.confirm(
        `${decision} inactivation for ${member.fullName} (${member.memberId})?`
      )
    ) {
      return;
    }
    try {
      const { data } = await apiClient.patch<DormantApprovalList>(
        `${BASE}/approval-lists/${encodeURIComponent(list.listId)}/members/${encodeURIComponent(
          member.memberId
        )}/decision`,
        { decision }
      );
      setViewList(data);
      showBanner(
        "success",
        decision === "Approve"
          ? `${member.memberId} approved and set to Inactive (Dormant).`
          : `${member.memberId} rejected and returned to Selected for Dormant.`
      );
      await loadApprovalLists();
      await handleRetrieve();
    } catch (error) {
      showBanner("error", getErrorMessage(error));
    }
  };

  const handleDeleteList = async (list: DormantApprovalList) => {
    if (!window.confirm("Do you want to delete the selected Inactivation Approval List?")) return;
    try {
      await apiClient.delete(`${BASE}/approval-lists/${encodeURIComponent(list.listId)}`);
      showBanner("success", `Inactivation Approval List ${list.listId} deleted. Members rolled back to Selected for Dormant.`);
      if (viewList?.listId === list.listId) setViewList(null);
      await loadApprovalLists();
      await handleRetrieve();
    } catch (error) {
      showBanner("error", getErrorMessage(error));
    }
  };

  const handleRetrieveLists = async () => {
    setLoadingLists(true);
    try {
      await loadApprovalLists();
    } finally {
      setLoadingLists(false);
    }
  };

  // Filter the loaded approval lists by board meeting date period (MMD14).
  const filteredApprovalLists = useMemo(() => {
    if (listDateFilter === "all") return approvalLists;
    const now = new Date();
    return approvalLists.filter((list) => {
      const raw = list.boardMeetingDate ?? list.createdAt ?? "";
      if (!raw) return false;
      const date = new Date(raw);
      if (listDateFilter === "thisMonth") {
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      }
      if (listDateFilter === "lastMonth") {
        const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return date.getFullYear() === last.getFullYear() && date.getMonth() === last.getMonth();
      }
      if (listDateFilter === "datePeriod") {
        if (listFromDate && date < new Date(listFromDate)) return false;
        if (listToDate && date > new Date(listToDate)) return false;
        return true;
      }
      return true;
    });
  }, [approvalLists, listDateFilter, listFromDate, listToDate]);

  const printMembers = (title: string, rows: DormantMember[]) => {
    const win = window.open("", "_blank", "width=900,height=650");
    if (!win) return;
    const body = rows
      .map(
        (m) => `<tr>
          <td>${m.memberId ?? ""}</td>
          <td>${m.fullName ?? ""}</td>
          <td>${m.nic ?? ""}</td>
          <td>${m.location ?? ""}</td>
          <td>${formatDate(m.lastActivityDate)}</td>
          <td>${formatDate(m.dormantSelectionDate)}</td>
          <td>${STATUS_LABELS[m.status] ?? m.status}</td>
        </tr>`
      )
      .join("");
    win.document.write(`
      <html><head><title>${title}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1{color:#8B4513;font-size:20px}
        table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#f3ede7}
      </style></head><body>
      <h1>${title}</h1>
      <p>Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total: ${rows.length}</p>
      <table><thead><tr>
        <th>Member ID</th><th>Name</th><th>NIC</th><th>Location</th>
        <th>Last Activity</th><th>Selected Date</th><th>Status</th>
      </tr></thead><tbody>${body}</tbody></table>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "SELECTED_FOR_DORMANT":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Selected for Dormant</Badge>;
      case "SENT_FOR_DORMANT_APPROVAL":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sent for Dormant Approval</Badge>;
      case "INACTIVE_DORMANT":
        return <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200">Inactive (Dormant)</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const locationSelectOptions = locationOptions.map((l) => ({ value: l, label: l }));

  // Server-side @PreAuthorize is the real gate; this keeps a role that cannot
  // use the screen from being shown a page of failing requests.
  if (user && !canSeeDormant) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert className="h-8 w-8 text-[#8B4513]" />
        <h2 className="text-xl font-bold text-neutral-800">Access Restricted</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Dormant Membership Profiles are restricted to Head Office and Board
          Secretariat personnel, and to District Office users for their own
          district.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#8B4513]">Dormant Members</h1>
        {/* MMD11 names an "Authorized Head Office System User" — narrower than
            the board list, so this is not gated on canManageLists. */}
        {canRunIdentification && (
          <Button
            onClick={handleRunIdentification}
            disabled={running}
            className="bg-[#8B4513] hover:bg-[#A0522D] text-white disabled:opacity-50"
          >
            {running ? "Identifying Members..." : "Run Identification Process"}
          </Button>
        )}
      </div>

      {readOnly && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          You have read-only access to the dormant members administered by your
          district. Creating and approving Inactivation Approval Lists is done at
          Head Office.
        </div>
      )}

      {banner && (
        <div
          className={`rounded-md border px-4 py-2 text-sm ${
            banner.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Configuration */}
      <Card className="border-2 border-[#ffffff]">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg text-[#8B4513]">Dormant Configuration</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {!canEditConfig && (
            <p className="mb-3 text-sm text-muted-foreground">
              The dormancy period decides who is put forward for inactivation, so
              it is maintained by the Super Admin. Shown here for reference.
            </p>
          )}
          {config ? (
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-40">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Dormant Period (months)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={config.dormantPeriodMonths}
                  disabled={!canEditConfig}
                  onChange={(e) => setConfig({ ...config, dormantPeriodMonths: Number(e.target.value) })}
                />
              </div>
              <div className="w-36">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Schedule Day (1-28)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={config.scheduleDayOfMonth}
                  disabled={!canEditConfig}
                  onChange={(e) => setConfig({ ...config, scheduleDayOfMonth: Number(e.target.value) })}
                />
              </div>
              <div className="w-28">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Hour (0-23)</label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={config.scheduleHour}
                  disabled={!canEditConfig}
                  onChange={(e) => setConfig({ ...config, scheduleHour: Number(e.target.value) })}
                />
              </div>
              <div className="w-28">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Minute (0-59)</label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={config.scheduleMinute}
                  disabled={!canEditConfig}
                  onChange={(e) => setConfig({ ...config, scheduleMinute: Number(e.target.value) })}
                />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm font-medium">
                <Checkbox
                  checked={config.enabled}
                  disabled={!canEditConfig}
                  onCheckedChange={(v) => setConfig({ ...config, enabled: Boolean(v) })}
                />
                Scheduled run enabled
              </label>
              <Button
                onClick={handleSaveConfig}
                disabled={!canEditConfig || savingConfig}
                className="bg-[#8B4513] hover:bg-[#A0522D] text-white disabled:opacity-50"
              >
                {savingConfig ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading configuration...</p>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-2 border-[#ffffff]">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg text-[#8B4513]">Search Dormant Members</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* SRS 4.2.3: un-editable when the user only has access to their
                own district. The server pins it regardless — this just stops the
                filter implying a choice that does not exist. */}
            <MultiSelect
              label="Location"
              options={locationSelectOptions}
              selected={selectedLocations}
              onChange={setSelectedLocations}
              allLabel={readOnly ? user?.assignedDistrict ?? "Your district" : "All"}
              disabled={readOnly}
            />

            <div className="w-48">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Member Type</label>
              <Select value={memberType} onValueChange={setMemberType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Member type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {memberTypeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-56">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Selected for Dormant On
              </label>
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Date filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="thisAndLastMonth">This and Last Month</SelectItem>
                  <SelectItem value="datePeriod">Date Period</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilter === "datePeriod" && (
              <>
                <div className="w-44">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">From Date</label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="w-44">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">To Date</label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </>
            )}

            <MultiSelect
              label="Status"
              options={STATUS_OPTIONS}
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
              allLabel="Default"
              width="w-72"
            />

            <div className="w-64">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Search (name / member no / NIC)
              </label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                onKeyDown={(e) => e.key === "Enter" && handleRetrieve()}
              />
            </div>

            <div className="w-44">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lastActivity">Last Activity</SelectItem>
                  <SelectItem value="membershipDate">Membership Date</SelectItem>
                  <SelectItem value="memberId">Member ID</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-36">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Order</label>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleRetrieve}
              disabled={loadingResults}
              className="bg-[#8B4513] hover:bg-[#A0522D] text-white"
            >
              {loadingResults ? "Retrieving..." : "Retrieve"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="border-2 border-[#ffffff]">
        <CardHeader className="bg-muted/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg text-[#8B4513]">Dormant Members</CardTitle>
            <div className="flex items-center gap-2">
              {canManageLists && (
                <Link href="/membership/dormant/approval-lists">
                  <Button variant="outline" size="sm">
                    View Approval Lists
                  </Button>
                </Link>
              )}
              {canManageLists && selectedMemberIds.length > 0 && (
                <Button
                  onClick={handleOpenCreate}
                  className="bg-[#8B4513] hover:bg-[#A0522D] text-white"
                  size="sm"
                >
                  Create Inactivation Approval List ({selectedMemberIds.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                {/* MMD13 is the board's to start; a district user reads only. */}
                {canManageLists && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedMemberIds.length === selectableMembers.length &&
                        selectableMembers.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                      disabled={selectableMembers.length === 0}
                    />
                  </TableHead>
                )}
                <TableHead className="font-semibold">Member ID</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">NIC</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold">Last Activity</TableHead>
                <TableHead className="font-semibold">Membership Date</TableHead>
                <TableHead className="font-semibold">Selected Date</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Obligation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingResults ? (
                <TableRow>
                  <TableCell colSpan={canManageLists ? 10 : 9} className="text-center py-10 text-muted-foreground">
                    Retrieving dormant members...
                  </TableCell>
                </TableRow>
              ) : members.length > 0 ? (
                members.map((m) => {
                  const selectable =
                    m.status === "SELECTED_FOR_DORMANT" && !m.hasIndirectObligations;
                  return (
                    <TableRow key={m.memberId}>
                      {canManageLists && (
                        <TableCell>
                          <Checkbox
                            checked={selectedMemberIds.includes(m.memberId)}
                            onCheckedChange={() => toggleMember(m.memberId)}
                            disabled={!selectable}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Link
                          href={`/membership/directory/${m.id}`}
                          className="font-medium text-[#8B4513] underline-offset-2 hover:underline"
                        >
                          {m.memberId}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{m.fullName}</span>
                          {m.nameWithInitials && (
                            <span className="text-xs text-muted-foreground">{m.nameWithInitials}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{m.nic}</TableCell>
                      <TableCell>{m.location}</TableCell>
                      <TableCell>{formatDate(m.lastActivityDate)}</TableCell>
                      <TableCell>{formatDate(m.membershipDate)}</TableCell>
                      <TableCell>{formatDate(m.dormantSelectionDate)}</TableCell>
                      <TableCell>{statusBadge(m.status)}</TableCell>
                      <TableCell>
                        {m.hasIndirectObligations && (
                          <span
                            title="Has indirect loan obligations - cannot be inactivated"
                            className="inline-flex items-center gap-1 text-red-600"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                              />
                            </svg>
                            <span className="text-xs">Loan obligation</span>
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={canManageLists ? 10 : 9} className="text-center py-10 text-muted-foreground">
                    {hasSearched
                      ? "No dormant members match the selected filters."
                      : "Set your filters and click 'Retrieve' to view dormant members."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Post-create confirmation (MMD13) */}
      {createdListInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#8B4513]">Inactivation Approval List Created</h2>
            <p className="mt-2 text-sm text-gray-700">
              The Inactivation Approval List for {createdListInfo.count} Dormant Member(s) has been
              created. Do you want to view the list?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreatedListInfo(null)}>
                No
              </Button>
              <Button
                className="bg-[#8B4513] hover:bg-[#A0522D] text-white"
                onClick={() => {
                  const listId = createdListInfo.list.listId;
                  setCreatedListInfo(null);
                  router.push(`/membership/dormant/approval-lists?listId=${listId}`);
                }}
              >
                Yes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
