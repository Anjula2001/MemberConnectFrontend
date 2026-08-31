"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { ArrowLeft, Printer, Search, Trash2, ChevronDown, File, CheckCircle2, Upload, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { hasPermission, canDeleteUniversityList } from "@/lib/permissions";
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

  // Authorised Head Office and Super Admin only. Board Secretary lost this on
  // 2026-08-27 — it cannot carry the authority flag the right now depends on.
  const canDelete = canDeleteUniversityList(user);
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
  /*
   * Opens the report route rather than printing this page. window.print() here put the
   * sidebar, the tab bar and the search panel on the sheet - a screenshot of the
   * application, not a board report.
   */
  const printRequests = () => {
    if (!selectedListId) return;
    router.push(
      `/scholarships/university/approvals/print/${encodeURIComponent(selectedListId)}`
    );
  };

  // ── Status badge ─────────────────────────────────────────────────────────
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
    /* Same page shell as the Grade 5 approval lists: full width, and one gap-4 between
       the title, the tabs, the search card and the grid — rather than max-w-7xl with a
       different ad-hoc margin on each child, which is what made the vertical rhythm
       uneven and the cards sit in a narrower centred column. */
    <div className="w-full flex flex-1 flex-col gap-4 p-6 pt-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/scholarships/university">
          <Button variant="ghost" size="icon" className="text-[#953002] hover:bg-[#fff6f2]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-[#953002]">
          University Scholarship Approval Lists
        </h1>
      </div>

      {/* Tabs — same control the Grade 5 approval lists use. */}
      <div className="inline-flex w-fit rounded-md border bg-muted p-1">
        <Button
          type="button"
          variant={activeTab === "normal" ? "secondary" : "ghost"}
          className={`h-8 rounded-sm px-3 text-xs ${activeTab === "normal"
            ? "bg-white text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-transparent"
            }`}
          onClick={() => switchTab("normal")}
        >
          Normal Board Approval
        </Button>
        <Button
          type="button"
          variant={activeTab === "deviation" ? "secondary" : "ghost"}
          className={`h-8 rounded-sm px-3 text-xs ${activeTab === "deviation"
            ? "bg-white text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-transparent"
            }`}
          onClick={() => switchTab("deviation")}
        >
          Deviation Board Approval
        </Button>
      </div>

      {/* Search Approval Lists — Card + CardHeader, h-9 controls, Retrieve inline,
          matching the Grade 5 approval lists and the rest of the criteria panels. */}
      <Card className="rounded-xl py-0 shadow-sm">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-lg font-bold text-[#953002]">
            Search Approval Lists
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex w-full flex-col gap-1 md:max-w-md">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
              Date Filter
            </label>
            <div className="flex items-center gap-2">
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as "all" | "custom")}
                className="h-9 flex-1 rounded-md border bg-white px-3 text-sm"
              >
                <option value="all">All Dates</option>
                <option value="custom">Select Board Meeting Date Period</option>
              </select>
              <Button
                type="button"
                onClick={retrieveLists}
                disabled={isRetrieving}
                className="h-9 bg-[#953002] text-white hover:bg-[#7a2700]"
              >
                <Search size={14} className="mr-1" />
                {isRetrieving ? "Retrieving..." : "Retrieve"}
              </Button>
            </div>
          </div>

          {filterMode === "custom" && (
            <div className="mt-3 grid max-w-md grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDateError("");
                  }}
                  className="h-9 w-full rounded-md border bg-white px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDateError("");
                  }}
                  className="h-9 w-full rounded-md border bg-white px-3 text-sm"
                />
              </div>
            </div>
          )}

          {dateError && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {dateError}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[350px_1fr]">

        {/* Left Panel: Approval Lists — same card, header row and row treatment as the
            Grade 5 approval lists. */}
        <Card className="overflow-hidden rounded-xl py-0 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-lg font-bold text-[#953002]">Approval Lists</CardTitle>
            <p className="text-xs text-muted-foreground">Select a list to view details</p>
          </CardHeader>
          <CardContent className="px-0 pb-4">
            <div className="border-y text-sm">
              <div className="grid grid-cols-[1fr_auto] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <span>List ID</span>
                <span>Status</span>
              </div>

              {!hasRetrieved ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Use the filter above to retrieve lists.
                </div>
              ) : filteredLists.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No approval lists found.
                </div>
              ) : (
                filteredLists.map((list) => {
                  const isSelected = selectedListId === list.approvalListId;
                  const status = getListStatus(list);

                  return (
                    <button
                      key={list.approvalListId}
                      type="button"
                      onClick={() => {
                        setSelectedListId(isSelected ? null : list.approvalListId);
                        setHasRetrievedRequests(false);
                        setRetrievedRequests([]);
                        setDecisions({});
                        setShowConfirmPopup(false);
                      }}
                      className={`grid w-full grid-cols-[1fr_auto] items-center border-t px-5 py-3 text-left transition-colors first:border-t-0 hover:bg-[#f6f6f6] ${isSelected ? "bg-[#d9d9d9]" : ""
                        }`}
                    >
                      <div className="leading-tight">
                        <p className="truncate text-sm font-medium text-gray-800" title={list.approvalListId}>
                          {list.approvalListId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {list.scheduledDate || "—"}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status === "PROCEED"
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                        }`}>
                        {status}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-3 pt-3">
              <Button
                type="button"
                className="h-9 w-full bg-[#953002] text-white hover:bg-[#7a2700]"
                disabled={selectedListId === null || isLoadingRequests}
                onClick={retrieveRequestsForList}
              >
                {isLoadingRequests ? "Retrieving..." : "Retrieve Applications"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* min-w-0 is what stops this card blowing past the viewport. A grid item
            defaults to min-width:auto, so without it the column refuses to shrink below
            the table's intrinsic width and the whole card grows instead of the table
            scrolling inside it — clipping the action buttons and the last column. */}
        {/* Right Panel: Applications Details — same card shell as Grade 5. */}
        <Card className="min-w-0 rounded-xl py-0 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-lg font-bold text-[#953002]">Applications</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isProcessed
                    ? "This list has already been processed and is in read-only mode."
                    : hasRetrievedRequests && retrievedRequests.length > 0
                      ? `Showing ${retrievedRequests.length} applications for List ${selectedListId}`
                      : "Click 'Retrieve Applications' to view data"}
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
              <div className="flex flex-wrap items-center gap-2">
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
          </CardHeader>

          <CardContent className="px-5 pb-5">
          {/* Card Body */}
          {!hasRetrievedRequests ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center flex-1 py-16">
              <File size={56} className="text-gray-200 stroke-[1.2] mb-3" />
              <p className="text-sm font-semibold text-gray-400">
                Select a list and click Retrieve Applications
              </p>
            </div>
          ) : retrievedRequests.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              No requests found in this approval list.
            </div>
          ) : (
            <>
              <div className="w-full flex-1 overflow-x-auto rounded-lg border border-neutral-300">
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="bg-[#fafafa] hover:bg-[#fafafa]">
                      {/*
                        * "Decision" used to sit here as a status badge, next to the
                        * Approve / Reject control. It carried nothing per row: before
                        * processing every request in a list holds the same status, and
                        * after processing the Approve / Reject cell already reads
                        * "Approved" or "Rejected" with the reason underneath.
                        */}
                      {/*
                        * The same column set as the Grade 5 approval lists and the
                        * Termination approval lists: identity, then the module's own
                        * decision data, then Decision and Reason as two columns.
                        *
                        * NIC and Member Name are gone. With Member ID and Student Name
                        * already present they were a third and fourth identifier the
                        * board never acts on, and they squeezed the decision controls.
                        */}
                      {[
                        "Request ID",
                        "Member ID",
                        "Student Name",
                        "University",
                      ].map((h) => (
                        <TableHead key={h} className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                          {h}
                        </TableHead>
                      ))}
                      <TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase w-40">Decision</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                        Reason (If Reject)
                      </TableHead>
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
                          <TableCell className="p-3 text-gray-600">{req.universityName || "—"}</TableCell>

                          {/* Decision */}
                          <TableCell className="p-3">
                            {isProcessed ? (
                              <span className={`font-semibold px-2 py-0.5 rounded text-[11px] w-fit inline-block ${req.status === "APPROVED"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                                }`}>
                                {req.status === "APPROVED" ? "✓ Approved" : "✗ Rejected"}
                              </span>
                            ) : (
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
                            )}
                          </TableCell>

                          {/* Reason (If Reject) — its own column now, so the decision
                              control keeps a stable width whether or not a reason is
                              being entered. */}
                          <TableCell className="p-3">
                            {isProcessed ? (
                              req.status === "REJECTED" && req.rejectReason ? (
                                <span className="text-xs text-gray-600">{req.rejectReason}</span>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )
                            ) : dec.action === "reject" ? (
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
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
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
                    className="bg-[#953002] hover:bg-[#7a2700] text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 text-sm"
                  >
                    <CheckCircle2 size={15} />
                    Proceed
                  </Button>
                </div>
              )}
            </>
          )}
          </CardContent>
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
                  className="bg-[#953002] hover:bg-[#7a2700] text-white font-semibold px-6 text-sm gap-2 shadow-sm"
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
