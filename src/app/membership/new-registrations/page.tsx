"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RotateCcw,
  Plus,
  ArrowUp,
  AlertCircle,
  ChevronDown,
  ArrowLeft,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  SendHorizontal,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Checkbox } from "@/src/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { NewMemberRegistrationForm } from "./form-new";
import {
  getMemberApplications,
  deleteMemberApplication,
  updateMemberApplicationStatus,
  type ApplicationStatus,
  type MemberApplicationDTO,
} from "@/lib/api/memberApplications";

// ── Multi-select dropdown ─────────────────────────────────────────────────────
interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
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
        onClick={() => setOpen((o) => !o)}
        className="border-input flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected.length === 0 ? "text-muted-foreground" : ""}>
          {label}
        </span>
        <ChevronDown size={14} className="text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[8rem] rounded-md border border-border bg-popover shadow-md">
          <div className="p-1 flex flex-col gap-0.5">
            {options.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground select-none"
              >
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={() => toggle(opt.value)}
                  className="data-[state=checked]:bg-[#953002] data-[state=checked]:border-[#953002]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

type RegistrationStatus = ApplicationStatus | "PENDING";

interface Registration {
  id?: number;
  appId: string;
  fullName: string;
  nic: string;
  appliedDate: string | null;
  district: string;
  zone: string;
  status: RegistrationStatus;
  hasWarning?: boolean;
  selectable: boolean;
}

const statusBadgeClass: Record<RegistrationStatus, string> = {
  PENDING: "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-100",
  NEW: "bg-green-100 text-green-700 border border-green-300 hover:bg-green-100",
  SUBMITTED_FOR_APPROVAL:
    "bg-amber-700 text-white border-transparent hover:bg-amber-700",
  ADDED_TO_BOARD_APPROVAL_LIST:
    "bg-amber-500 text-white border-transparent hover:bg-amber-500",
  REJECTED: "bg-red-100 text-red-700 border border-red-300 hover:bg-red-100",
  INACTIVE: "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-100",
};

const statusFilterMap: Record<string, RegistrationStatus> = {
  new: "NEW",
  submitted: "SUBMITTED_FOR_APPROVAL",
  board: "ADDED_TO_BOARD_APPROVAL_LIST",
  rejected: "REJECTED",
  inactive: "INACTIVE",
};

export default function NewRegistrationsPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<"list" | "form">("list");
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [applicationReceivedOn, setApplicationReceivedOn] = useState("all");
  const [sortBy, setSortBy] = useState("applied-date");
  const [sortAsc, setSortAsc] = useState(true);
  const [displayData, setDisplayData] = useState<Registration[]>([]);
  const [hasRetrieved, setHasRetrieved] = useState(false);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [showBoardMeetingModal, setShowBoardMeetingModal] = useState(false);
  const [selectedBoardMeeting, setSelectedBoardMeeting] = useState("");
  const [showCreationConfirmModal, setShowCreationConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteRow, setPendingDeleteRow] = useState<Registration | null>(null);
  const [isDeletingApplication, setIsDeletingApplication] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close action menu on outside click or scroll
  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    function closeOnScroll() { setOpenMenuId(null); }
    if (openMenuId) {
      document.addEventListener("mousedown", close);
      document.addEventListener("scroll", closeOnScroll, true);
    }
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [openMenuId]);

  const mapToRegistration = (
    item: MemberApplicationDTO,
    index: number
  ): Registration => {
    const status = item.status ?? "PENDING";
    const rawAppId = item.applicationID ?? `APP-${item.id ?? index + 1}`;
    const epochPart = rawAppId.replace("APP-", "");
    const epoch = Number(epochPart);
    const appliedDate = Number.isFinite(epoch)
      ? new Date(epoch).toISOString().slice(0, 10)
      : null;

    return {
      id: item.id,
      appId: rawAppId,
      fullName: item.fullName ?? "-",
      nic: item.nicNumber ?? "-",
      appliedDate,
      district: item.educationalDistrict ?? "-",
      zone: "-",
      status,
      selectable: status === "NEW",
      hasWarning: false,
    };
  };

  const selectableNewRowIds = displayData
    .filter((row) => row.selectable && row.status === "NEW")
    .map((row) => row.appId);

  const selectedNewRowsCount = selectableNewRowIds.filter((id) =>
    selectedRows.includes(id)
  ).length;

  const isAllNewRowsSelected =
    selectableNewRowIds.length > 0 &&
    selectedNewRowsCount === selectableNewRowIds.length;

  const isSomeNewRowsSelected =
    selectedNewRowsCount > 0 && selectedNewRowsCount < selectableNewRowIds.length;

  const locationOptions = [
    { value: "colombo", label: "Colombo" },
    { value: "kandy", label: "Kandy" },
    { value: "galle", label: "Galle" },
    { value: "nuwara-eliya", label: "Nuwara Eliya" },
    { value: "matara", label: "Matara" },
    { value: "jaffna", label: "Jaffna" },
  ];

  const statusOptions = [
    { value: "new", label: "New" },
    { value: "submitted", label: "Submitted for Approval" },
    { value: "board", label: "Added to Board Approval List" },
    { value: "rejected", label: "Rejected" },
    { value: "inactive", label: "Inactive" },
  ];

  const boardMeetingOptions = [
    { value: "2026-02-28 (108)", label: "2026-02-28 (108)" },
    { value: "2026-03-15 (109)", label: "2026-03-15 (109)" },
    { value: "2026-04-10 (110)", label: "2026-04-10 (110)" },
  ];

  const toggleRow = (appId: string) => {
    setSelectedRows((prev) =>
      prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId]
    );
  };

  const toggleAllNewRows = (checked: boolean) => {
    setSelectedRows((prev) => {
      if (checked) {
        const merged = new Set([...prev, ...selectableNewRowIds]);
        return Array.from(merged);
      }

      return prev.filter((id) => !selectableNewRowIds.includes(id));
    });
  };

  const handleRetrieve = async () => {
    setIsRetrieving(true);
    let filtered: Registration[] = [];

    try {
      const applications = await getMemberApplications();
      filtered = applications.map(mapToRegistration);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to retrieve applications";
      alert(message);
      setDisplayData([]);
      setHasRetrieved(true);
      setIsRetrieving(false);
      return;
    }

    // Filter by location/district
    if (selectedLocations.length > 0) {
      filtered = filtered.filter((row) =>
        selectedLocations.some(
          (loc) =>
            row.district.toLowerCase().replace(/\s+/g, "-") === loc ||
            row.district.toLowerCase() === loc
        )
      );
    }

    // Filter by status
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((row) =>
        selectedStatuses.some((s) => statusFilterMap[s] === row.status)
      );
    }

    // Filter by application received date
    const now = new Date();
    if (applicationReceivedOn === "thisMonth") {
      filtered = filtered.filter((row) => {
        if (!row.appliedDate) return false;
        const d = new Date(row.appliedDate);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      });
    } else if (applicationReceivedOn === "thisAndLastMonth") {
      filtered = filtered.filter((row) => {
        if (!row.appliedDate) return false;
        const d = new Date(row.appliedDate);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d >= lastMonth;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.fullName.toLowerCase().includes(q) ||
          row.nic.toLowerCase().includes(q) ||
          row.appId.toLowerCase().includes(q)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "applied-date") {
        cmp = (a.appliedDate ?? "").localeCompare(b.appliedDate ?? "");
      } else if (sortBy === "status") {
        cmp = a.status.localeCompare(b.status);
      } else if (sortBy === "district") {
        cmp = a.district.localeCompare(b.district);
      } else if (sortBy === "zone") {
        cmp = a.zone.localeCompare(b.zone);
      }
      return sortAsc ? cmp : -cmp;
    });

    setDisplayData(filtered);
    setSelectedRows([]);
    setHasRetrieved(true);
    setIsRetrieving(false);
  };

  const handleOpenBoardMeetingModal = () => {
    if (selectedNewRowsCount === 0) return;
    setShowBoardMeetingModal(true);
  };

  const handleCloseBoardMeetingModal = () => {
    setShowBoardMeetingModal(false);
    setSelectedBoardMeeting("");
  };

  const handleSaveBoardMeeting = () => {
    if (!selectedBoardMeeting) return;

    setShowBoardMeetingModal(false);
    setSelectedBoardMeeting("");
    setShowCreationConfirmModal(true);
  };

  const handleCloseCreationConfirmModal = () => {
    setShowCreationConfirmModal(false);
  };

  const handleViewCreatedList = () => {
    setShowCreationConfirmModal(false);
    router.push("/membership/board-approvals");
  };

  const handleOpenApplication = (row: Registration) => {
    if (!row.id) {
      alert("Application ID is not available for this record.");
      return;
    }
    setSelectedApplicationId(row.id);
    setCurrentView("form");
  };

  const handleDeleteApplication = (row: Registration) => {
    if (!row.id) return;
    setPendingDeleteRow(row);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteRow?.id) return;
    setIsDeletingApplication(true);
    try {
      await deleteMemberApplication(pendingDeleteRow.id);
      setDisplayData((prev) => prev.filter((r) => r.appId !== pendingDeleteRow.appId));
      setSelectedRows((prev) => prev.filter((id) => id !== pendingDeleteRow.appId));
      setShowDeleteModal(false);
      setPendingDeleteRow(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete application");
    } finally {
      setIsDeletingApplication(false);
    }
  };

  const handleSubmitApplication = async (row: Registration) => {
    if (!row.id) return;
    try {
      await updateMemberApplicationStatus(row.id, "SUBMITTED_FOR_APPROVAL");
      setDisplayData((prev) =>
        prev.map((r) =>
          r.appId === row.appId
            ? { ...r, status: "SUBMITTED_FOR_APPROVAL", selectable: false }
            : r
        )
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to submit application");
    }
  };

  if (currentView === "form") {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Button
          variant="ghost"
          onClick={() => {
            setCurrentView("list");
            setSelectedApplicationId(null);
          }}
          className="w-fit text-[#953002] hover:text-[#7a2700] hover:bg-transparent mb-2"
        >
          <ArrowLeft size={16} />
          Back to List
        </Button>
        <NewMemberRegistrationForm
          applicationId={selectedApplicationId}
          onDone={() => {
            setCurrentView("list");
            setSelectedApplicationId(null);
            void handleRetrieve();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#953002]">
          New Member Registration Search
        </h1>
        <div className="flex items-center gap-2">
          <Button
            className="bg-[#e3ac00] hover:bg-[#c99500] text-white"
            disabled={selectedNewRowsCount === 0}
            onClick={handleOpenBoardMeetingModal}
          >
            Create Board Approval List
            {selectedNewRowsCount > 0 ? ` (${selectedNewRowsCount})` : ""}
          </Button>
          <Button
            className="bg-[#7a2700] hover:bg-[#953002] text-white"
            onClick={() => {
              setSelectedApplicationId(null);
              setCurrentView("form");
            }}
          >
            <Plus />
            Create New Registration
          </Button>
        </div>
      </div>

      {/* Search Criteria Card */}
      <Card className="rounded-xl shadow-sm py-0">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base text-[#953002]">
            Search Criteria
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 flex flex-col gap-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Location (District) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Location (District)
              </label>
              <MultiSelect
                options={locationOptions}
                selected={selectedLocations}
                onChange={setSelectedLocations}
                placeholder="Select Locations"
              />
            </div>

            {/* Application Received On */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Application Received On
              </label>
              <Select value={applicationReceivedOn} onValueChange={setApplicationReceivedOn}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="thisAndLastMonth">This and Last Month</SelectItem>
                  <SelectItem value="DatePeriod">Date Period</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Status
              </label>
              <MultiSelect
                options={statusOptions}
                selected={selectedStatuses}
                onChange={setSelectedStatuses}
                placeholder="Select Status"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Search Name / NIC */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-medium text-gray-600">
                Search (Name / NIC)
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Applicant Name, Initials or NIC..."
                  className="pl-8"
                />
              </div>
            </div>

            {/* Sort By + Retrieve */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Sort By
              </label>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Applied Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="applied-date">Applied Date</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="district">District</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setSortAsc((v) => !v)}>
                  <ArrowUp size={16} className={sortAsc ? "" : "rotate-180"} />
                </Button>
                <Button
                  className="bg-[#7a2700] hover:bg-[#953002] text-white whitespace-nowrap"
                  onClick={handleRetrieve}
                  disabled={isRetrieving}
                >
                  <RotateCcw size={14} />
                  {isRetrieving ? "Retrieving..." : "Retrieve"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="rounded-xl shadow-sm overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-10 px-4">
                <Checkbox
                  checked={
                    isAllNewRowsSelected
                      ? true
                      : isSomeNewRowsSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(checked) => toggleAllNewRows(checked === true)}
                  aria-label="Select all new status rows"
                  disabled={selectableNewRowIds.length === 0}
                  className="data-[state=checked]:bg-[#953002] data-[state=checked]:border-[#953002]"
                />
              </TableHead>
              <TableHead className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                App ID
              </TableHead>
              <TableHead className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Full Name
              </TableHead>
              <TableHead className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                NIC
              </TableHead>
              <TableHead className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Applied Date
              </TableHead>
              <TableHead className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                District
              </TableHead>
              <TableHead className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </TableHead>
              <TableHead className="px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasRetrieved && displayData.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="px-4 py-8 text-center text-gray-400 text-sm"
                >
                  No records found. Adjust your filters and click Retrieve.
                </TableCell>
              </TableRow>
            )}
            {displayData.map((row) => (
              <TableRow key={row.appId}>
                {/* Checkbox */}
                <TableCell className="px-4">
                  {row.selectable ? (
                    <Checkbox
                      checked={selectedRows.includes(row.appId)}
                      onCheckedChange={() => toggleRow(row.appId)}
                      className="data-[state=checked]:bg-[#953002] data-[state=checked]:border-[#953002]"
                    />
                  ) : (
                    <span className="size-4 block" />
                  )}
                </TableCell>

                {/* App ID */}
                <TableCell className="px-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenApplication(row)}
                      className="text-[#953002] font-medium hover:underline cursor-pointer"
                    >
                      {row.appId}
                    </button>
                    {row.hasWarning && (
                      <AlertCircle size={14} className="text-amber-500" />
                    )}
                  </div>
                </TableCell>

                <TableCell className="px-4 text-gray-700">
                  {row.fullName}
                </TableCell>
                <TableCell className="px-4 text-gray-700">{row.nic}</TableCell>
                <TableCell className="px-4 text-gray-500">
                  {row.appliedDate ?? "-"}
                </TableCell>
                <TableCell className="px-4 text-gray-700">
                  {row.district}
                </TableCell>

                {/* Status Badge */}
                <TableCell className="px-4">
                  <Badge className={statusBadgeClass[row.status]}>
                    {row.status.replaceAll("_", " ")}
                  </Badge>
                </TableCell>

                {/* Actions */}
                <TableCell className="px-4 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-gray-400 hover:text-[#953002] hover:bg-[#fff6f2]"
                    aria-label="Row actions"
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      if (openMenuId === row.appId) {
                        setOpenMenuId(null);
                      } else {
                        setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                        setOpenMenuId(row.appId);
                      }
                    }}
                  >
                    <MoreHorizontal size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Fixed-position action dropdown — renders outside Card overflow */}
      {openMenuId && menuPos && (() => {
        const row = displayData.find((r) => r.appId === openMenuId);
        if (!row) return null;
        return (
          <div
            ref={menuRef}
            style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="w-44 rounded-lg border border-gray-200 bg-white shadow-xl py-1"
          >
            {/* Edit */}
            <button
              type="button"
              onClick={() => { setOpenMenuId(null); handleOpenApplication(row); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-[#fff6f2] hover:text-[#953002] transition-colors"
            >
              <Pencil size={14} />
              Edit
            </button>

            {/* Submit */}
            {row.status !== "SUBMITTED_FOR_APPROVAL" &&
              row.status !== "ADDED_TO_BOARD_APPROVAL_LIST" && (
                <button
                  type="button"
                  onClick={() => { setOpenMenuId(null); void handleSubmitApplication(row); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                >
                  <SendHorizontal size={14} />
                  Submit
                </button>
              )}

            <div className="my-1 border-t border-gray-100" />

            {/* Delete */}
            <button
              type="button"
              onClick={() => { setOpenMenuId(null); void handleDeleteApplication(row); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        );
      })()}


      {showDeleteModal && pendingDeleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[460px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <h2 className="text-[29px] font-semibold text-red-600">
                  Delete Application
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {pendingDeleteRow.appId} &mdash; {pendingDeleteRow.fullName}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-gray-500"
                onClick={() => { setShowDeleteModal(false); setPendingDeleteRow(null); }}
                aria-label="Close delete modal"
                disabled={isDeletingApplication}
              >
                <X size={18} />
              </Button>
            </div>

            <div className="px-5 pb-5 pt-4">
              <p className="text-base leading-relaxed text-gray-600">
                Are you sure you want to permanently delete this application?
              </p>

              <div className="mt-7 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-gray-700"
                  onClick={() => { setShowDeleteModal(false); setPendingDeleteRow(null); }}
                  disabled={isDeletingApplication}
                >
                  No, Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 text-white hover:bg-red-700"
                  disabled={isDeletingApplication}
                  onClick={handleConfirmDelete}
                >
                  {isDeletingApplication ? "Deleting..." : "Yes, Delete"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBoardMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[520px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <h2 className="text-[29px] font-semibold text-[#953002]">
                  Select Board Meeting
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select the Board Meeting date for these {selectedNewRowsCount} applications.
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
                <Select
                  value={selectedBoardMeeting}
                  onValueChange={setSelectedBoardMeeting}
                >
                  <SelectTrigger className="h-11 w-full text-base">
                    <SelectValue placeholder="Select Meeting" />
                  </SelectTrigger>
                  <SelectContent>
                    {boardMeetingOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
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
                  className="bg-[#953002] text-white hover:bg-[#7a2700]"
                  disabled={!selectedBoardMeeting}
                  onClick={handleSaveBoardMeeting}
                >
                  Save
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
              <h2 className="text-3xl font-semibold text-[#953002]">Confirmation</h2>
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
                The Board Approval List for {selectedNewRowsCount} applications has been created. Do you
                want to view the list?
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
