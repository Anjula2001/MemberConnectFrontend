"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, } from "@/src/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/src/components/ui/select";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Search, RotateCcw, ArrowUp, ChevronDown, Pencil, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  canAccessUniversityScholarships,
  canSelectAllLocations,
  hasPermission,
} from "@/lib/permissions";
import AccessRestricted from "@/src/components/AccessRestricted";
import { getEducationalDistricts } from "@/lib/api/education";
import { authFetch } from "@/lib/api/authFetch";

type RequestRow = {
  id: number;
  requestId?: string;
  studentName: string;
  memberName?: string;
  memberId?: string;
  universityName?: string;
  status?: string;
  nic?: string;
  birthCertificateNumber?: string;
  mobile?: string;
  address?: string;
  examNumber?: string;
  requestDate?: string;
  approvalListId?: string;
  /** District Office that owns the request — what the Location filter matches on. */
  submissionLocation?: string;
};

export default function Page() {
  const { user } = useAuth();

  // This screen serves two audiences at once — District Office searching their own
  // requests, and Head Office assembling board approval lists — so the page guard
  // only asks "may you open University Scholarships at all", and each control is
  // gated separately.
  const canViewPage = canAccessUniversityScholarships(user?.role);
  const canCreateApprovalLists = hasPermission(user?.role, "US_LIST_CREATE");
  const canSelectAllLocationOptions = canSelectAllLocations(user?.role);

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [displayed, setDisplayed] = useState<RequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [applicationReceivedOn, setApplicationReceivedOn] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("requested-date");
  const [sortAsc, setSortAsc] = useState(true);
  const [hasRetrieved, setHasRetrieved] = useState(false);
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBoardMeetingModal, setShowBoardMeetingModal] = useState(false);
  const [isDeviationModal, setIsDeviationModal] = useState(false);
  const [boardMeetings, setBoardMeetings] = useState<any[]>([]);
  const [selectedBoardMeeting, setSelectedBoardMeeting] = useState("");
  const [isSavingApprovalList, setIsSavingApprovalList] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [confirmedIsDeviation, setConfirmedIsDeviation] = useState(false);

  // Rights to create a University Scholarship Approval List (MMS28/MMS35).
  const hasRights = canCreateApprovalLists;

  const isSelectable = (item: RequestRow) => {
    const status = (item.status || "").toUpperCase();
    return status === "SUBMITTED_FOR_NORMAL_BOARD_APPROVAL" || status === "SUBMITTED_FOR_DEVIATION_BOARD_APPROVAL";
  };

  const selectableDisplayedRows = displayed.filter(isSelectable);
  const selectableDisplayedRowIds = selectableDisplayedRows.map(r => r.id);
  const selectedSelectableCount = selectedIds.filter(id => selectableDisplayedRowIds.includes(id)).length;
  const isAllSelectableSelected = selectableDisplayedRowIds.length > 0 && selectedSelectableCount === selectableDisplayedRowIds.length;
  const isSomeSelectableSelected = selectedSelectableCount > 0 && selectedSelectableCount < selectableDisplayedRowIds.length;

  const toggleRow = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAllSelectable = (checked: boolean) => {
    setSelectedIds(prev => {
      if (checked) {
        const newSelection = Array.from(new Set([...prev, ...selectableDisplayedRowIds]));
        return newSelection;
      } else {
        return prev.filter(id => !selectableDisplayedRowIds.includes(id));
      }
    });
  };

  const selectedRequests = displayed.filter(item => selectedIds.includes(item.id));
  const showNormalApprovalBtn = hasRights && selectedRequests.length > 0 && selectedRequests.every(item => (item.status || "").toUpperCase() === "SUBMITTED_FOR_NORMAL_BOARD_APPROVAL");
  const showDeviationApprovalBtn = hasRights && selectedRequests.length > 0 && selectedRequests.every(item => (item.status || "").toUpperCase() === "SUBMITTED_FOR_DEVIATION_BOARD_APPROVAL");

  // Convert a date string in YYYY-MM-DD format to a Date object 
  const parseYMD = (input?: string | null) => {
    if (!input) return null;
    const s = String(input);
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  };

  // Loaded from the District Office master at runtime rather than hardcoded. The
  // previous inline list used invented lowercase slugs ("kurunagala", "kaluthara",
  // "mathale") that matched neither the district master nor anything stored against
  // a member, so no value in it could ever have matched a record.
  const [locationOptions, setLocationOptions] = useState<
    { value: string; label: string }[]
  >([]);

  // Same District Office master the Member Directory and the Grade 5 list filter on,
  // so a location selected here matches the value actually stored on a request.
  useEffect(() => {
    let cancelled = false;
    getEducationalDistricts()
      .then((districts) => {
        if (cancelled) return;
        setLocationOptions(
          districts.map((district) => ({ value: district, label: district }))
        );
      })
      .catch(() => {
        /* leave empty on failure — the filter simply offers no options */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A location-restricted user (District Office) is pinned to their own branch. The
  // backend re-pins them regardless of what is sent; this only keeps the filter
  // honest on screen.
  useEffect(() => {
    if (!canSelectAllLocationOptions && user?.assignedDistrict) {
      setSelectedLocations([user.assignedDistrict]);
    }
  }, [canSelectAllLocationOptions, user?.assignedDistrict]);

  const statusOptions = [
    { value: "new", label: "New" },
    { value: "incomplete", label: "Incomplete" },
    { value: "submittedforcommitteeapproval", label: "Submitted for Committee Approval" },
    { value: "submittedfornormalboardapproval", label: "Submitted for Normal Board Approval" },
    { value: "submittedfordeviationboardapproval", label: "Submitted for Deviation Board Approval" },
    { value: "addedtonormalboardapprovallist", label: "Added to Normal Board Approval List" },
    { value: "addedtodeviationboardapprovallist", label: "Added to Deviation Board Approval List" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  // Function to get status colors based on status value
  const getStatusColor = (status?: string) => {
    if (!status) return "bg-yellow-100 border-yellow-200 text-yellow-500";

    const statusLower = status.toLowerCase().replace(/[\s_]+/g, "");

    if (statusLower === "new") {
      return "bg-blue-100 border-blue-200 text-blue-500";
    } else if (statusLower === "incomplete") {
      return "bg-pink-100 border-pink-200 text-pink-500";
    } else if (statusLower === "approved") {
      return "bg-green-100 border-green-200 text-green-500";
    } else if (statusLower === "rejected") {
      return "bg-red-100 border-red-200 text-red-500";
    } else if (statusLower === "submittedforcommitteeapproval") {
      return "bg-purple-100 border-purple-200 text-purple-500";
    } else if (statusLower === "submittedfornormalboardapproval" || statusLower === "submittedfordeviationboardapproval") {
      return "bg-amber-100 border-amber-200 text-amber-600";
    } else if (statusLower === "addedtonormalboardapprovallist" || statusLower === "addedtodeviationboardapprovallist" || statusLower === "addedtonormalapprovallist") {
      return "bg-emerald-100 border-emerald-200 text-emerald-600";
    } else {
      return "bg-yellow-100 border-yellow-200 text-yellow-500";
    }
  };

  const formatStatusLabel = (status?: string) => {
    if (!status) return "";
    const statusUpper = status.toUpperCase().replace(/[\s_]+/g, "");
    switch (statusUpper) {
      case "NEW": return "New";
      case "INCOMPLETE": return "Incomplete";
      case "SUBMITTEDFORCOMMITTEEAPPROVAL": return "Submitted for Committee Approval";
      case "SUBMITTEDFORNORMALBOARDAPPROVAL": return "Submitted for Normal Board Approval";
      case "SUBMITTEDFORDEVIATIONBOARDAPPROVAL": return "Submitted for Deviation Board Approval";
      case "ADDEDTONORMALBOARDAPPROVALIST":
      case "ADDEDTONORMALBOARDAPPROVALLIST":
      case "ADDEDTONORMALAPPROVALLIST":
        return "Added to Normal Approval List";
      case "ADDEDTODEVIATIONBOARDAPPROVALLIST": return "Added to Deviation Board Approval List";
      case "APPROVED": return "Approved";
      case "REJECTED": return "Rejected";
      default: return status.replace(/_/g, " ");
    }
  };

  useEffect(() => {

  }, []);

  // Real-time filtering as user changes filters
  useEffect(() => {
    if (requests.length === 0) return;

    let filtered = [...requests];

    // Filter by location (District Office that owns the request).
    //
    // This used to compare the student's free-text permanent address against a
    // district name with exact string equality — "No 12, Galle Road, Colombo 03"
    // never equals "colombo", so the filter could not match anything. It now reads
    // submissionLocation, the field the backend actually scopes on.
    //
    // The backend already restricts a District Office user to their own branch
    // before the data leaves the server; this only narrows within what they received.
    if (selectedLocations.length > 0) {
      filtered = filtered.filter((r) => {
        const requestLocation = (r.submissionLocation || "").toLowerCase().trim();
        if (!requestLocation) {
          // An untagged request matches no district. It used to fall through as
          // visible, which meant a District Office user saw every untagged request
          // in the system on top of their own. Mirrors matchesScope on the backend.
          return false;
        }
        return selectedLocations.some(
          (loc) => requestLocation === loc.toLowerCase().trim()
        );
      });
    }

    // Filter by status
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((r) => {
        if (!r.status) return false;
        const normalizedStatus = r.status.toLowerCase().replace(/[\s_]+/g, "");
        return selectedStatuses.includes(normalizedStatus);
      });
    }

    // Filter by application received date
    if (applicationReceivedOn !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((r) => {
        if (!r.requestDate) return false;
        const rDate = parseYMD(r.requestDate);
        if (!rDate) return false;

        if (applicationReceivedOn === "thisMonth") {
          return rDate.getMonth() === today.getMonth() && rDate.getFullYear() === today.getFullYear();
        } else if (applicationReceivedOn === "thisAndLastMonth") {
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          lastMonth.setHours(0, 0, 0, 0);
          return rDate >= lastMonth && rDate <= today;
        } else if (applicationReceivedOn === "datePeriod") {
          if (fromDate && toDate) {
            const start = parseYMD(fromDate);
            const end = parseYMD(toDate);
            if (!start || !end) return false;
            return rDate >= start && rDate <= end;
          }
          return true;
        }
        return true;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.studentName && r.studentName.toLowerCase().includes(q)) ||
          (r.memberName && r.memberName.toLowerCase().includes(q)) ||
          (r.memberId && r.memberId.toLowerCase().includes(q)) ||
          (r.requestId && r.requestId.toLowerCase().includes(q)) ||
          (r.nic && r.nic.toLowerCase().includes(q)) ||
          (r.examNumber && r.examNumber.toLowerCase().includes(q))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "requested-date") {
        cmp = (a.requestDate || "").localeCompare(b.requestDate || "");
      } else if (sortBy === "status") {
        cmp = (a.status || "").localeCompare(b.status || "");
      } else if (sortBy === "member-id") {
        cmp = (a.memberId || "").localeCompare(b.memberId || "");
      } else if (sortBy === "scholarship-id") {
        const aKey = a.requestId || String(a.id);
        const bKey = b.requestId || String(b.id);
        cmp = aKey.localeCompare(bKey);
      }
      return sortAsc ? cmp : -cmp;
    });

    console.log("Final filtered results:", filtered.length, "records");
    setDisplayed(filtered);
  }, [requests, selectedLocations, selectedStatuses, applicationReceivedOn, fromDate, toDate, searchQuery, sortBy, sortAsc]);

  // MultiSelect component for location and status filters
  function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select...",
    disabled = false,
  }: {
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
  }) {
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

    // Toggle selection of an option
    const toggle = (value: string) => {
      onChange(
        selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected, value]
      );
    };

    // A single selection shows its own name rather than "1 Selected": a District
    // Office user is pinned to exactly one district and the whole point of the
    // control is to tell them which one they are filtered to. Checked before the
    // "All Selected" branch so a one-option list still names the option.
    //
    // Falls back to the raw value when the district master has not loaded yet, so
    // the pinned district is never rendered as a bare count.
    const label =
      selected.length === 0
        ? placeholder
        : selected.length === 1
          ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
          : selected.length === options.length
            ? "All Selected"
            : `${selected.length} Selected`;

    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className="border-input flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={selected.length === 0 ? "text-muted-foreground" : ""}>
            {label}
          </span>
          <ChevronDown size={14} className="text-muted-foreground shrink-0" />
        </button>

        {open && !disabled && (
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

  // Validate date inputs
  const validateDates = () => {
    setDateError("");

    if (applicationReceivedOn === "datePeriod") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!fromDate || !toDate) {
        setDateError("Both From Date and To Date are required.");
        return false;
      }

      const [startYear, startMonth, startDay] = fromDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = toDate.split('-').map(Number);
      const start = new Date(startYear, startMonth - 1, startDay);
      const end = new Date(endYear, endMonth - 1, endDay);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (start > today) {
        setDateError("From Date must be a past date.");
        return false;
      }

      if (end > today) {
        setDateError("To Date must be a past date.");
        return false;
      }

      if (start >= end) {
        setDateError("From Date must be before To Date.");
        return false;
      }
    }

    return true;
  };

  // Handle date changes and validation
  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    setDateError("");
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    setDateError("");
  };

  // Function to retrieve fresh data from backend
  const handleRetrieve = async () => {
    if (!validateDates()) {
      return;
    }
    try {
      setIsLoading(true);

      // The backend scopes this to the caller's own District Office before it
      // returns, so a restricted user never receives another branch's records.
      const res = await authFetch("http://localhost:8080/api/university-scholarships");
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setRequests(data);
      } else {
        setRequests([]);
        setDisplayed([]);
      }
      setHasRetrieved(true);
    } catch (error) {
      console.error("Failed to retrieve requests:", error);
      setRequests([]);
      setDisplayed([]);
      setHasRetrieved(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenBoardMeetingModal = async (deviation = false) => {
    try {
      const res = await authFetch("http://localhost:8080/api/board-meetings/getAllBoardMeetings");
      if (!res.ok) {
        throw new Error("Failed to fetch board meetings");
      }
      const data = await res.json();

      // Only meetings that have not happened yet — an approval list must not be
      // attached to a Board Meeting whose date has already passed. Today counts as
      // still upcoming.
      //
      // Compared as yyyy-mm-dd strings rather than Date objects on purpose:
      // new Date("2026-04-04") parses as UTC midnight, so in a non-UTC timezone a
      // meeting could land on the wrong side of the boundary by a few hours.
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const upcoming = (Array.isArray(data) ? data : []).filter(
        (meeting: any) =>
          typeof meeting?.scheduledDate === "string" &&
          meeting.scheduledDate.slice(0, 10) >= today
      );

      setBoardMeetings(upcoming);
      setIsDeviationModal(deviation);
      setShowBoardMeetingModal(true);
    } catch (error) {
      console.error("Failed to fetch board meetings:", error);
      alert("Failed to retrieve Board Meetings.");
    }
  };

  const handleCloseBoardMeetingModal = () => {
    setShowBoardMeetingModal(false);
    setSelectedBoardMeeting("");
  };

  const handleSaveBoardMeeting = async () => {
    if (!selectedBoardMeeting) {
      alert("Please select a Board Meeting.");
      return;
    }
    try {
      setIsSavingApprovalList(true);
      const requestIds = selectedRequests.map(r => r.requestId).filter(Boolean);

      const endpoint = isDeviationModal
        ? "http://localhost:8080/api/university-scholarships/attach-deviation-board-meeting"
        : "http://localhost:8080/api/university-scholarships/attach-board-meeting";

      const res = await authFetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          boardMeetingId: Number(selectedBoardMeeting),
          requestIds: requestIds,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to attach requests to Board Meeting");
      }

      setCreatedCount(selectedRequests.length);
      setConfirmedIsDeviation(isDeviationModal);
      setShowBoardMeetingModal(false);
      setSelectedBoardMeeting("");
      setShowConfirmModal(true);

      // Refresh table data
      await handleRetrieve();
      setSelectedIds([]);
    } catch (error) {
      console.error("Failed to create approval list:", error);
      alert(error instanceof Error ? error.message : "Failed to create approval list");
    } finally {
      setIsSavingApprovalList(false);
    }
  };

  // Allow-list: a role reaches this page only by holding a University Scholarship
  // right explicitly. Waits for `user` so the guard does not flash before auth loads.
  if (user && !canViewPage) {
    return (
      <AccessRestricted message="University Scholarships are restricted to District Office, Head Office and Scholarship personnel." />
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#953002]">
          University Scholarships
        </h1>

        <div className="flex gap-2">
          {showNormalApprovalBtn && (
            <Button className="bg-[#e3ac00] hover:bg-[#c99500] text-white" onClick={() => handleOpenBoardMeetingModal(false)}>
              Create University Scholarship Normal Approval List ({selectedRequests.length})
            </Button>
          )}

          {showDeviationApprovalBtn && (
            <Button className="bg-[#e3ac00] hover:bg-[#c99500] text-white" onClick={() => handleOpenBoardMeetingModal(true)}>
              Create University Scholarship Deviation Approval List ({selectedRequests.length})
            </Button>
          )}

          <Link href="/membership/directory">
            <Button className="bg-[#7a2700] text-white hover:bg-[#953002]">
              + New Application
            </Button>
          </Link>

          <Link href="/scholarships/university/approvals">
            <Button variant="outline">Approval Lists</Button>
          </Link>
        </div>
      </div>
      <div className="px-6">
        {/* Search Criteria Card */}
        <Card className="rounded-xl shadow-sm py-0 mb-4">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-base text-[#953002]">Search Criteria</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Location (District)</label>
                <MultiSelect
                  options={locationOptions}
                  selected={selectedLocations}
                  onChange={setSelectedLocations}
                  placeholder="Select Locations"
                  disabled={!canSelectAllLocationOptions}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Request Received On</label>
                <Select value={applicationReceivedOn} onValueChange={(value) => { setApplicationReceivedOn(value); setDateError(""); }}>
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

            {applicationReceivedOn === "datePeriod" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">From Date</label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => handleFromDateChange(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">To Date</label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => handleToDateChange(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}

            {dateError && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {dateError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-medium text-gray-600">Search (MemberName / MemberID / StudentName / StudentNIC / RequestID / ExamNumber)</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by StudentName, StudentID, MemberName, MemberID, ExamNumber or Request ID..."
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Requested Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requested-date">Requested Date</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="member-id">Member ID</SelectItem>
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
                  <Button className="bg-[#7a2700] hover:bg-[#953002] text-white whitespace-nowrap" onClick={handleRetrieve} disabled={isLoading}>
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
                  <th className="py-4 px-4 font-medium w-10">
                    <Checkbox
                      checked={
                        isAllSelectableSelected
                          ? true
                          : isSomeSelectableSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(checked) => toggleAllSelectable(checked === true)}
                      disabled={selectableDisplayedRowIds.length === 0}
                      className="data-[state=checked]:bg-[#953002] data-[state=checked]:border-[#953002]"
                    />
                  </th>
                  <th className="py-4 px-4 font-medium">Request ID</th>
                  <th className="py-4 px-4 font-medium">Student</th>
                  <th className="py-4 px-4 font-medium">NIC</th>
                  <th className="py-4 px-4 font-medium">Member</th>
                  <th className="py-4 px-4 font-medium">Status</th>
                  <th className="py-4 px-4 font-medium">Indicator</th>
                  <th className="py-4 px-4 font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-gray-500">
                      No data available
                    </td>
                  </tr>
                ) : (
                  displayed.map((item) => {
                    const requestKey = item.requestId || String(item.id);
                    const isDeviation = (item.status || "").toUpperCase().includes("DEVIATION") || (item.approvalListId || "").startsWith("USDL-");

                    return (
                      <tr key={item.id} className="border-t text-sm text-gray-600">
                        <td className="py-4 px-4">
                          {isSelectable(item) ? (
                            <Checkbox
                              checked={selectedIds.includes(item.id)}
                              onCheckedChange={() => toggleRow(item.id)}
                              className="data-[state=checked]:bg-[#953002] data-[state=checked]:border-[#953002]"
                            />
                          ) : (
                            <span className="size-4 block" />
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <Link
                            href={`/membership/directory/university-scholarship?requestId=${encodeURIComponent(requestKey)}&mode=view`}
                            className="text-[#953002] hover:underline font-medium"
                          >
                            {requestKey}
                          </Link>
                        </td>
                        <td className="py-4 px-4 text-gray-600">{item.studentName}</td>
                        <td className="py-4 px-4 text-gray-600">{item.nic}</td>
                        <td className="py-4 px-4 text-gray-600">{item.memberName}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded-full border text-[11px] ${getStatusColor(item.status)}`}>
                            {formatStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {isDeviation ? (
                            <span
                              title="Deviation Process"
                              className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-semibold cursor-help"
                            >
                              <AlertCircle size={12} />
                              Deviation
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {(item.status?.toUpperCase() === "NEW" || item.status?.toUpperCase() === "INCOMPLETE") ? (
                            <Link
                              href={`/membership/directory/university-scholarship?requestId=${encodeURIComponent(requestKey)}&mode=edit`}
                              className="text-[#953002] hover:text-[#c44515] transition-colors"
                            >
                              <Pencil size={18} />
                            </Link>
                          ) : (
                            <Link
                              href={`/membership/directory/university-scholarship?requestId=${encodeURIComponent(requestKey)}&mode=view`}
                              className="text-[#953002] hover:underline font-medium"
                            >
                              Open
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

      {showBoardMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[500px] rounded-xl border bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#953002]">
                  {isDeviationModal ? "Create Deviation Approval List" : "Select Board Meeting"}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Select the Board Meeting for these {selectedRequests.length} scholarship requests.
                </p>
              </div>
              <button onClick={handleCloseBoardMeetingModal} className="text-gray-400 hover:text-gray-600">
                <span className="text-xl">×</span>
              </button>
            </div>
            <div className="flex flex-col gap-2 mb-6">
              <label className="text-xs font-semibold text-gray-600">Board Meeting Record</label>
              <Select value={selectedBoardMeeting} onValueChange={setSelectedBoardMeeting}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a Board Meeting..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {boardMeetings.length === 0 ? (
                    <SelectItem value="none" disabled>No upcoming Board Meetings</SelectItem>
                  ) : (
                    boardMeetings.map((meeting: any) => (
                      <SelectItem key={meeting.id} value={String(meeting.id)}>
                        {meeting.scheduledDate} ({meeting.boardMeetingId || meeting.id})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleCloseBoardMeetingModal} disabled={isSavingApprovalList}>
                Cancel
              </Button>
              <Button className="bg-[#953002] hover:bg-[#7a2700] text-white" onClick={handleSaveBoardMeeting} disabled={isSavingApprovalList || !selectedBoardMeeting}>
                {isSavingApprovalList ? "Saving..." : "Save Details"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[500px] rounded-xl border bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-[#953002] mb-3">Approval List Created</h3>
            <p className="text-sm text-gray-600 mb-6">
              {confirmedIsDeviation
                ? `The University Scholarship Deviation Approval List for ${createdCount} requests has been created. Do you want to view the list?`
                : `The University Scholarship Normal Approval List for ${createdCount} requests has been created. Do you want to view the list?`}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                No
              </Button>
              <Button className="bg-[#953002] hover:bg-[#7a2700] text-white" onClick={() => {
                setShowConfirmModal(false);
                router.push(confirmedIsDeviation
                  ? "/scholarships/university/approvals?tab=deviation"
                  : "/scholarships/university/approvals"
                );
              }}>
                Yes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
