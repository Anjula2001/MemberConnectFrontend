"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { ArrowLeft, FileText, Printer, Search, Trash2, Upload, X, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

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

export default function ApprovalsPage() {
  const router = useRouter();

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
      .catch(() => {});
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

      const attached = data.filter(
        (r) =>
          r.boardMeetingId &&
          (r.status === "ADDED_TO_NORMAL_BOARD_APPROVAL_LIST" ||
            r.status === "Added to Normal Approval List")
      );

      const groups: Record<number, GroupedList> = {};
      attached.forEach((req) => {
        const mid = req.boardMeetingId!;
        if (!groups[mid]) {
          groups[mid] = {
            boardMeetingId: mid,
            boardMeetingName: req.boardMeetingName || `Meeting #${mid}`,
            boardMeetingDate: req.boardMeetingDate,
            requests: [],
          };
        }
        groups[mid].requests.push(req);
      });

      const groupArr = Object.values(groups);
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
      const res = await fetch(
        `http://localhost:8080/api/university-scholarships/approval-list/${meetingId}`,
        { method: "DELETE" }
      );
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
          University Scholarship Normal Approval Lists
        </h1>
      </div>

      {/* ── FILTER SECTION ──────────────────────────────────────────────── */}
      <Card className="rounded-xl shadow-sm mb-6 py-0">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base text-[#953002]">Filter Approval Lists</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Show</label>
              <select
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]/40"
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as "all" | "custom")}
              >
                <option value="all">All</option>
                <option value="custom">Select Board Meeting Date Period</option>
              </select>
            </div>

            {filterMode === "custom" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]/40"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]/40"
                  />
                </div>
              </>
            )}

            <Button
              onClick={retrieveLists}
              disabled={isRetrieving}
              className="bg-[#953002] hover:bg-[#7a2700] text-white gap-2"
            >
              <Search size={15} />
              {isRetrieving ? "Retrieving..." : "Retrieve"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── APPROVAL LISTS TABLE ────────────────────────────────────────── */}
      {hasRetrieved && (
        <Card className="rounded-xl shadow-sm mb-6 py-0">
          <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-[#953002]">
              University Scholarship Normal Approval Lists
              {filteredLists.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  ({filteredLists.length} list{filteredLists.length !== 1 ? "s" : ""})
                </span>
              )}
            </CardTitle>

            <div className="flex items-center gap-2">
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 text-sm"
                  disabled={selectedMeetingId === null}
                  onClick={() => {
                    setDeleteError(null);
                    setPendingDeleteMeetingId(selectedMeetingId);
                  }}
                >
                  <Trash2 size={14} />
                  Delete List
                </Button>
              )}
              <Button
                onClick={retrieveRequestsForList}
                disabled={selectedMeetingId === null || isLoadingRequests}
                className="bg-[#953002] hover:bg-[#7a2700] text-white gap-2 text-sm"
              >
                <FileText size={14} />
                {isLoadingRequests ? "Retrieving..." : "Retrieve University Scholarship Requests"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            {filteredLists.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                No University Scholarship Normal Approval Lists found.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="font-semibold text-gray-700">List / Meeting ID</TableHead>
                      <TableHead className="font-semibold text-gray-700">Board Meeting Name</TableHead>
                      <TableHead className="font-semibold text-gray-700">Scheduled Date</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">No. of Requests</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLists.map((list) => {
                      const isSelected = selectedMeetingId === list.boardMeetingId;
                      return (
                        <TableRow
                          key={list.boardMeetingId}
                          className={`cursor-pointer border-t transition-colors ${
                            isSelected
                              ? "bg-[#fff6f2] border-l-4 border-l-[#953002]"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            setSelectedMeetingId(isSelected ? null : list.boardMeetingId);
                            setHasRetrievedRequests(false);
                            setRetrievedRequests([]);
                            setDecisions({});
                          }}
                        >
                          <TableCell className="p-4 text-center">
                            <div
                              className={`w-4 h-4 rounded-full border-2 mx-auto transition-colors ${
                                isSelected ? "bg-[#953002] border-[#953002]" : "border-gray-400"
                              }`}
                            />
                          </TableCell>
                          <TableCell className="p-4 font-medium text-gray-800">
                            #{list.boardMeetingId}
                          </TableCell>
                          <TableCell className="p-4 text-gray-700">{list.boardMeetingName}</TableCell>
                          <TableCell className="p-4 text-gray-600">
                            {list.boardMeetingDate || "—"}
                          </TableCell>
                          <TableCell className="p-4 text-center font-semibold text-gray-800">
                            {list.requests.length}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── REQUESTS TABLE WITH INLINE APPROVE/REJECT ───────────────────── */}
      {hasRetrievedRequests && (
        <Card className="rounded-xl shadow-sm py-0 print:shadow-none mb-6">
          <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between print:hidden">
            <CardTitle className="text-base text-[#953002] flex items-center gap-2">
              <FileText size={16} />
              Scholarship Requests in Selected Approval List
              <span className="text-xs font-normal text-gray-500">
                ({retrievedRequests.length} record{retrievedRequests.length !== 1 ? "s" : ""})
              </span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-[#953002] text-[#953002] hover:bg-[#fff6f2]"
              onClick={printRequests}
            >
              <Printer size={14} />
              Print List
            </Button>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            {retrievedRequests.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
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

                <div className="border rounded-lg overflow-hidden">
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
                            className={`text-xs border-t transition-colors ${
                              isRejected ? "bg-red-50/40" : "hover:bg-gray-50/60"
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
                                  className={`border rounded px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 transition-colors ${
                                    isRejected
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
                                    className={`border rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 ${
                                      !dec.rejectReason.trim()
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
          </CardContent>
        </Card>
      )}

      {/* ── PROCEED CONFIRMATION MODAL ───────────────────────────────────── */}
      {showProceedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">Confirm Approval Process</h2>
              <button
                onClick={() => setShowProceedModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Board meeting dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">Board Meeting Date (Scheduled)</label>
                  <div className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-700">
                    {selectedGroup?.boardMeetingDate || "—"}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">
                    Actual Board Meeting Date
                    <span className="text-gray-400 font-normal ml-1">(select from records)</span>
                  </label>
                  <select
                    value={actualBoardMeetingId}
                    onChange={(e) => setActualBoardMeetingId(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]/40"
                  >
                    <option value="">— Select Actual Date —</option>
                    {boardMeetingOptions.map((bm) => (
                      <option key={bm.id} value={String(bm.id)}>
                        {bm.boardMeetingId} — {bm.scheduledDate}
                        {bm.actualDate ? ` (Actual: ${bm.actualDate})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl border bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Request Summary</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold text-gray-800">{retrievedRequests.length}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Total Requests</div>
                  </div>
                  <div className="bg-green-50 rounded-lg border border-green-200 p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{approvedRequests.length}</div>
                    <div className="text-xs text-green-600 mt-0.5">To be Approved</div>
                  </div>
                  <div className="bg-red-50 rounded-lg border border-red-200 p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">{rejectedRequests.length}</div>
                    <div className="text-xs text-red-600 mt-0.5">To be Rejected</div>
                  </div>
                </div>
              </div>

              {/* Rejection reasons summary */}
              {rejectedRequests.length > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50/40 p-4">
                  <h3 className="text-sm font-semibold text-red-700 mb-2">Requests to be Rejected</h3>
                  <div className="space-y-2">
                    {rejectedRequests.map((req) => {
                      const key = req.requestId || String(req.id);
                      return (
                        <div key={key} className="text-xs text-gray-700">
                          <span className="font-semibold text-red-600">{req.requestId}</span>
                          {" — "}
                          <span className="text-gray-500">{req.studentName}</span>
                          <br />
                          <span className="italic text-gray-600">Reason: {decisions[key]?.rejectReason}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* File upload */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-600">
                  Upload Scanned Approval List Report
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-[#953002]/50 hover:bg-[#fff6f2]/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                      <FileText size={16} className="text-[#953002]" />
                      <span>{uploadedFile.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-400">
                      <Upload size={22} />
                      <span className="text-xs">Click to upload a scanned image (PNG, JPG, PDF)</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setUploadedFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* Comment */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">
                  Comment
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={proceedComment}
                  onChange={(e) => setProceedComment(e.target.value)}
                  placeholder="Add any additional comments..."
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]/40 resize-none"
                />
              </div>

              {/* Error */}
              {processError && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                  {processError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <Button
                variant="outline"
                onClick={() => setShowProceedModal(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#953002] hover:bg-[#7a2700] text-white gap-2"
                onClick={processDecisions}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Process"}
              </Button>
            </div>
          </div>
        </div>
      )}

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
