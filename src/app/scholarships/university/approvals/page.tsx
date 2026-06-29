"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { ArrowLeft, Printer, Search, Trash2, ChevronDown, File } from "lucide-react";

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
  scheduledDate?: string;
};

type GroupedList = {
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
  const [dateError, setDateError] = useState("");

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

  // Delete list state
  const canDelete = true; // TODO: wire to user role/privilege check
  const [pendingDeleteMeetingId, setPendingDeleteMeetingId] = useState<number | null>(null);
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

  const getRelevantApprovalStatuses = (tab: "normal" | "deviation") => {
    return tab === "deviation"
      ? ["addedtoscholarshipdeviationapprovallist"]
      : ["addedtoscholarshipnormalapprovallist"];
  };

  const getRelevantRequests = (requests: RequestRow[], tab: "normal" | "deviation") => {
    const allowedStatuses = new Set(getRelevantApprovalStatuses(tab));
    return requests.filter((request) => allowedStatuses.has(normalizeScholarshipStatus(request.status)));
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
      setSelectedMeetingId(null);
      setRetrievedRequests([]);
      setHasRetrievedRequests(false);

      const res = await fetch("http://localhost:8080/api/university-scholarships");
      if (!res.ok) throw new Error("Failed to fetch scholarship requests");
      const data: RequestRow[] = await res.json();

      // Collect all requests that have ever been attached to a board meeting
      const attached = data.filter((r) => r.boardMeetingId);

      // Build groups keyed by boardMeetingId
      const groups: Record<number, GroupedList> = {};
      attached.forEach((req) => {
        const mid = req.boardMeetingId!;
        if (!groups[mid]) {
          groups[mid] = {
            boardMeetingId: mid,
            boardMeetingName: req.boardMeetingName || `Meeting #${mid}`,
            scheduledDate: req.scheduledDate,
            requests: [],
          };
        }
        groups[mid].requests.push(req);
      });

      // Keep only the requests relevant to the active tab, but allow the same
      // board meeting to appear in both tabs if it contains both request types.
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
    if (selectedMeetingId === null) return;
    const group = filteredLists.find((g) => g.boardMeetingId === selectedMeetingId);
    if (!group) return;

    setIsLoadingRequests(true);
    setHasRetrievedRequests(false);

    await new Promise((r) => setTimeout(r, 400));

    setRetrievedRequests(getRelevantRequests(group.requests, activeTab));
    setHasRetrievedRequests(true);
    setIsLoadingRequests(false);
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
                  const isSelected = selectedMeetingId === list.boardMeetingId;
                  const status = getListStatus(list);

                  return (
                    <div
                      key={list.boardMeetingId}
                      onClick={() => {
                        setSelectedMeetingId(isSelected ? null : list.boardMeetingId);
                        setHasRetrievedRequests(false);
                        setRetrievedRequests([]);
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retrievedRequests.map((req) => {
                      const key = req.requestId || String(req.id);
                      return (
                        <TableRow
                          key={req.id}
                          className="text-xs border-t transition-colors hover:bg-gray-50/60"
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
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
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

