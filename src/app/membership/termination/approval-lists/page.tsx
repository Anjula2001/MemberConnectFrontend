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
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
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
} from "@/lib/api/terminationApprovalLists";
import {
  approveTerminationRequest,
  rejectTerminationRequest,
  type TerminationRequestResponse,
} from "@/lib/api/terminationRequests";

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

function formatDisplayDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${year}-${month}-${day}`;
}

export default function TerminationApprovalListsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialListId = searchParams.get("listId") ?? "";

  const [dateFilter, setDateFilter] = useState("all");
  const [approvalLists, setApprovalLists] = useState<TerminationApprovalListDTO[]>([]);
  const [selectedApprovalListId, setSelectedApprovalListId] = useState(initialListId);
  const [requestsRetrieved, setRequestsRetrieved] = useState(false);
  const [selectedListRequests, setSelectedListRequests] = useState<ApprovalRequestRow[]>([]);
  const [requestDecisions, setRequestDecisions] = useState<
    Record<number, { decision: RequestDecision; rejectReason: string }>
  >({});
  const [boardRemarks, setBoardRemarks] = useState("");
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

      return true;
    });
  }, [approvalLists, dateFilter]);

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

      const decisionsArray = Object.values(requestDecisions).map((d) => d.decision);
      const listDecision: RequestDecision = decisionsArray.includes("Approve")
        ? "Approve"
        : "Reject";

      await processTerminationApprovalList(selectedApprovalListId, {
        actualMeetingDate: todayDate,
        decision: listDecision,
        boardRemarks,
        processedBy: "Head Office User",
        rejectReason:
          listDecision === "Reject"
            ? Object.values(requestDecisions).find((d) => d.decision === "Reject")
                ?.rejectReason ?? ""
            : undefined,
      });

      await Promise.allSettled(
        selectedListRequests.map(async (request) => {
          const decisionState = requestDecisions[request.id];
          const decision = decisionState?.decision ?? "Approve";

          if (decision === "Approve") {
            await approveTerminationRequest(request.requestNo);
          } else {
            await rejectTerminationRequest(
              request.requestNo,
              decisionState?.rejectReason?.trim() || "Rejected by board"
            );
          }
        })
      );

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
      setToastMessage("Failed to process termination approval list");
      setShowToast(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const approvedCount = selectedListRequests.filter(
    (request) => (requestDecisions[request.id]?.decision ?? "Approve") === "Approve"
  ).length;
  const rejectedCount = selectedListRequests.length - approvedCount;

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
                filteredApprovalLists.map((item) => (
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
                    className={`grid w-full grid-cols-[1fr_auto] items-center border-t px-5 py-3 text-left transition-colors first:border-t-0 hover:bg-[#f6f6f6] ${
                      selectedApprovalListId === item.listId ? "bg-[#d9d9d9]" : ""
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

        <Card className="rounded-xl py-0 shadow-sm">
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
                {!isSelectedListProcessed && (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      className="h-8 bg-rose-600 px-3 text-white hover:bg-rose-700"
                      onClick={() => setShowDeleteModal(true)}
                      disabled={!selectedApprovalListId}
                    >
                      <Trash2 size={14} />
                      Delete List
                    </Button>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-semibold text-gray-500">
                        <th className="pb-2 pr-3">Request ID</th>
                        <th className="pb-2 pr-3">Member ID</th>
                        <th className="pb-2 pr-3">Name</th>
                        <th className="pb-2 pr-3">Indicators</th>
                        <th className="pb-2 pr-3">Decision</th>
                        <th className="pb-2 pr-3">Reason (If Reject)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedListRequests.map((request) => (
                        <tr key={request.requestNo} className="align-top">
                          <td className="py-3 pr-3 font-medium text-gray-800">
                            {request.requestNo}
                          </td>
                          <td className="py-3 pr-3">
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
                          </td>
                          <td className="py-3 pr-3 text-gray-700">{request.memberName}</td>
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2">
                              {request.hasLoanBalance && (
                                <CircleDollarSign className="h-4 w-4 text-amber-600" />
                              )}
                              {request.hasIndirectObligations && (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-3">
                            {isSelectedListProcessed ? (
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${
                                  request.status === "REJECTED"
                                    ? "bg-rose-600"
                                    : "bg-green-600"
                                }`}
                              >
                                {request.status === "REJECTED" ? "Rejected" : "Approved"}
                              </span>
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
                          </td>
                          <td className="py-3 pr-3">
                            {isSelectedListProcessed ? (
                              <span
                                className={
                                  request.status === "REJECTED"
                                    ? "text-rose-600"
                                    : "text-gray-500"
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                This will remove the list and return attached requests to Submitted for Approval.
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
