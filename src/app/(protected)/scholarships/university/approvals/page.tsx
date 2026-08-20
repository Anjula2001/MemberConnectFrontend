"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { ArrowLeft, Printer, Search, Trash2, ChevronDown, File, CheckCircle2, Upload, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import AccessRestricted from "@/src/components/AccessRestricted";
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
  boardMeetingId?: number;
  boardMeetingName?: string;
  scheduledDate?: string;
  approvalListId?: string;
  processedBy?: string;
  processedAt?: string;
  rejectReason?: string;
};

type GroupedList = {
  approvalListId: string;
  boardMeetingId: number;
  boardMeetingName: string;
  scheduledDate?: string;
  requests: RequestRow[];
};

type BoardMeetingOption = {
  id: number;
  boardMeetingId: string;
  scheduledDate: string;
  actualDate?: string;
};

// Per-row approval decision
type RowDecision = {
  action: "approve" | "reject";
  reason: string;
};


function ApprovalsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"normal" | "deviation">(
    searchParams.get("tab") === "deviation" ? "deviation" : "normal"
  );

  const switchTab = (tab: "normal" | "deviation") => {
    setActiveTab(tab);
    router.replace(`/scholarships/university/approvals${tab === "deviation" ? "?tab=deviation" : ""}`);
    setAllGroupedLists([]);
    setFilteredLists([]);
    setHasRetrieved(false);
    setSelectedListId(null);
    setRetrievedRequests([]);
    setHasRetrievedRequests(false);
    setDecisions({});
    setShowConfirmPopup(false);
  };

  // Helper to determine list status
  const getListStatus = (list: GroupedList) => {
    if (!list.requests || list.requests.length === 0) return "CREATED";
    const allProcessed = list.requests.every(
      (r) => {
        const s = (r.status || "").toUpperCase();
        return s === "APPROVED" || s === "REJECTED";
      }
    );
    return allProcessed ? "PROCEED" : "CREATED";
  };

  // Filter controls
  const [filterMode, setFilterMode] = useState<"all" | "custom">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState("");

  const [allGroupedLists, setAllGroupedLists] = useState<GroupedList[]>([]);
  const [filteredLists, setFilteredLists] = useState<GroupedList[]>([]);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [hasRetrieved, setHasRetrieved] = useState(false);

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [retrievedRequests, setRetrievedRequests] = useState<RequestRow[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [hasRetrievedRequests, setHasRetrievedRequests] = useState(false);

  const [decisions, setDecisions] = useState<Record<string, RowDecision>>({});
  const [proceedErrors, setProceedErrors] = useState<Record<string, string>>({});

  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [popupComment, setPopupComment] = useState("");
  const [boardMeetingOptions, setBoardMeetingOptions] = useState<BoardMeetingOption[]>([]);
  const [actualBoardMeetingDate, setActualBoardMeetingDate] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [processSuccess, setProcessSuccess] = useState(false);

  const canDelete = hasPermission(user?.role, "US_LIST_DELETE");
  const canPrint = hasPermission(user?.role, "US_LIST_PRINT");
  const canProcess = hasPermission(user?.role, "US_LIST_PROCESS");
  const [pendingDeleteListId, setPendingDeleteListId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const normalizeScholarshipStatus = (status?: string) => {
    if (!status) return "";

    const normalized = status.toUpperCase().replace(/[\s_]+/g, "");

    if (
      normalized === "ADDEDTONORMALBOARDAPPROVALLIST" ||
      normalized === "ADDEDTOSCHOLARSHIPNORMALAPPROVALLIST"
    ) {
      return "addedtoscholarshipnormalapprovallist";
    }

    if (
      normalized === "ADDEDTODEVIATIONBOARDAPPROVALLIST" ||
      normalized === "ADDEDTOSCHOLARSHIPDEVIATIONAPPROVALLIST"
    ) {
      return "addedtoscholarshipdeviationapprovallist";
    }

    return normalized.toLowerCase();
  };

  //date validation
  const parseYMD = (input?: string | null) => {
    if (!input) return null;
    const match = String(input).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const parsed = new Date(year, month, day);
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  };

  const validateDates = () => {
    setDateError("");

    if (filterMode !== "custom") {
      return true;
    }

    if (!startDate || !endDate) {
      setDateError("Both From Date and To Date are required.");
      return false;
    }

    const from = parseYMD(startDate);
    const to = parseYMD(endDate);
    if (!from || !to) {
      setDateError("Please enter valid dates.");
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (from > today || to > today) {
      setDateError("Date period cannot include a future date.");
      return false;
    }

    if (from > to) {
      setDateError("From Date must be earlier than To Date.");
      return false;
    }

    return true;
  };

  const getRelevantRequests = (requests: RequestRow[], tab: "normal" | "deviation") => {
    const prefix = tab === "deviation" ? "USDL-" : "USNL-";
    return requests.filter((request) => request.approvalListId && request.approvalListId.startsWith(prefix));
  };


  // ── Fetch all approval lists from backend ────────────────────────────────
  const retrieveLists = async () => {
    try {
      if (!validateDates()) {
        setHasRetrieved(false);
        setAllGroupedLists([]);
        setFilteredLists([]);
        return;
      }

      setIsRetrieving(true);
      setHasRetrieved(false);
      setSelectedListId(null);
      setRetrievedRequests([]);
      setHasRetrievedRequests(false);
      setDecisions({});
      setShowConfirmPopup(false);

      const res = await authFetch("http://localhost:8080/api/university-scholarships");
      if (!res.ok) throw new Error("Failed to fetch scholarship requests");
      const data: RequestRow[] = await res.json();

      // Collect all requests that have been attached to an approval list
      const attached = data.filter((r) => r.approvalListId);

      // Build groups keyed by approvalListId 
      const groups: Record<string, GroupedList> = {};
      attached.forEach((req) => {
        const listId = req.approvalListId!;
        if (!groups[listId]) {
          groups[listId] = {
            approvalListId: listId,
            boardMeetingId: req.boardMeetingId!,
            boardMeetingName: req.boardMeetingName || `Meeting #${req.boardMeetingId}`,
            scheduledDate: req.scheduledDate,
            requests: [],
          };
        }
        groups[listId].requests.push(req);
      });

      // Keep only the requests relevant to the active tab
      const groupArr = Object.values(groups)
        .map((group) => ({
          ...group,
          requests: getRelevantRequests(group.requests, activeTab),
        }))
        .filter((group) => group.requests.length > 0);

      setAllGroupedLists(groupArr);
      applyFilter(groupArr);
      setHasRetrieved(true);
    } catch (err) {
      console.error("Error fetching approval lists:", err);
    } finally {
      setIsRetrieving(false);
    }
  };

  const applyFilter = (lists: GroupedList[]) => {
    if (filterMode === "all") {
      setDateError("");
      setFilteredLists(lists);
      return;
    }
    const from = parseYMD(startDate);
    const to = parseYMD(endDate);
    setFilteredLists(
      lists.filter((g) => {
        if (!g.scheduledDate) return false;
        const d = parseYMD(g.scheduledDate);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
    );
  };

  // ── Retrieve requests for selected list ──────────────────────────────────
  const retrieveRequestsForList = async () => {
    if (selectedListId === null) return;
    const group = filteredLists.find((g) => g.approvalListId === selectedListId);
    if (!group) return;

    setIsLoadingRequests(true);
    setHasRetrievedRequests(false);
    setDecisions({});
    setShowConfirmPopup(false);

    await new Promise((r) => setTimeout(r, 400));

    const requests = getRelevantRequests(group.requests, activeTab);
    setRetrievedRequests(requests);

    // Default every request to "approve"
    const defaultDecisions: Record<string, RowDecision> = {};
    requests.forEach((req) => {
      const key = req.requestId || String(req.id);
      defaultDecisions[key] = { action: "approve", reason: "" };
    });
    setDecisions(defaultDecisions);

    setHasRetrievedRequests(true);
    setIsLoadingRequests(false);
  };

  // ── Handle decision change per row ───────────────────────────────────────
  const handleDecisionChange = (key: string, action: "approve" | "reject") => {
    setDecisions((prev) => ({
      ...prev,
      [key]: { action, reason: prev[key]?.reason || "" },
    }));
    setProceedErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleReasonChange = (key: string, reason: string) => {
    setDecisions((prev) => ({
      ...prev,
      [key]: { ...prev[key], action: prev[key]?.action || "reject", reason },
    }));
    if (reason.trim()) {
      setProceedErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  //the Actual Board Meeting Date is a selection over the Board Meeting
  const fetchBoardMeetingOptions = async () => {
    try {
      const res = await authFetch(
        "http://localhost:8080/api/board-meetings/getAllBoardMeetings"
      );
      if (!res.ok) {
        console.error("Failed to fetch board meetings:", res.status);
        return;
      }
      const data: BoardMeetingOption[] = await res.json();
      setBoardMeetingOptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch board meetings:", error);
    }
  };

  // ── Proceed button clicked ────────────────────────────────────────────────
  const handleProceed = async () => {
    // Validate: all rejected rows must have a reason
    const errors: Record<string, string> = {};
    retrievedRequests.forEach((req) => {
      const key = req.requestId || String(req.id);
      const dec = decisions[key];
      if (dec?.action === "reject" && !dec.reason.trim()) {
        errors[key] = "Rejection reason is mandatory.";
      }
    });

    if (Object.keys(errors).length > 0) {
      setProceedErrors(errors);
      return;
    }

    setProceedErrors({});

    // Set default actual board meeting date from the selected group's scheduledDate
    const group = filteredLists.find((g) => g.approvalListId === selectedListId);
    if (group?.scheduledDate) {
      setActualBoardMeetingDate(group.scheduledDate);
    } else {
      setActualBoardMeetingDate("");
    }

    setPopupComment("");
    setUploadedFile(null);
    setProcessError(null);
    setProcessSuccess(false);

    await fetchBoardMeetingOptions();
    setShowConfirmPopup(true);
  };

  // ── Process approvals ─────────────────────────────────────────────────────
  const handleProcess = async () => {
    setIsProcessing(true);
    setProcessError(null);

    try {
      const payload = retrievedRequests.map((req) => {
        const key = req.requestId || String(req.id);
        const dec = decisions[key];
        return {
          requestId: req.requestId || req.id,
          action: dec?.action ?? "approve",
          reason: dec?.action === "reject" ? dec.reason : undefined,
        };
      });

      const formData = new FormData();
      formData.append(
        "data",
        JSON.stringify({
          approvalListId: selectedListId,
          actualBoardMeetingDate,
          comment: popupComment,
          decisions: payload,
        })
      );
      if (uploadedFile) {
        formData.append("file", uploadedFile);
      }

      const endpoint =
        activeTab === "deviation"
          ? "http://localhost:8080/api/university-scholarships/process-deviation-approvals"
          : "http://localhost:8080/api/university-scholarships/process-approvals";

      const res = await authFetch(endpoint, { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to process approvals");
      }

      setProcessSuccess(true);
      // Refresh the lists after a short delay
      setTimeout(() => {
        setShowConfirmPopup(false);
        retrieveLists();
      }, 1800);
    } catch (err: any) {
      setProcessError(err.message ?? "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Delete approval list ──────────────────────────────────────────────────
  const deleteApprovalList = async (approvalListId: string) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const endpoint = activeTab === "deviation"
        ? `http://localhost:8080/api/university-scholarships/deviation-approval-list/${approvalListId}`
        : `http://localhost:8080/api/university-scholarships/approval-list/${approvalListId}`;

      const res = await authFetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to delete the approval list");
      }
      setFilteredLists((prev) => prev.filter((g) => g.approvalListId !== approvalListId));
      setAllGroupedLists((prev) => prev.filter((g) => g.approvalListId !== approvalListId));
      if (selectedListId === approvalListId) {
        setSelectedListId(null);
        setRetrievedRequests([]);
        setHasRetrievedRequests(false);
        setDecisions({});
      }
      setPendingDeleteListId(null);
    } catch (err: any) {
      setDeleteError(err.message ?? "An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  const printRequests = () => window.print();

  // ── Status badge ─────────────────────────────────────────────────────────
  const statusBadge = (status?: string) => {
    if (!status) return null;
    const statusKey = normalizeScholarshipStatus(status);
    const map: Record<string, string> = {
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      addedtoscholarshipnormalapprovallist: "bg-blue-100 text-blue-700",
      addedtoscholarshipdeviationapprovallist: "bg-purple-100 text-purple-700",
    };
    const cls = map[statusKey] ?? "bg-gray-100 text-gray-600";
    const label =
      statusKey === "addedtoscholarshipnormalapprovallist"
        ? "Added to Scholarship Normal Approval List"
        : statusKey === "addedtoscholarshipdeviationapprovallist"
          ? "Added to Scholarship Deviation Approval List"
          : status;
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
        {label}
      </span>
    );
  };

  // ── Derived counts for popup summary ─────────────────────────────────────
  const totalCount = retrievedRequests.length;
  const approveCount = retrievedRequests.filter((req) => {
    const key = req.requestId || String(req.id);
    return decisions[key]?.action !== "reject";
  }).length;
  const rejectCount = totalCount - approveCount;

  // ── Selected list info ────────────────────────────────────────────────────
  const selectedGroup = filteredLists.find((g) => g.approvalListId === selectedListId);
  const todayIsoDate = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })();
  const minActualBoardMeetingDate = selectedGroup?.scheduledDate?.slice(0, 10) ?? "";

  const selectableBoardMeetingOptions = (() => {
    const inRange = boardMeetingOptions
      .filter((opt) => {
        const date = opt.scheduledDate?.slice(0, 10);
        if (!date) return false;
        if (date === minActualBoardMeetingDate) return true;
        return (
          (!minActualBoardMeetingDate || date >= minActualBoardMeetingDate) &&
          date <= todayIsoDate
        );
      })
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

    if (!minActualBoardMeetingDate) return inRange;

    const hasScheduled = inRange.some(
      (opt) => opt.scheduledDate?.slice(0, 10) === minActualBoardMeetingDate
    );
    return hasScheduled
      ? inRange
      : [
        { id: -1, boardMeetingId: "", scheduledDate: minActualBoardMeetingDate },
        ...inRange,
      ];
  })();
  const isProcessed = selectedGroup ? getListStatus(selectedGroup) === "PROCEED" : false;
  const firstRequest = retrievedRequests[0];

  //permission
  if (user && !hasPermission(user.role, "US_LIST_VIEW")) {
    return (
      <AccessRestricted
        message="University Scholarship Approval Lists are restricted to Head Office and Board Secretariat personnel."
        fallbackHref="/scholarships/university"
        fallbackLabel="Back to University Scholarships"
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/scholarships/university">
          <Button variant="ghost" size="icon" className="text-[#953002] hover:bg-[#fff6f2]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-[#953002]">
          University Scholarship Approval Lists
        </h1>
      </div>

      {/* ── TAB BAR ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => switchTab("normal")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "normal"
            ? "bg-white text-[#953002] shadow-sm"
            : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Normal Board Approval
        </button>
        <button
          onClick={() => switchTab("deviation")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "deviation"
            ? "bg-white text-[#953002] shadow-sm"
            : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Deviation Board Approval
        </button>
      </div>

      {/* ── FILTER SECTION ──────────────────────────────────────────────── */}
      <Card className="rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-bold text-[#953002] mb-4">Search Approval Lists</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Filter</label>
            <div className="relative w-64">
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]/40 appearance-none bg-white text-gray-700 w-full pr-10 shadow-sm"
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as "all" | "custom")}
              >
                <option value="all">All Dates</option>
                <option value="custom">Select Board Meeting Date Period</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {filterMode === "custom" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDateError("");
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]/40 text-gray-700 shadow-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDateError("");
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]/40 text-gray-700 shadow-sm"
                />
              </div>
            </>
          )}

          <Button
            onClick={retrieveLists}
            disabled={isRetrieving}
            className="bg-[#8b3007] hover:bg-[#702604] text-white gap-2 h-9 px-4 rounded-lg flex items-center justify-center font-semibold text-sm shadow-sm"
          >
            <Search size={15} />
            {isRetrieving ? "Retrieving..." : "Retrieve"}
          </Button>
        </div>

        {dateError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {dateError}
          </div>
        )}
      </Card>

      {/* ── TWO-COLUMN GRID ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-6">
        {/* Left Column: Approval Lists (col-span-4) */}
        <Card className="lg:col-span-4 rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between min-h-[480px]">
          <div>
            <h2 className="text-[#953002] text-lg font-bold">Approval Lists</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5 mb-6">Select a list to view details</p>

            {/* Headers */}
            <div className="flex justify-between items-center text-[11px] font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100 mb-3 px-1">
              <span>List ID</span>
              <span>Status</span>
            </div>

            {/* List Body */}
            {!hasRetrieved ? (
              <div className="text-center py-12 text-gray-400 text-xs italic">
                Use the filter above to retrieve lists
              </div>
            ) : filteredLists.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No approval lists found
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {filteredLists.map((list) => {
                  const isSelected = selectedListId === list.approvalListId;
                  const status = getListStatus(list);

                  return (
                    <div
                      key={list.approvalListId}
                      onClick={() => {
                        setSelectedListId(isSelected ? null : list.approvalListId);
                        setHasRetrievedRequests(false);
                        setRetrievedRequests([]);
                        setDecisions({});
                        setShowConfirmPopup(false);
                      }}
                      className={`flex justify-between items-center p-3 rounded-lg border transition-all cursor-pointer ${isSelected
                        ? "bg-gray-100 border-transparent"
                        : "bg-white border-gray-100 hover:bg-gray-50/80"
                        }`}
                    >
                      <div className="flex flex-col min-w-0 flex-1 mr-2">
                        <span className="text-sm font-semibold text-gray-800 font-mono truncate block max-w-[160px]" title={list.approvalListId}>
                          {list.approvalListId}
                        </span>
                      </div>

                      <div>
                        {isSelected ? (
                          <span className="text-xs font-bold text-gray-800">
                            {status}
                          </span>
                        ) : (
                          <span className="border border-gray-200 px-2 py-0.5 rounded-full text-[10px] font-semibold text-gray-500 bg-white">
                            {status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action button at the bottom of left card */}
          <div className="mt-6">
            <Button
              onClick={retrieveRequestsForList}
              disabled={selectedListId === null || isLoadingRequests}
              className="bg-[#8b3007] hover:bg-[#702604] disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold py-2.5 px-4 rounded-lg w-full transition-all duration-200 text-center text-sm shadow-sm flex items-center justify-center gap-2"
            >
              {isLoadingRequests ? "Retrieving..." : "Retrieve University Scholarship Requests"}
            </Button>
          </div>
        </Card>

        {/* Right Column: Applications Details (col-span-8) */}
        <Card className="lg:col-span-8 rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-[480px]">
          {/* Card Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-[#953002] text-lg font-bold">Applications</h2>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                {isProcessed
                  ? "This list has already been processed and is in read-only mode."
                  : "Click 'Retrieve University Scholarship Requests' to view data"}
              </p>
              {isProcessed && firstRequest && (
                <div className="mt-3 text-xs text-gray-600 bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 flex flex-col gap-1 max-w-md">
                  <p>
                    Processed by: <span className="font-semibold text-gray-900">{firstRequest.processedBy || "user1"}</span>
                  </p>
                  {firstRequest.processedAt && (
                    <p>
                      Date/Time:{" "}
                      <span className="font-semibold text-gray-900">
                        {new Date(firstRequest.processedAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true
                        })}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {hasRetrievedRequests && retrievedRequests.length > 0 && (
              <div className="flex items-center gap-2">
                {!isProcessed && canDelete && selectedListId !== null && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium"
                    onClick={() => {
                      setDeleteError(null);
                      setPendingDeleteListId(selectedListId);
                    }}
                  >
                    <Trash2 size={13} />
                    Delete List
                  </Button>
                )}
                {!isProcessed && canPrint && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-[#953002] text-[#953002] hover:bg-[#fff6f2] text-xs font-medium"
                    onClick={printRequests}
                  >
                    <Printer size={13} />
                    Print List
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Card Body */}
          {!hasRetrievedRequests ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center flex-1 py-16">
              <File size={56} className="text-gray-200 stroke-[1.2] mb-3" />
              <p className="text-sm font-semibold text-gray-400">
                Select a list and click Retrieve University Scholarship Requests
              </p>
            </div>
          ) : retrievedRequests.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              No requests found in this approval list.
            </div>
          ) : (
            <>
              <div className="border border-gray-100 rounded-lg overflow-x-auto flex-1 shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-xs text-gray-600">Request ID</TableHead>
                      <TableHead className="font-semibold text-xs text-gray-600">Member ID</TableHead>
                      <TableHead className="font-semibold text-xs text-gray-600">Student Name</TableHead>
                      <TableHead className="font-semibold text-xs text-gray-600">NIC</TableHead>
                      <TableHead className="font-semibold text-xs text-gray-600">Member Name</TableHead>
                      <TableHead className="font-semibold text-xs text-gray-600">University</TableHead>
                      <TableHead className="font-semibold text-xs text-gray-600">Decision</TableHead>
                      {/* New Approve/Reject column */}
                      <TableHead className="font-semibold text-xs text-gray-600 min-w-[210px]">Approve / Reject</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retrievedRequests.map((req) => {
                      const key = req.requestId || String(req.id);
                      const dec = decisions[key] ?? { action: "approve", reason: "" };
                      const rowError = proceedErrors[key];
                      return (
                        <TableRow
                          key={req.id}
                          className={`text-xs border-t transition-colors hover:bg-gray-50/60 ${dec.action === "reject" ? "bg-red-50/40" : ""
                            }`}
                        >
                          {/* Request ID */}
                          <TableCell className="p-3 font-semibold text-[#953002]">
                            <Link
                              href={`/membership/directory/university-scholarship?requestId=${encodeURIComponent(key)}&mode=view`}
                              className="hover:underline"
                            >
                              {req.requestId}
                            </Link>
                          </TableCell>

                          {/* Member ID */}
                          <TableCell className="p-3">
                            <Link
                              href={`/membership/directory/university-scholarship?requestId=${encodeURIComponent(key)}&mode=view`}
                              className="font-semibold text-[#953002] hover:underline"
                              title="Click to open request"
                            >
                              {req.memberId || "—"}
                            </Link>
                          </TableCell>

                          <TableCell className="p-3 text-gray-700">{req.studentName}</TableCell>
                          <TableCell className="p-3 text-gray-500">{req.nic || "—"}</TableCell>
                          <TableCell className="p-3 text-gray-700">{req.memberName || "—"}</TableCell>
                          <TableCell className="p-3 text-gray-600">{req.universityName || "—"}</TableCell>
                          <TableCell className="p-3">{statusBadge(req.status)}</TableCell>

                          {/* ── NEW: Approve / Reject column ── */}
                          <TableCell className="p-3">
                            {isProcessed ? (
                              <div className="flex flex-col gap-1">
                                <span className={`font-semibold px-2 py-0.5 rounded text-[11px] w-fit ${req.status === "APPROVED"
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                                  }`}>
                                  {req.status === "APPROVED" ? "✓ Approved" : "✗ Rejected"}
                                </span>
                                {req.status === "REJECTED" && req.rejectReason && (
                                  <p className="text-[10px] text-gray-500 font-medium italic mt-0.5">
                                    Reason: {req.rejectReason}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5 min-w-[190px]">
                                {/* Dropdown */}
                                <div className="relative">
                                  <select
                                    value={dec.action}
                                    onChange={(e) =>
                                      handleDecisionChange(key, e.target.value as "approve" | "reject")
                                    }
                                    className={`w-full border rounded-md px-2 py-1.5 text-xs font-semibold appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-[#953002]/30 shadow-sm transition-colors ${dec.action === "approve"
                                      ? "border-green-300 bg-green-50 text-green-700"
                                      : "border-red-300 bg-red-50 text-red-700"
                                      }`}
                                  >
                                    <option value="approve">✓ Approve</option>
                                    <option value="reject">✗ Reject</option>
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-gray-400" />
                                </div>

                                {/* Rejection reason — shown only when Reject is selected */}
                                {dec.action === "reject" && (
                                  <div className="flex flex-col gap-0.5">
                                    <textarea
                                      rows={2}
                                      placeholder="Enter rejection reason (mandatory)…"
                                      value={dec.reason}
                                      onChange={(e) => handleReasonChange(key, e.target.value)}
                                      className={`w-full border rounded-md px-2 py-1.5 text-xs text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-red-400/40 placeholder:text-gray-400 shadow-sm ${rowError ? "border-red-400 bg-red-50" : "border-red-200 bg-white"
                                        }`}
                                    />
                                    {rowError && (
                                      <p className="text-[10px] text-red-600 font-medium">{rowError}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* ── PROCEED BUTTON ── */}
              {!isProcessed && canProcess && (
                <div className="mt-5 flex justify-end">
                  <Button
                    onClick={handleProceed}
                    className="bg-[#8b3007] hover:bg-[#702604] text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 text-sm"
                  >
                    <CheckCircle2 size={15} />
                    Proceed
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>


      {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────────── */}
      {pendingDeleteListId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">Delete Approval List</h2>
                <p className="text-sm text-gray-600">
                  Do you want to delete the selected{" "}
                  <span className="font-semibold">
                    {activeTab === "deviation"
                      ? "University Scholarship Deviation Approval List"
                      : "University Scholarship Normal Approval List"}
                  </span>?
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  All scholarship requests attached to this list will be rolled back to{" "}
                  <span className="font-medium text-gray-700">
                    &quot;{activeTab === "deviation"
                      ? "Submitted for Deviation Board Approval"
                      : "Submitted for Normal Board Approval"}&quot;
                  </span>{" "}
                  status.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPendingDeleteListId(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white gap-2"
                onClick={() => deleteApprovalList(pendingDeleteListId!)}
                disabled={isDeleting}
              >
                <Trash2 size={14} />
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM PROCESS POPUP ─────────────────────────────────────────── */}
      {showConfirmPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden">
            {/* Popup Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#953002]/5 border-b border-[#953002]/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-[#953002]" />
                <h2 className="text-base font-bold text-[#953002]">Confirm Approval Process</h2>
              </div>
              <button
                onClick={() => setShowConfirmPopup(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">

              {/* ── Board Meeting Dates ── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Board Meeting Date
                  </label>
                  <div className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm text-gray-700 font-medium">
                    {selectedGroup?.scheduledDate
                      ? new Date(selectedGroup.scheduledDate + "T00:00:00").toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                      : "—"}
                  </div>
                  <p className="text-[10px] text-gray-400">As per the setup</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actual Board Meeting Date
                  </label>
                  <div className="relative">
                    <select
                      value={actualBoardMeetingDate}
                      onChange={(e) => setActualBoardMeetingDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]/40 appearance-none bg-white text-gray-700 pr-8 shadow-sm"
                    >
                      {selectableBoardMeetingOptions.map((opt) => (
                        <option key={`${opt.id}-${opt.scheduledDate}`} value={opt.scheduledDate}>
                          {new Date(opt.scheduledDate + "T00:00:00").toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-gray-400">Select if meeting was postponed</p>
                </div>
              </div>

              {/* ── Summary ── */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Request Summary</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg border border-gray-100 p-3 text-center shadow-sm">
                    <p className="text-2xl font-bold text-gray-800">{totalCount}</p>
                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">Total Requests</p>
                  </div>
                  <div className="bg-green-50 rounded-lg border border-green-100 p-3 text-center shadow-sm">
                    <p className="text-2xl font-bold text-green-700">{approveCount}</p>
                    <p className="text-[11px] text-green-600 font-medium mt-0.5">To Approve</p>
                  </div>
                  <div className="bg-red-50 rounded-lg border border-red-100 p-3 text-center shadow-sm">
                    <p className="text-2xl font-bold text-red-700">{rejectCount}</p>
                    <p className="text-[11px] text-red-600 font-medium mt-0.5">To Reject</p>
                  </div>
                </div>
              </div>

              {/* ── File Upload ── */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Upload Scanned Report <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${uploadedFile
                    ? "border-[#953002]/40 bg-[#fff6f2]"
                    : "border-gray-200 bg-gray-50 hover:border-[#953002]/40 hover:bg-[#fff6f2]/50"
                    }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setUploadedFile(file);
                    }}
                  />
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <File size={18} className="text-[#953002]" />
                      <span className="text-sm text-[#953002] font-medium truncate max-w-[300px]">
                        {uploadedFile.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload size={20} className="text-gray-300" />
                      <p className="text-xs text-gray-500 font-medium">
                        Click to upload scanned image of the approved report
                      </p>
                      <p className="text-[10px] text-gray-400">PNG, JPG, PDF accepted</p>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">
                  Upload a scanned image of the approved &apos;University Scholarship Normal Request List for Board Approval&apos; report.
                </p>
              </div>

              {/* ── Comment ── */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Comment <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Add a comment if needed…"
                  value={popupComment}
                  onChange={(e) => setPopupComment(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#953002]/30 placeholder:text-gray-400 shadow-sm"
                />
              </div>

              {/* Process error */}
              {processError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {processError}
                </div>
              )}

              {/* Success */}
              {processSuccess && (
                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  Approvals processed successfully! Notifications will be sent to members and students.
                </div>
              )}
            </div>

            {/* Popup Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <p className="text-xs text-gray-500">
                SMS &amp; Email notifications will be sent upon processing.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmPopup(false)}
                  disabled={isProcessing}
                  className="text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing || processSuccess}
                  className="bg-[#8b3007] hover:bg-[#702604] text-white font-semibold px-6 text-sm gap-2 shadow-sm"
                >
                  <CheckCircle2 size={15} />
                  {isProcessing ? "Processing..." : "Process"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading...</div>}>
      <ApprovalsPageInner />
    </Suspense>
  );
}
