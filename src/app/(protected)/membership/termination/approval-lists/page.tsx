"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CircleDollarSign,
  FileText,
  Printer,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { StatusBadge } from "@/src/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import {
  TablePagination,
  clampPage,
  pageSlice,
} from "@/src/components/ui/table-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  deleteTerminationApprovalList,
  getTerminationApprovalListRequests,
  getTerminationApprovalLists,
  processTerminationApprovalList,
  type TerminationApprovalListDTO,
  type TerminationRequestDecision,
} from "@/lib/api/terminationApprovalLists";
import { type TerminationRequestResponse } from "@/lib/api/terminationRequests";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { DELETE_RIGHTS_ROLES, TERMINATION_BOARD_ROLES, hasRole } from "@/lib/permissions";

type RequestDecision = "Approve" | "Reject";

type ApprovalRequestRow = {
  id: number;
  requestNo: string;
  memberId: string;
  memberName: string;
  status: string;
  hasLoanBalance: boolean;
  hasIndirectObligations: boolean;
  rejectReason?: string;
};

/** MMT10 shows date *and* time, so this keeps the clock component. */
function formatProcessedAt(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function formatDisplayDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${year}-${month}-${day}`;
}

export default function TerminationApprovalListsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const initialListId = searchParams.get("listId") ?? "";

  const [dateFilter, setDateFilter] = useState("all");
  // Bounds for the "Date Period" option. An empty side is open-ended, so a From
  // with no To reads as "everything since that day", and a To with no From as
  // "everything up to it".
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [approvalLists, setApprovalLists] = useState<TerminationApprovalListDTO[]>([]);
  const [selectedApprovalListId, setSelectedApprovalListId] = useState(initialListId);
  const [requestsRetrieved, setRequestsRetrieved] = useState(false);
  const [selectedListRequests, setSelectedListRequests] = useState<ApprovalRequestRow[]>([]);
  const [requestDecisions, setRequestDecisions] = useState<
    Record<number, { decision: RequestDecision; rejectReason: string }>
  >({});
  const [boardRemarks, setBoardRemarks] = useState("");
  // MMT09: the meeting may have been postponed, so the date actually sat is
  // captured separately from the date it was scheduled for.
  const [actualMeetingDate, setActualMeetingDate] = useState("");
  const [approvalSheetFile, setApprovalSheetFile] = useState<File | null>(null);
  const [isRetrievingLists, setIsRetrievingLists] = useState(false);
  const [isRetrievingRequests, setIsRetrievingRequests] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const todayDate = new Date().toISOString().split("T")[0];

  const selectedApprovalList = useMemo(
    () => approvalLists.find((item) => item.listId === selectedApprovalListId) ?? null,
    [approvalLists, selectedApprovalListId]
  );

  const isSelectedListProcessed = selectedApprovalList?.status === "PROCESSED";

  const filteredApprovalLists = useMemo(() => {
    if (dateFilter === "all") return approvalLists;

    const now = new Date();
    return approvalLists.filter((item) => {
      const itemDate = new Date(item.createdAt ?? item.boardMeetingDate ?? "");
      if (dateFilter === "thisMonth") {
        return (
          itemDate.getFullYear() === now.getFullYear() &&
          itemDate.getMonth() === now.getMonth()
        );
      }

      if (dateFilter === "lastMonth") {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return (
          itemDate.getFullYear() === lastMonthDate.getFullYear() &&
          itemDate.getMonth() === lastMonthDate.getMonth()
        );
      }

      if (dateFilter === "datePeriod") {
        // Filter on the board meeting date - that is the date shown against each
        // row, and the one an operator has in mind when they type a period.
        // createdAt is when the list was drawn up, usually weeks before the meeting
        // it is for, so keying off it silently hides meetings that sit inside the
        // chosen window. createdAt is only a fallback for a list with no meeting
        // date yet. Both are cut back to YYYY-MM-DD so each bound stays inclusive
        // and no timezone shift can move a record into the neighbouring day.
        const meetingDay = (item.boardMeetingDate ?? item.createdAt ?? "").slice(0, 10);
        if (!meetingDay) return false;
        if (fromDate && meetingDay < fromDate) return false;
        if (toDate && meetingDay > toDate) return false;
        return true;
      }

      return true;
    });
  }, [approvalLists, dateFilter, fromDate, toDate]);

  const [listPage, setListPage] = useState(1);

  // Narrowing the filter, or retrieving a fresh set, can leave the stored page
  // beyond the end of the new result - page 3 of a list that now has four rows
  // renders as empty rather than as "no matches". Going back to the first page
  // whenever the criteria change is what keeps the panel showing the top of the
  // result the user just asked for.
  useEffect(() => {
    setListPage(1);
  }, [approvalLists, dateFilter, fromDate, toDate]);

  const safeListPage = clampPage(listPage, filteredApprovalLists.length);
  const pagedApprovalLists = useMemo(
    () => pageSlice(filteredApprovalLists, listPage),
    [filteredApprovalLists, listPage]
  );

  const mapRequestToRow = (request: TerminationRequestResponse): ApprovalRequestRow => ({
    id: request.id ?? 0,
    requestNo: request.requestNo ?? "-",
    memberId: request.memberId ?? "-",
    memberName: request.memberFullName ?? request.nameWithInitials ?? "-",
    status: request.status ?? "ADDED_TO_APPROVAL_LIST",
    hasLoanBalance: request.hasLoanBalance ?? false,
    hasIndirectObligations: request.hasIndirectObligations ?? false,
    rejectReason: request.rejectReason,
  });

  useEffect(() => {
    if (!showToast) return;
    const timeoutId = window.setTimeout(() => setShowToast(false), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [showToast]);

  useEffect(() => {
    if (!initialListId) return;

    const loadInitialList = async () => {
      try {
        setIsRetrievingLists(true);
        const lists = await getTerminationApprovalLists();
        setApprovalLists(lists);
        setSelectedApprovalListId(initialListId);

        const requests = await getTerminationApprovalListRequests(initialListId);
        setSelectedListRequests(requests.map(mapRequestToRow));

        const initialDecisions: Record<
          number,
          { decision: RequestDecision; rejectReason: string }
        > = {};
        requests.forEach((request) => {
          const id = request.id ?? 0;
          initialDecisions[id] = {
            decision: request.status === "REJECTED" ? "Reject" : "Approve",
            rejectReason: request.rejectReason ?? "",
          };
        });
        setRequestDecisions(initialDecisions);
        setRequestsRetrieved(true);
      } catch (error) {
        console.error("Error loading initial termination approval list:", error);
        setToastMessage("Failed to load termination approval list");
        setShowToast(true);
      } finally {
        setIsRetrievingLists(false);
      }
    };

    void loadInitialList();
  }, [initialListId]);

  const handleRetrieveLists = async () => {
    try {
      setIsRetrievingLists(true);
      const lists = await getTerminationApprovalLists();
      setApprovalLists(lists);
      setSelectedApprovalListId("");
      setRequestsRetrieved(false);
      setSelectedListRequests([]);
    } catch (error) {
      console.error("Error retrieving termination approval lists:", error);
      setToastMessage("Failed to retrieve termination approval lists");
      setShowToast(true);
    } finally {
      setIsRetrievingLists(false);
    }
  };

  const loadRequestsForList = async (listId: string) => {
    const requests = await getTerminationApprovalListRequests(listId);
    setSelectedListRequests(requests.map(mapRequestToRow));

    const initialDecisions: Record<number, { decision: RequestDecision; rejectReason: string }> =
      {};
    requests.forEach((request) => {
      const id = request.id ?? 0;
      initialDecisions[id] = {
        decision: request.status === "REJECTED" ? "Reject" : "Approve",
        rejectReason: request.rejectReason ?? "",
      };
    });
    setRequestDecisions(initialDecisions);
    setBoardRemarks(selectedApprovalList?.boardRemarks ?? "");
    setActualMeetingDate(
      selectedApprovalList?.actualMeetingDate ??
        selectedApprovalList?.boardMeetingDate ??
        todayDate
    );
    setApprovalSheetFile(null);
    setRequestsRetrieved(true);
  };

  const handleRetrieveRequests = async () => {
    if (!selectedApprovalListId) return;

    try {
      setIsRetrievingRequests(true);
      await loadRequestsForList(selectedApprovalListId);
    } catch (error) {
      console.error("Error retrieving termination requests:", error);
      setToastMessage("Failed to retrieve requests for this list");
      setShowToast(true);
    } finally {
      setIsRetrievingRequests(false);
    }
  };

  const handleConfirmDeleteList = async () => {
    if (!selectedApprovalListId) return;

    try {
      setIsDeleting(true);
      await deleteTerminationApprovalList(selectedApprovalListId);
      setApprovalLists((prev) =>
        prev.filter((item) => item.listId !== selectedApprovalListId)
      );
      setSelectedApprovalListId("");
      setRequestsRetrieved(false);
      setSelectedListRequests([]);
      setShowDeleteModal(false);
      setToastMessage("Termination approval list deleted successfully");
      setShowToast(true);
    } catch (error) {
      console.error("Error deleting termination approval list:", error);
      setToastMessage("Failed to delete termination approval list");
      setShowToast(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProcessBoardDecision = async () => {
    if (!selectedApprovalListId || !selectedApprovalList) return;

    try {
      setIsProcessing(true);

      // One call, one transaction. The server validates every decision before it
      // writes anything and applies them together, so the list can no longer end
      // up marked processed while some members were never updated.
      const decisions: TerminationRequestDecision[] = selectedListRequests.map(
        (request) => {
          const decisionState = requestDecisions[request.id];
          const decision: RequestDecision = decisionState?.decision ?? "Approve";

          return {
            requestNo: request.requestNo,
            decision,
            rejectReason:
              decision === "Reject" ? decisionState?.rejectReason?.trim() : undefined,
          };
        }
      );

      // The scanned, board-signed sheet. A failed upload must not lose the
      // meeting, so the filename is stored as a fallback reference.
      let approvedListDocument: string | undefined;
      if (approvalSheetFile) {
        try {
          const formData = new FormData();
          formData.append("file", approvalSheetFile);
          const { data } = await apiClient.post<string>("/api/file/upload", formData);
          approvedListDocument = data;
        } catch (uploadError) {
          console.warn("Approval sheet upload failed, storing filename:", uploadError);
          approvedListDocument = approvalSheetFile.name;
        }
      }

      await processTerminationApprovalList(selectedApprovalListId, {
        actualMeetingDate: actualMeetingDate || todayDate,
        requestDecisions: decisions,
        boardRemarks,
        approvedListDocument,
      });

      setApprovalLists((prev) =>
        prev.map((item) =>
          item.listId === selectedApprovalListId
            ? { ...item, status: "PROCESSED", boardRemarks }
            : item
        )
      );

      setSelectedListRequests((prev) =>
        prev.map((request) => {
          const decision = requestDecisions[request.id]?.decision ?? "Approve";
          return {
            ...request,
            status: decision === "Approve" ? "APPROVED" : "REJECTED",
            rejectReason:
              decision === "Reject"
                ? requestDecisions[request.id]?.rejectReason
                : request.rejectReason,
          };
        })
      );

      setShowConfirmModal(false);
      setToastMessage("Termination approval list processed successfully");
      setShowToast(true);
    } catch (error) {
      console.error("Error processing termination approval list:", error);
      // The server validates the whole list before writing anything and says
      // exactly which request was at fault ("A rejection reason is required for
      // T-2026-004"). apiClient already unwraps that into Error.message, so show
      // it rather than a generic failure the user cannot act on.
      setToastMessage(
        error instanceof Error && error.message
          ? error.message
          : "Failed to process termination approval list"
      );
      setShowToast(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const approvedCount = selectedListRequests.filter(
    (request) => (requestDecisions[request.id]?.decision ?? "Approve") === "Approve"
  ).length;
  const rejectedCount = selectedListRequests.length - approvedCount;

  // Server-side @PreAuthorize is the real gate; this keeps a role that cannot
  // use the screen from being shown a page of failing requests.
  if (user && !hasRole(user.role, TERMINATION_BOARD_ROLES)) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-800">Access Restricted</h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500">
          Termination Approval Lists are restricted to Head Office and Board Secretariat personnel.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-col gap-4 px-10 pt-0">
      <Link
        href="/membership/termination"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-[#9d3602]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Termination Requests
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#953002]">Termination Approval Lists</h1>
      </div>

      <Card className="rounded-xl py-0 shadow-sm">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base font-bold text-[#953002]">
            Search Approval Lists
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex w-full flex-col gap-1 md:max-w-md">
            <label className="text-xs font-medium text-gray-600">Date Filter</label>
            <div className="flex items-center gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="datePeriod">Date Period</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                className="bg-[#953002] text-white hover:bg-[#7a2700]"
                onClick={() => handleRetrieveLists()}
                disabled={isRetrievingLists}
              >
                <Search size={14} />
                {isRetrievingLists ? "Retrieving..." : "Retrieve"}
              </Button>
            </div>
          </div>

          {dateFilter === "datePeriod" && (
            <div className="mt-3 max-w-md">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="termination-list-from-date"
                    className="text-xs font-medium text-gray-600"
                  >
                    From Date
                  </label>
                  <Input
                    id="termination-list-from-date"
                    type="date"
                    value={fromDate}
                    onChange={(event) => {
                      const nextFrom = event.target.value;
                      setFromDate(nextFrom);
                      // The To picker below only offers days from From onward, so a
                      // To carried over from an earlier range can be left outside
                      // what that picker can still reach. Clearing it here is what
                      // keeps the visible pair and the filtered result in agreement.
                      if (nextFrom && toDate && toDate < nextFrom) {
                        setToDate("");
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="termination-list-to-date"
                    className="text-xs font-medium text-gray-600"
                  >
                    To Date
                  </label>
                  <Input
                    id="termination-list-to-date"
                    type="date"
                    value={toDate}
                    // Greys out every day before From in the native picker, so the
                    // period can only ever run forwards from the day chosen there.
                    min={fromDate || undefined}
                    onChange={(event) => setToDate(event.target.value)}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Leave either side empty for an open-ended range.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="rounded-xl py-0 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-base font-bold text-[#953002]">Approval Lists</CardTitle>
            <p className="text-sm text-muted-foreground">Select a list to view details</p>
          </CardHeader>
          <CardContent className="px-0 pb-4">
            <div className="border-y text-sm">
              <div className="grid grid-cols-[1fr_auto] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <span>List ID</span>
                <span>Status</span>
              </div>

              {filteredApprovalLists.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No approval lists found.
                </div>
              ) : (
                pagedApprovalLists.map((item) => (
                  <button
                    key={item.listId ?? item.id}
                    type="button"
                    onClick={() => {
                      if (!item.listId) return;
                      setSelectedApprovalListId(item.listId);
                      setRequestsRetrieved(false);
                      setSelectedListRequests([]);
                      setRequestDecisions({});
                      setBoardRemarks("");
                    }}
                    className={`grid w-full grid-cols-[1fr_auto] items-center border-t px-5 py-3 text-left transition-colors first:border-t-0 hover:bg-[#f6f6f6] ${selectedApprovalListId === item.listId ? "bg-[#d9d9d9]" : ""
                      }`}
                  >
                    <div className="leading-tight">
                      <p className="text-sm font-medium text-gray-800">{item.listId ?? "-"}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.boardMeetingDate ?? "-"}
                        {item.boardMeetingId ? ` (${item.boardMeetingId})` : ""}
                      </p>
                    </div>
                    <span className="rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                      {item.status}
                    </span>
                  </button>
                ))
              )}
            </div>

            <TablePagination
              page={safeListPage}
              total={filteredApprovalLists.length}
              onPageChange={setListPage}
              itemLabel="list"
            />

            <div className="px-3 pt-3">
              <Button
                type="button"
                className="h-9 w-full bg-[#953002] text-white hover:bg-[#7a2700]"
                disabled={!selectedApprovalListId || isRetrievingRequests}
                onClick={handleRetrieveRequests}
              >
                {isRetrievingRequests ? "Retrieving..." : "Retrieve Requests"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* min-w-0 is what stops this card blowing past the viewport. A grid item
            defaults to min-width:auto, so without it the column refuses to shrink below
            the table's min-w-[680px] and the whole card grows instead of the table
            scrolling inside it — clipping Print, Delete List, the last column and
            Proceed. Same fix as the two scholarship approval-list screens. */}
        <Card className="min-w-0 rounded-xl py-0 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-base font-bold text-[#953002]">Termination Requests</CardTitle>
            <p className="text-sm text-muted-foreground">
              {requestsRetrieved && selectedApprovalListId
                ? `Showing ${selectedListRequests.length} request(s)`
                : "Click 'Retrieve Requests' to view data"}
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {!selectedApprovalListId || !requestsRetrieved ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center text-muted-foreground">
                <FileText size={36} className="text-gray-300" />
                <p>Select a list and click Retrieve Requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* MMT10: "The name of the user who processed the list along with
                    the date and time will be displayed." */}
                {isSelectedListProcessed && (
                  <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
                    <p className="font-semibold text-neutral-700">
                      This list has been processed and is read-only.
                    </p>
                    <dl className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2">
                      <div className="flex gap-2">
                        <dt className="text-neutral-500">Processed by</dt>
                        <dd className="text-neutral-900">
                          {selectedApprovalList?.processedBy || "—"}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-neutral-500">Processed on</dt>
                        <dd className="text-neutral-900">
                          {formatProcessedAt(selectedApprovalList?.processedAt)}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-neutral-500">Board decision</dt>
                        <dd className="text-neutral-900">
                          {selectedApprovalList?.decision || "—"}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-neutral-500">Actual meeting date</dt>
                        <dd className="text-neutral-900">
                          {formatDisplayDate(selectedApprovalList?.actualMeetingDate ?? "") || "—"}
                        </dd>
                      </div>
                    </dl>
                    {selectedApprovalList?.boardRemarks && (
                      <p className="mt-2 text-neutral-600">
                        Remarks: {selectedApprovalList.boardRemarks}
                      </p>
                    )}
                  </div>
                )}

                {/* Once processed there is no Print and no Process — the meeting
                    the sheet was printed for is over. */}
                {!isSelectedListProcessed && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-3"
                      onClick={() =>
                        router.push(
                          `/membership/termination/approval-lists/print/${encodeURIComponent(
                            selectedApprovalListId
                          )}`
                        )
                      }
                      disabled={!selectedApprovalListId}
                    >
                      <Printer size={14} />
                      Print
                    </Button>
                    {/* MMT07 calls delete a separate privilege, narrower than
                        ordinary Head Office access. */}
                    {hasRole(user?.role, DELETE_RIGHTS_ROLES) && (
                      <Button
                        type="button"
                        className="h-8 bg-rose-600 px-3 text-white hover:bg-rose-700"
                        onClick={() => setShowDeleteModal(true)}
                        disabled={!selectedApprovalListId}
                      >
                        <Trash2 size={14} />
                        Delete List
                      </Button>
                    )}
                  </div>
                )}

                <div className="w-full overflow-x-auto">
                  <Table className="min-w-[680px] border-collapse">
                    <TableHeader>
                      <TableRow className="bg-[#fafafa] hover:bg-[#fafafa]">
                        {["Request ID", "Member ID", "Name", "Indicators", "Decision", "Reason (If Reject)"].map(
                          (h) => (
                            <TableHead
                              key={h}
                              className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase"
                            >
                              {h}
                            </TableHead>
                          ),
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedListRequests.map((request) => (
                        <TableRow key={request.requestNo} className="align-top hover:bg-neutral-50">
                          <TableCell className="px-4 py-4 font-medium">
                            {request.requestNo}
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            <button
                              type="button"
                              className="font-medium text-[#953002] hover:underline"
                              onClick={() =>
                                router.push(
                                  `/membership/directory/termination-request?memberId=${encodeURIComponent(request.memberId)}&mode=view`
                                )
                              }
                            >
                              {request.memberId}
                            </button>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-neutral-700">
                            {request.memberName}
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {request.hasLoanBalance && (
                                <CircleDollarSign className="h-4 w-4 text-amber-600" />
                              )}
                              {request.hasIndirectObligations && (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            {isSelectedListProcessed ? (
                              <StatusBadge
                                status={request.status === "REJECTED" ? "REJECTED" : "APPROVED"}
                                vocabulary="request"
                              />
                            ) : (
                              <Select
                                value={requestDecisions[request.id]?.decision || "Approve"}
                                onValueChange={(value) =>
                                  setRequestDecisions((prev) => ({
                                    ...prev,
                                    [request.id]: {
                                      ...(prev[request.id] || { rejectReason: "" }),
                                      decision: value as RequestDecision,
                                    },
                                  }))
                                }
                              >
                                <SelectTrigger className="h-8 min-w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Approve">Approve</SelectItem>
                                  <SelectItem value="Reject">Reject</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            {isSelectedListProcessed ? (
                              <span
                                className={
                                  request.status === "REJECTED"
                                    ? "text-rose-600"
                                    : "text-neutral-500"
                                }
                              >
                                {request.status === "REJECTED"
                                  ? request.rejectReason || "Reject reason"
                                  : "-"}
                              </span>
                            ) : (
                              <Input
                                value={requestDecisions[request.id]?.rejectReason || ""}
                                onChange={(e) =>
                                  setRequestDecisions((prev) => ({
                                    ...prev,
                                    [request.id]: {
                                      ...(prev[request.id] || { decision: "Approve" }),
                                      rejectReason: e.target.value,
                                    },
                                  }))
                                }
                                disabled={requestDecisions[request.id]?.decision !== "Reject"}
                                placeholder="Reason required..."
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {!isSelectedListProcessed && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Board Remarks
                      </label>
                      <Input
                        value={boardRemarks}
                        onChange={(e) => setBoardRemarks(e.target.value)}
                        placeholder="Optional remarks"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        className="min-w-[106px] bg-[#953002] text-white hover:bg-[#7a2700]"
                        disabled={Object.values(requestDecisions).some(
                          (d) => d.decision === "Reject" && !d.rejectReason.trim()
                        )}
                        onClick={() => setShowConfirmModal(true)}
                      >
                        Proceed
                        <ArrowRight size={14} />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[520px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <h2 className="text-2xl font-semibold text-[#953002]">Confirm Board Decision</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowConfirmModal(false)}
              >
                <X size={18} />
              </Button>
            </div>
            <div className="space-y-3 px-5 pb-5 pt-1 text-sm text-gray-700">
              <p>
                You are about to process {selectedListRequests.length} termination request(s).
              </p>
              <p>Approved: {approvedCount}</p>
              <p>Rejected: {rejectedCount}</p>

              <div className="space-y-1 pt-2">
                <label
                  htmlFor="actual-meeting-date"
                  className="block text-xs font-semibold text-gray-600"
                >
                  Actual Board Meeting Date
                </label>
                <Input
                  id="actual-meeting-date"
                  type="date"
                  value={actualMeetingDate}
                  max={todayDate}
                  onChange={(event) => setActualMeetingDate(event.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Scheduled for {formatDisplayDate(selectedApprovalList?.boardMeetingDate ?? "")}.
                  Change this only if the meeting was postponed.
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="approval-sheet"
                  className="block text-xs font-semibold text-gray-600"
                >
                  Signed Approval Sheet (optional)
                </label>
                <input
                  id="approval-sheet"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => setApprovalSheetFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#953002] text-white hover:bg-[#7a2700]"
                  disabled={isProcessing}
                  onClick={handleProcessBoardDecision}
                >
                  {isProcessing ? "Processing..." : "Confirm"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[460px] rounded-lg border bg-white shadow-xl">
            <div className="px-5 pt-5">
              <h2 className="text-xl font-semibold text-[#953002]">Delete Approval List</h2>
              <p className="mt-2 text-sm text-gray-600">
                This will remove the list and return each attached request to the
                status it held before it was listed — Submitted for Approval, or
                Rejected if it had been refused at an earlier meeting.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-5">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                className="bg-rose-600 text-white hover:bg-rose-700"
                disabled={isDeleting}
                onClick={handleConfirmDeleteList}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border bg-white px-4 py-3 shadow-lg">
          <AlertCircle size={16} className="text-[#953002]" />
          <span className="text-sm text-gray-700">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
