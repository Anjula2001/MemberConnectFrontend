"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, } from "@/src/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/src/components/ui/select";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Search, RotateCcw, ArrowUp, ChevronDown, Pencil } from "lucide-react";

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
};

export default function Page() {
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
  const [sortBy, setSortBy] = useState("request-id");
  const [sortAsc, setSortAsc] = useState(true);
  const [hasRetrieved, setHasRetrieved] = useState(false);
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBoardMeetingModal, setShowBoardMeetingModal] = useState(false);
  const [boardMeetings, setBoardMeetings] = useState<any[]>([]);
  const [selectedBoardMeeting, setSelectedBoardMeeting] = useState("");
  const [isSavingApprovalList, setIsSavingApprovalList] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  const hasRights = true; // rights to create University Scholarship Approval List

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
    { value: "Gampaha", label: "Gampaha" },
    { value: "anuradhapura", label: "Anuradhapura" },
    { value: "polonnaruwa", label: "Polonnaruwa" },
    { value: "mathale", label: "Mathale" },
    { value: "nuwaraeliya", label: "Nuwara Eliya" },
    { value: "kegalla", label: "Kegalla" },
    { value: "rathnapura", label: "Rathnapura" },
    { value: "Trincomalee", label: "Trincomalee" },
    { value: "batticaloa", label: "Batticaloa" },
    { value: "ampara", label: "Ampara" },
    { value: "badulla", label: "Badulla" },
    { value: "monaragala", label: "Monaragala" },
    { value: "hambantota", label: "Hambantota" }
  ];

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

    console.log("Total requests:", requests.length);
    console.log("Selected locations:", selectedLocations);
    console.log("Sample request data:", requests[0]);

    // Filter by location
    if (selectedLocations.length > 0) {
      filtered = filtered.filter((r) => {
        const requestAddress = (r.address || "").toLowerCase().trim();
        return selectedLocations.some(loc =>
          requestAddress === loc.toLowerCase().trim()
        );
      });
      console.log("After location filter:", filtered.length, "records");
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
      if (sortBy === "student") {
        cmp = (a.studentName || "").localeCompare(b.studentName || "");
      } else if (sortBy === "member") {
        cmp = (a.memberName || "").localeCompare(b.memberName || "");
      } else if (sortBy === "university") {
        cmp = (a.universityName || "").localeCompare(b.universityName || "");
      } else {
        cmp = (a.requestId || "").localeCompare(b.requestId || "");
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
  }: {
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
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

      const res = await fetch("http://localhost:8080/api/university-scholarships");
      const data = await res.json();

      console.log("Retrieved fresh data from backend:", data);

      if (Array.isArray(data) && data.length > 0) {
        const fieldNames = Object.keys(data[0]);
        console.log("Available fields in the data:", fieldNames);

        // Check for location-related fields
        const locationFields = fieldNames.filter(f =>
          f.toLowerCase().includes('location') ||
          f.toLowerCase().includes('district') ||
          f.toLowerCase().includes('area')
        );
        console.log("Location-related fields found:", locationFields);

        // Get all unique values for each field
        fieldNames.forEach(field => {
          const uniqueValues = [...new Set(data.map(r => r[field]))].slice(0, 5);
          console.log(`${field}:`, uniqueValues);
        });

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

  const handleOpenBoardMeetingModal = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/board-meetings/getAllBoardMeetings");
      if (!res.ok) {
        throw new Error("Failed to fetch board meetings");
      }
      const data = await res.json();
      setBoardMeetings(data);
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

      const res = await fetch("http://localhost:8080/api/university-scholarships/attach-board-meeting", {
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#953002]">
          University Scholarships
        </h1>

        <div className="flex gap-2">
          {showNormalApprovalBtn && (
            <Button className="bg-[#e3ac00] hover:bg-[#c99500] text-white" onClick={handleOpenBoardMeetingModal}>
              Create University Scholarship Normal Approval List ({selectedRequests.length})
            </Button>
          )}

          <Link href="/membership/directory/university-scholarship">
            <Button className="bg-[#D4183D] text-white hover:bg-[#a3152f]">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Request ID" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="request-id">Request ID</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="university">University</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setSortAsc((v) => !v)}>
                    <ArrowUp size={16} className={sortAsc ? "" : "rotate-180"} />
                  </Button>
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
                  <th className="py-4 px-4 font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-gray-500">
                      No data available
                    </td>
                  </tr>
                ) : (
                  displayed.map((item) => {
                    const requestKey = item.requestId || String(item.id);

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
                          {(item.status?.toUpperCase() === "NEW" || item.status?.toUpperCase() === "INCOMPLETE") && (
                            <Link
                              href={`/membership/directory/university-scholarship?requestId=${encodeURIComponent(requestKey)}&mode=edit`}
                              className="text-[#953002] hover:text-[#c44515] transition-colors"
                            >
                              <Pencil size={18} />
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
                <h3 className="text-xl font-bold text-[#953002]">Select Board Meeting</h3>
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
                    <SelectItem value="none" disabled>No Board Meetings created</SelectItem>
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
              The University Scholarship Normal Approval List for {createdCount} requests has been created. Do you want to view the list?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                No
              </Button>
              <Button className="bg-[#953002] hover:bg-[#7a2700] text-white" onClick={() => {
                setShowConfirmModal(false);
                router.push("/scholarships/university/approvals");
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