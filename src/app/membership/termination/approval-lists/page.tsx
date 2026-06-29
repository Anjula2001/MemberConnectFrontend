"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CircleDollarSign,
  FileText,
  Printer,
  Search,
  Trash2,
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
  type TerminationRequestDTO,
} from "@/lib/api/terminationRequests";

type ApplicationDecision = "Approve" | "Reject";

type TerminationListRequest = {
  requestNo: string;
  memberId: string;
  memberName: string;
  requestedDate: string;
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

function mapRequestToRow(request: TerminationRequestDTO): TerminationListRequest {
  return {
    requestNo: request.requestNo ?? "-",
    memberId: request.memberId ?? "-",
    memberName: request.memberFullName ?? request.nameWithInitials ?? "-",
    requestedDate: request.requestedDate ?? "-",
    status: request.status ?? "NEW",
    hasLoanBalance: request.hasLoanBalance ?? false,
    hasIndirectObligations: request.hasIndirectObligations ?? false,
    rejectReason: request.rejectReason,
  };
}

export default function TerminationApprovalListsPage() {
  const router = useRouter();
  const [dateFilter, setDateFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isRetrievingLists, setIsRetrievingLists] = useState(false);
  const [isRetrievingRequests, setIsRetrievingRequests] = useState(false);
  const [isDeletingList, setIsDeletingList] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [approvalLists, setApprovalLists] = useState<TerminationApprovalListDTO[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [requestsRetrieved, setRequestsRetrieved] = useState(false);
  const [listRequests, setListRequests] = useState<TerminationListRequest[]>([]);
  const [requestDecisions, setRequestDecisions] = useState<
    Record<string, { decision: ApplicationDecision; rejectReason: string }>
  >({});
  const [boardRemarks, setBoardRemarks] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const todayDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!showToast) return;
    const timeoutId = window.setTimeout(() => setShowToast(false), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [showToast]);

  const selectedList = useMemo(
    () => approvalLists.find((item) => item.listId === selectedListId) ?? null,
    [approvalLists, selectedListId]
  );

  const isListProcessed = selectedList?.status === "PROCESSED";

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

      if (dateFilter === "datePeriod" && fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        return itemDate >= from && itemDate <= to;
      }

      return true;
    });
  }, [approvalLists, dateFilter, fromDate, toDate]);

  const handleRetrieveLists = async () => {
    try {
      setIsRetrievingLists(true);
      const lists = await getTerminationApprovalLists();
      setApprovalLists(lists);
      setSelectedListId("");
      setRequestsRetrieved(false);
      setListRequests([]);
      setRequestDecisions({});
    } catch (error) {
      console.error("Error retrieving termination approval lists:", error);
      setToastMessage("Failed to retrieve termination approval lists");
      setShowToast(true);
    } finally {
      setIsRetrievingLists(false);
    }
  };

  const handleRetrieveRequests = async () => {
    if (!selectedListId) return;

    try {
      setIsRetrievingRequests(true);
      const requests = await getTerminationApprovalListRequests(selectedListId);
      const rows = requests.map(mapRequestToRow);
      setListRequests(rows);

      const initialDecisions: Record<
        string,
        { decision: ApplicationDecision; rejectReason: string }
      > = {};
      rows.forEach((row) => {
        initialDecisions[row.requestNo] = {
          decision: row.status === "REJECTED" ? "Reject" : "Approve",
          rejectReason: row.rejectReason ?? "",
        };
      });
      setRequestDecisions(initialDecisions);
      setRequestsRetrieved(true);
    } catch (error) {
      console.error("Error retrieving termination requests:", error);
      setToastMessage("Failed to retrieve termination requests for this list");
      setShowToast(true);
    } finally {
      setIsRetrievingRequests(false);
    }
  };

  const handleDeleteList = () => {
    if (!selectedListId) return;
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteList = async () => {
    if (!selectedListId) return;

    try {
      setIsDeletingList(true);
      await deleteTerminationApprovalList(selectedListId);
      setApprovalLists((prev) => prev.filter((item) => item.listId !== selectedListId));
      setSelectedListId("");
      setRequestsRetrieved(false);
      setListRequests([]);
      setRequestDecisions({});
      setBoardRemarks("");
      setShowDeleteModal(false);
      setToastMessage("Termination approval list deleted successfully");
      setShowToast(true);
    } catch (error) {
      console.error("Error deleting termination approval list:", error);
      setToastMessage("Failed to delete termination approval list");
      setShowToast(true);
    } finally {
      setIsDeletingList(false);
    }
  };

  const handleOpenProcessModal = () => {
    if (!selectedListId) return;
    setShowProcessModal(true);
  };

  const handleProcessDecisions = async () => {
    if (!selectedListId) return;

    const rejectEntries = Object.entries(requestDecisions).filter(
      ([, value]) => value.decision === "Reject" && !value.rejectReason.trim()
    );
    if (rejectEntries.length > 0) {
      setToastMessage("Reject reason is required for rejected termination requests");
      setShowToast(true);
      return;
    }

    try {
      setIsProcessing(true);

      await Promise.all(
        listRequests.map(async (request) => {
          const decision = requestDecisions[request.requestNo]?.decision ?? "Approve";
          if (decision === "Approve") {
            await approveTerminationRequest(request.requestNo);
          } else {
            await rejectTerminationRequest(
              request.requestNo,
              requestDecisions[request.requestNo]?.rejectReason ?? ""
            );
          }
        })
      );

      const decisionsArray = Object.values(requestDecisions).map((item) => item.decision);
      const listDecision: ApplicationDecision = decisionsArray.includes("Approve")
        ? "Approve"
        : "Reject";

      await processTerminationApprovalList(selectedListId, {
        actualMeetingDate: todayDate,
        decision: listDecision,
        boardRemarks,
        processedBy: "Head Office User",
      });

      setApprovalLists((prev) =>
        prev.map((item) =>
          item.listId === selectedListId ? { ...item, status: "PROCESSED" } : item
        )
      );

      setListRequests((prev) =>
        prev.map((row) => {
          const decision = requestDecisions[row.requestNo]?.decision ?? "Approve";
          return {
            ...row,
            status: decision === "Approve" ? "APPROVED" : "REJECTED",
          };
        })
      );

      setShowProcessModal(false);
      setToastMessage("Termination approval list processed successfully");
      setShowToast(true);
    } catch (error) {
      console.error("Error processing termination approval list:", error);
      setToastMessage(
        error instanceof Error ? error.message : "Failed to process termination approval list"
      );
      setShowToast(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenRequest = (request: TerminationListRequest) => {
    router.push(
      `/membership/directory/termination-request?requestId=${encodeURIComponent(request.requestNo)}&memberId=${encodeURIComponent(request.memberId)}&mode=view`
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-10 pt-0 print:px-4">
      <h1 className="text-2xl font-bold text-[#8B4513]">Termination Approval Lists</h1>

      <Card className="rounded-xl py-0 shadow-sm print:hidden">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-lg font-bold text-[#8B4513]">
            Search Approval Lists
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-52">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Board Meeting Date Period
              </label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="datePeriod">Date Period</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilter === "datePeriod" && (
              <>
                <div className="w-40">
                  <label className="mb-1 block text-xs font-medium text-gray-600">From</label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="w-40">
                  <label className="mb-1 block text-xs font-medium text-gray-600">To</label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </>
            )}

            <Button
              type="button"
              className="bg-[#8B4513] text-white hover:bg-[#A0522D]"
              onClick={handleRetrieveLists}
              disabled={isRetrievingLists}
            >
              <Search size={14} className="mr-1" />
              {isRetrievingLists ? "Retrieving..." : "Retrieve"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="rounded-xl py-0 shadow-sm print:hidden">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-lg font-bold text-[#8B4513]">Approval Lists</CardTitle>
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
                  No termination approval lists found.
                </div>
              ) : (
                filteredApprovalLists.map((item) => (
                  <button
                    key={item.listId ?? item.id}
                    type="button"
                    onClick={() => {
                      if (!item.listId) return;
                      setSelectedListId(item.listId);
                      setRequestsRetrieved(false);
                      setListRequests([]);
                      setRequestDecisions({});
                      setBoardRemarks("");
                    }}
                    className={`grid w-full grid-cols-[1fr_auto] items-center border-t px-5 py-3 text-left transition-colors first:border-t-0 hover:bg-[#f6f6f6] ${
                      selectedListId === item.listId ? "bg-[#d9d9d9]" : ""
                    }`}
                  >
                    <div className="leading-tight">
                      <p className="text-sm font-medium text-gray-800">{item.listId ?? "-"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDisplayDate(item.boardMeetingDate ?? "")}
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
                className="h-9 w-full bg-[#8B4513] text-white hover:bg-[#A0522D]"
                disabled={!selectedListId || isRetrievingRequests}
                onClick={handleRetrieveRequests}
              >
                {isRetrievingRequests ? "Retrieving..." : "Retrieve Termination Requests"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl py-0 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-lg font-bold text-[#8B4513]">
              Termination Requests
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {requestsRetrieved && selectedListId
                ? `Showing ${listRequests.length} request(s)`
                : "Select a list and click Retrieve Termination Requests"}
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {!selectedListId || !requestsRetrieved ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center text-muted-foreground">
                <FileText size={36} className="text-gray-300" />
                <p>Select a list and click Retrieve Termination Requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-end gap-2 print:hidden">
                  <Button type="button" variant="outline" className="h-8 px-3" onClick={handlePrint}>
                    <Printer size={14} className="mr-1" />
                    Print
                  </Button>
                  {!isListProcessed && (
                    <>
                      <Button
                        type="button"
                        className="h-8 bg-rose-600 px-3 text-white hover:bg-rose-700"
                        onClick={handleDeleteList}
                      >
                        <Trash2 size={14} className="mr-1" />
                        Delete List
                      </Button>
                      <Button
                        type="button"
                        className="h-8 bg-[#8B4513] px-3 text-white hover:bg-[#A0522D]"
                        onClick={handleOpenProcessModal}
                      >
                        Approve / Reject
                      </Button>
                    </>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-semibold text-gray-500">
                        <th className="pb-2 pr-3">Member ID</th>
                        <th className="pb-2 pr-3">Name</th>
                        <th className="pb-2 pr-3">Requested Date</th>
                        <th className="pb-2 pr-3">Indicators</th>
                        <th className="pb-2 pr-3">Decision</th>
                        <th className="pb-2 pr-3">Reason (If Reject)</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listRequests.map((request) => (
                        <tr key={request.requestNo} className="border-b align-top">
                          <td className="py-3 pr-3">
                            <button
                              type="button"
                              className="font-medium text-[#8B4513] hover:underline"
                              onClick={() => handleOpenRequest(request)}
                            >
                              {request.memberId}
                            </button>
                          </td>
                          <td className="py-3 pr-3 text-gray-700">{request.memberName}</td>
                          <td className="py-3 pr-3 text-gray-700">{request.requestedDate}</td>
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2">
                              {request.hasLoanBalance && (
                                <CircleDollarSign className="h-4 w-4 text-amber-600" />
                              )}
                              {request.hasIndirectObligations && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-3">
                            {isListProcessed ? (
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${
                                  request.status === "REJECTED" ? "bg-rose-600" : "bg-green-600"
                                }`}
                              >
                                {request.status === "REJECTED" ? "Rejected" : "Approved"}
                              </span>
                            ) : (
                              <Select
                                value={requestDecisions[request.requestNo]?.decision ?? "Approve"}
                                onValueChange={(value) =>
                                  setRequestDecisions((prev) => ({
                                    ...prev,
                                    [request.requestNo]: {
                                      ...(prev[request.requestNo] ?? { rejectReason: "" }),
                                      decision: value as ApplicationDecision,
                                    },
                                  }))
                                }
                              >
                                <SelectTrigger className="h-8 w-[120px]">
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
                            {!isListProcessed &&
                            requestDecisions[request.requestNo]?.decision === "Reject" ? (
                              <Input
                                value={requestDecisions[request.requestNo]?.rejectReason ?? ""}
                                onChange={(e) =>
                                  setRequestDecisions((prev) => ({
                                    ...prev,
                                    [request.requestNo]: {
                                      decision: prev[request.requestNo]?.decision ?? "Reject",
                                      rejectReason: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Reject reason"
                                className="h-8"
                              />
                            ) : (
                              <span className="text-gray-500">
                                {request.rejectReason ?? "-"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-gray-700">{request.status.replaceAll("_", " ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!isListProcessed && (
                  <div className="print:hidden">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Board Remarks
                    </label>
                    <Input
                      value={boardRemarks}
                      onChange={(e) => setBoardRemarks(e.target.value)}
                      placeholder="Optional board remarks"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden">
          <div className="w-full max-w-md rounded-lg border bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-[#8B4513]">Confirm Delete</h2>
            <p className="mt-2 text-sm text-gray-600">
              Do you want to delete the selected Termination Approval List?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                className="bg-rose-600 text-white hover:bg-rose-700"
                disabled={isDeletingList}
                onClick={handleConfirmDeleteList}
              >
                {isDeletingList ? "Deleting..." : "Yes, Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showProcessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden">
          <div className="w-full max-w-md rounded-lg border bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-[#8B4513]">Confirm Decisions</h2>
            <p className="mt-2 text-sm text-gray-600">
              Apply approve/reject decisions for {listRequests.length} termination request(s)?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowProcessModal(false)}>
                Cancel
              </Button>
              <Button
                className="bg-[#8B4513] text-white hover:bg-[#A0522D]"
                disabled={isProcessing}
                onClick={handleProcessDecisions}
              >
                {isProcessing ? "Processing..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md bg-gray-900 px-4 py-2 text-sm text-white print:hidden">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
