"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { ArrowLeft, FileText, Printer, Search, Trash2, Upload, X, CheckCircle2, XCircle, AlertCircle, ChevronDown, File } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  boardMeetingDate?: string;
};

type GroupedList = {
  boardMeetingId: number;
  boardMeetingName: string;
  boardMeetingDate?: string;
  requests: RequestRow[];
};

type BoardMeetingOption = {
  id: number;
  boardMeetingId: string;
  scheduledDate: string;
  actualDate?: string;
};

// Decision tracked per request
type Decision = "approve" | "reject";

// ─── Component ────────────────────────────────────────────────────────────────

function ApprovalsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state — reads ?tab=deviation from URL
  const [activeTab, setActiveTab] = useState<"normal" | "deviation">(
    searchParams.get("tab") === "deviation" ? "deviation" : "normal"
  );

  // Sync tab to URL when changed by user click
  const switchTab = (tab: "normal" | "deviation") => {
    setActiveTab(tab);
    router.replace(`/scholarships/university/approvals${tab === "deviation" ? "?tab=deviation" : ""}`);
    // Reset all list/request state on tab switch
    setAllGroupedLists([]);
    setFilteredLists([]);
    setHasRetrieved(false);
    setSelectedMeetingId(null);
    setRetrievedRequests([]);
    setHasRetrievedRequests(false);
    setDecisions({});
  };

  // Helper to determine list status
  const getListStatus = (list: GroupedList) => {
    if (!list.requests || list.requests.length === 0) return "CREATED";
    const allProcessed = list.requests.every(
      (r) => r.status === "APPROVED" || r.status === "REJECTED"
    );
    return allProcessed ? "PROCESSED" : "CREATED";
  };

  // Filter controls
  const [filterMode, setFilterMode] = useState<"all" | "custom">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // List data
  const [allGroupedLists, setAllGroupedLists] = useState<GroupedList[]>([]);
  const [filteredLists, setFilteredLists] = useState<GroupedList[]>([]);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [hasRetrieved, setHasRetrieved] = useState(false);

  // Selected list + retrieved requests
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [retrievedRequests, setRetrievedRequests] = useState<RequestRow[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [hasRetrievedRequests, setHasRetrievedRequests] = useState(false);

  // Per-request decisions: map of requestId -> { decision, rejectReason }
  const [decisions, setDecisions] = useState<Record<string, { decision: Decision; rejectReason: string }>>({});

  // Proceed / confirmation popup
  const [showProceedModal, setShowProceedModal] = useState(false);
  const [proceedComment, setProceedComment] = useState("");
  const [actualBoardMeetingId, setActualBoardMeetingId] = useState<string>("");
  const [boardMeetingOptions, setBoardMeetingOptions] = useState<BoardMeetingOption[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  // Delete list state
  const canDelete = true; // TODO: wire to user role/privilege check
  const [pendingDeleteMeetingId, setPendingDeleteMeetingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Fetch board meetings for the actual-date dropdown ────────────────────
  useEffect(() => {
    fetch("http://localhost:8080/api/board-meetings/getAllBoardMeetings")
      .then((r) => r.json())
      .then((data: BoardMeetingOption[]) => setBoardMeetingOptions(data))
      .catch(() => { });
  }, []);

  // ── Fetch all approval lists from backend ────────────────────────────────
  const retrieveLists = async () => {
    try {
      setIsRetrieving(true);
      setHasRetrieved(false);
      setSelectedMeetingId(null);
      setRetrievedRequests([]);
      setHasRetrievedRequests(false);
      setDecisions({});

      const res = await fetch("http://localhost:8080/api/university-scholarships");
      if (!res.ok) throw new Error("Failed to fetch scholarship requests");
      const data: RequestRow[] = await res.json();

      // Collect all requests that have ever been attached to a board meeting
      const attached = data.filter((r) => r.boardMeetingId);

      // Build groups keyed by boardMeetingId, tracking list type per group
      const groups: Record<number, GroupedList & { listType: "normal" | "deviation" }> = {};
      attached.forEach((req) => {
        const mid = req.boardMeetingId!;
        if (!groups[mid]) {
          groups[mid] = {
            boardMeetingId: mid,
            boardMeetingName: req.boardMeetingName || `Meeting #${mid}`,
            boardMeetingDate: req.boardMeetingDate,
            requests: [],
            listType: "normal", // default; will be overridden below
          };
        }
        groups[mid].requests.push(req);
      });

      // Determine listType for each group from the most specific status available
      Object.values(groups).forEach((g) => {
        const hasDeviation = g.requests.some(
          (r) =>
            r.status === "ADDED_TO_DEVIATION_BOARD_APPROVAL_LIST" ||
            r.status === "Added to Deviation Board Approval List"
        );
        const hasNormal = g.requests.some(
          (r) =>
            r.status === "ADDED_TO_NORMAL_BOARD_APPROVAL_LIST" ||
            r.status === "Added to Normal Approval List"
        );
        if (hasDeviation) g.listType = "deviation";
        else if (hasNormal) g.listType = "normal";
        // If all are APPROVED/REJECTED, keep listType as normal (safe default)
      });

      // Filter by active tab
      const groupArr = Object.values(groups).filter((g) => g.listType === activeTab);
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
      setFilteredLists(lists);
      return;
    }
    const from = startDate ? new Date(startDate) : null;
    const to = endDate ? new Date(endDate) : null;
    setFilteredLists(
      lists.filter((g) => {
        if (!g.boardMeetingDate) return false;
        const d = new Date(g.boardMeetingDate);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
    );
  };

  // ── Retrieve requests for selected list ──────────────────────────────────
  const retrieveRequestsForList = async () => {
    if (selectedMeetingId === null) return;
    const group = filteredLists.find((g) => g.boardMeetingId === selectedMeetingId);
    if (!group) return;

    setIsLoadingRequests(true);
    setHasRetrievedRequests(false);
    setDecisions({});

    await new Promise((r) => setTimeout(r, 400));

    setRetrievedRequests(group.requests);
    setHasRetrievedRequests(true);
    setIsLoadingRequests(false);

    // Default all to "approve"
    const initial: Record<string, { decision: Decision; rejectReason: string }> = {};
    group.requests.forEach((req) => {
      const key = req.requestId || String(req.id);
      initial[key] = { decision: "approve", rejectReason: "" };
    });
    setDecisions(initial);

    // Pre-select actual board meeting date = scheduled date
    const match = boardMeetingOptions.find(
      (bm) => bm.scheduledDate === group.boardMeetingDate
    );
    setActualBoardMeetingId(match ? String(match.id) : "");
  };

  // ── Decision helpers ──────────────────────────────────────────────────────
  const setDecision = (key: string, decision: Decision) => {
    setDecisions((prev) => ({
      ...prev,
      [key]: { ...prev[key], decision, rejectReason: decision === "approve" ? "" : prev[key]?.rejectReason ?? "" },
    }));
  };

  const setRejectReason = (key: string, reason: string) => {
    setDecisions((prev) => ({
      ...prev,
      [key]: { ...prev[key], rejectReason: reason },
    }));
  };

  const rejectedRequests = retrievedRequests.filter(
    (r) => decisions[r.requestId || String(r.id)]?.decision === "reject"
  );
  const approvedRequests = retrievedRequests.filter(
    (r) => decisions[r.requestId || String(r.id)]?.decision !== "reject"
  );

  // Validate: all rejected items must have a reason
  const allRejectedHaveReasons = rejectedRequests.every(
    (r) => (decisions[r.requestId || String(r.id)]?.rejectReason ?? "").trim().length > 0
  );

  // ── Open Proceed modal ────────────────────────────────────────────────────
  const openProceedModal = () => {
    if (!allRejectedHaveReasons) return;
    setProcessError(null);
    setProceedComment("");
    setUploadedFile(null);
    setShowProceedModal(true);
  };

  // ── Process (submit) all decisions ───────────────────────────────────────
  const processDecisions = async () => {
    setIsProcessing(true);
    setProcessError(null);
    try {
      for (const req of retrievedRequests) {
        const key = req.requestId || String(req.id);
        const dec = decisions[key];
        if (!dec) continue;

        if (dec.decision === "approve") {
          const res = await fetch(
            `http://localhost:8080/api/university-scholarships/approve/${key}`,
            { method: "POST" }
          );
          if (!res.ok) throw new Error(`Approval failed for ${key}`);
        } else {
          const res = await fetch(
            `http://localhost:8080/api/university-scholarships/reject/${key}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ decisionReason: dec.rejectReason }),
            }
          );
          if (!res.ok) throw new Error(`Rejection failed for ${key}`);
        }
      }

      // Update local state to reflect new statuses
      setRetrievedRequests((prev) =>
        prev.map((r) => {
          const key = r.requestId || String(r.id);
          const dec = decisions[key];
          return dec
            ? { ...r, status: dec.decision === "approve" ? "APPROVED" : "REJECTED" }
            : r;
        })
      );
      setShowProceedModal(false);
    } catch (err: any) {
      setProcessError(err.message ?? "An error occurred while processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Delete approval list ──────────────────────────────────────────────────
  const deleteApprovalList = async (meetingId: number) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const endpoint = activeTab === "deviation"
        ? `http://localhost:8080/api/university-scholarships/deviation-approval-list/${meetingId}`
        : `http://localhost:8080/api/university-scholarships/approval-list/${meetingId}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to delete the approval list");
      }
      setFilteredLists((prev) => prev.filter((g) => g.boardMeetingId !== meetingId));
      setAllGroupedLists((prev) => prev.filter((g) => g.boardMeetingId !== meetingId));
      if (selectedMeetingId === meetingId) {
        setSelectedMeetingId(null);
        setRetrievedRequests([]);
        setHasRetrievedRequests(false);
        setDecisions({});
      }
      setPendingDeleteMeetingId(null);
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
    const map: Record<string, string> = {
      APPROVED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700",
      ADDED_TO_NORMAL_BOARD_APPROVAL_LIST: "bg-blue-100 text-blue-700",
      "Added to Normal Approval List": "bg-blue-100 text-blue-700",
    };
    const cls = map[status] ?? "bg-gray-100 text-gray-600";
    const label =
      status === "ADDED_TO_NORMAL_BOARD_APPROVAL_LIST" ? "In Approval List" : status;
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
        {label}
      </span>
    );
  };

  // ── Selected list info for the modal ─────────────────────────────────────
  const selectedGroup = filteredLists.find((g) => g.boardMeetingId === selectedMeetingId);

  // ─────────────────────────────────────────────────────────────────────────
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
              ? "bg-white text-[#7c3aed] shadow-sm"
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
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]/40 text-gray-700 shadow-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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
                  const isSelected = selectedMeetingId === list.boardMeetingId;
                  const status = getListStatus(list);

                  return (
                    <div
                      key={list.boardMeetingId}
                      onClick={() => {
                        setSelectedMeetingId(isSelected ? null : list.boardMeetingId);
                        setHasRetrievedRequests(false);
                        setRetrievedRequests([]);
                        setDecisions({});
                      }}
                      className={`flex justify-between items-center p-3 rounded-lg border transition-all cursor-pointer ${isSelected
                        ? "bg-gray-100 border-transparent"
                        : "bg-white border-gray-100 hover:bg-gray-50/80"
                        }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800">
                          {list.boardMeetingName}
                        </span>
                        <span className="text-[11px] text-gray-400 font-medium mt-0.5">
                          {list.boardMeetingId}
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
              disabled={selectedMeetingId === null || isLoadingRequests}
              className="bg-[#8b3007] hover:bg-[#702604] disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold py-2.5 px-4 rounded-lg w-full transition-all duration-200 text-center text-sm shadow-sm flex items-center justify-center gap-2"
            >
              {isLoadingRequests ? "Retrieving..." : "Retrieve Applications"}
            </Button>
          </div>
        </Card>

        {/* Right Column: Applications Details (col-span-8) */}
        <Card className="lg:col-span-8 rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-[480px]">
          {/* Card Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-[#953002] text-lg font-bold">Applications</h2>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Click &apos;Retrieve Applications&apos; to view data</p>
            </div>

            {hasRetrievedRequests && retrievedRequests.length > 0 && (
              <div className="flex items-center gap-2">
                {canDelete && selectedMeetingId !== null && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium"
                    onClick={() => {
                      setDeleteError(null);
                      setPendingDeleteMeetingId(selectedMeetingId);
                    }}
                  >
                    <Trash2 size={13} />
                    Delete List
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-[#953002] text-[#953002] hover:bg-[#fff6f2] text-xs font-medium"
                  onClick={printRequests}
                >
                  <Printer size={13} />
                  Print List
                </Button>
              </div>
            )}
          </div>

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
              {/* Validation warning */}
              {rejectedRequests.some(
                (r) => !(decisions[r.requestId || String(r.id)]?.rejectReason ?? "").trim()
              ) && (
                  <div className="mb-4 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    Please enter a rejection reason for all requests marked as &quot;Reject&quot; before proceeding.
                  </div>
                )}

              <div className="border border-gray-100 rounded-lg overflow-hidden flex-1 shadow-sm">
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
                      <TableHead className="font-semibold text-xs text-gray-600">Rejection Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retrievedRequests.map((req) => {
                      const key = req.requestId || String(req.id);
                      const dec = decisions[key] ?? { decision: "approve" as Decision, rejectReason: "" };
                      const isRejected = dec.decision === "reject";
                      const isProcessed =
                        req.status === "APPROVED" || req.status === "REJECTED";

                      return (
                        <TableRow
                          key={req.id}
                          className={`text-xs border-t transition-colors ${isRejected ? "bg-red-50/40" : "hover:bg-gray-50/60"
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

                          {/* Decision dropdown */}
                          <TableCell className="p-3">
                            {isProcessed ? (
                              statusBadge(req.status)
                            ) : (
                              <select
                                value={dec.decision}
                                onChange={(e) => setDecision(key, e.target.value as Decision)}
                                className={`border rounded px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 transition-colors ${isRejected
                                  ? "border-red-300 text-red-700 bg-red-50 focus:ring-red-300"
                                  : "border-green-300 text-green-700 bg-green-50 focus:ring-green-300"
                                  }`}
                              >
                                <option value="approve">✓ Approve</option>
                                <option value="reject">✗ Reject</option>
                              </select>
                            )}
                          </TableCell>

                          {/* Rejection reason — mandatory when reject selected */}
                          <TableCell className="p-3">
                            {!isProcessed && isRejected ? (
                              <div className="flex flex-col gap-1">
                                <input
                                  type="text"
                                  placeholder="Enter rejection reason (required)"
                                  value={dec.rejectReason}
                                  onChange={(e) => setRejectReason(key, e.target.value)}
                                  className={`border rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 ${!dec.rejectReason.trim()
                                    ? "border-red-400 focus:ring-red-300 bg-red-50"
                                    : "border-gray-300 focus:ring-gray-300"
                                    }`}
                                />
                                {!dec.rejectReason.trim() && (
                                  <span className="text-[10px] text-red-500">This field is required</span>
                                )}
                              </div>
                            ) : isProcessed ? (
                              <span className="text-gray-400 italic text-[10px]">—</span>
                            ) : (
                              <span className="text-gray-400 italic text-[10px]">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Proceed button */}
              {retrievedRequests.some((r) => r.status !== "APPROVED" && r.status !== "REJECTED") && (
                <div className="mt-4 flex justify-end">
                  <Button
                    className="bg-[#953002] hover:bg-[#7a2700] text-white gap-2"
                    disabled={!allRejectedHaveReasons}
                    onClick={openProceedModal}
                    title={!allRejectedHaveReasons ? "Enter rejection reasons for all rejected requests first" : ""}
                  >
                    Proceed
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>


      {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────────── */}
      {pendingDeleteMeetingId !== null && (
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
                  <span className="font-semibold">University Scholarship Normal Approval List</span>?
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  All scholarship requests attached to this list will be rolled back to{" "}
                  <span className="font-medium text-gray-700">&quot;Submitted for Normal Board Approval&quot;</span>{" "}
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
                  setPendingDeleteMeetingId(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white gap-2"
                onClick={() => deleteApprovalList(pendingDeleteMeetingId!)}
                disabled={isDeleting}
              >
                <Trash2 size={14} />
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </Button>
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

