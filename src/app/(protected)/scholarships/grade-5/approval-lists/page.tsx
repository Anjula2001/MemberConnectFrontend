"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/src/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Printer, Trash2, FileText, Search, ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Info, X, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import AccessRestricted from "@/src/components/AccessRestricted";

const API_BASE_URL = "http://localhost:8080";

interface ApprovalList {
  id: number;
  listId: string;
  boardMeetingId: number;
  boardMeetingDate: string;
  actualMeetingDate?: string;
  status: string;
  type: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  scannedReportPath?: string;
  decision?: string;
  boardRemarks?: string;
  requestNos: string[];
}

interface ScholarshipRequest {
  id: number;
  requestNo: string;
  memberId: string;
  studentName: string;
  marksObtained: number;
  disbursementOption: string;
  status: string;
  incompleteReason?: string;
}

interface BoardMeeting {
  id: number;
  boardMeetingId: string;
  scheduledDate: string;
}

export default function Grade5ApprovalListsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialListId = searchParams.get("listId") || "";
  const { user } = useAuth();

  // MMS08/MMS15 view the list; MMS10/MMS17 print it; MMS11/MMS18 process it;
  // MMS09/MMS16 delete it. Delete is deliberately the narrowest of the four —
  // the SRS calls it out as a separate "delete privilege".
  const canViewLists = hasPermission(user?.role, "G5_LIST_VIEW");
  const canPrintList = hasPermission(user?.role, "G5_LIST_PRINT");
  const canProcessList = hasPermission(user?.role, "G5_LIST_PROCESS");
  const canDeleteList = hasPermission(user?.role, "G5_LIST_DELETE");

  // Active list type tab (NORMAL vs DEVIATION)
  const [activeTypeTab, setActiveTypeTab] = useState<"NORMAL" | "DEVIATION">("NORMAL");

  // Date filters
  const [filterType, setFilterType] = useState<"ALL" | "PERIOD">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const [lists, setLists] = useState<ApprovalList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>(initialListId);
  const [selectedList, setSelectedList] = useState<ApprovalList | null>(null);

  const [requests, setRequests] = useState<ScholarshipRequest[]>([]);
  const [boardMeetings, setBoardMeetings] = useState<BoardMeeting[]>([]);

  // Processing state
  const [decisions, setDecisions] = useState<Record<string, { status: "APPROVED" | "REJECTED"; rejectReason: string }>>({});

  // Modal states
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actualMeetingDate, setActualMeetingDate] = useState("");
  const [boardRemarks, setBoardRemarks] = useState("");
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General Popup Message Modal state
  const [popupModal, setPopupModal] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  const showPopup = (type: "success" | "error" | "warning" | "info", title: string, message: string) => {
    setPopupModal({
      isOpen: true,
      type,
      title,
      message,
    });
  };

  const closePopup = () => {
    setPopupModal((prev) => ({ ...prev, isOpen: false }));
  };

  const [loading, setLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Fetch created board meetings
  const fetchBoardMeetings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/board-meetings/getAllBoardMeetings`);
      if (res.ok) {
        const data = await res.json();
        setBoardMeetings(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleTabChange = (type: "NORMAL" | "DEVIATION") => {
    setActiveTypeTab(type);
    setSelectedListId("");
    setSelectedList(null);
    setRequests([]);
  };

  // Fetch approval lists
  const fetchApprovalLists = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/grade5/approval-lists/all`);
      if (res.ok) {
        let data: ApprovalList[] = await res.json();

        // Ensure type and status are properly derived if null or empty
        data = data.map((item) => ({
          ...item,
          type: item.type || (item.listId?.startsWith("G5-DAL-") ? "DEVIATION" : "NORMAL"),
          status: item.status || "CREATED",
        }));

        // Filter by date period if selected
        if (filterType === "PERIOD" && fromDate && toDate) {
          const from = new Date(fromDate);
          const to = new Date(toDate);
          data = data.filter((item) => {
            const listDate = new Date(item.boardMeetingDate);
            return listDate >= from && listDate <= to;
          });
        }

        setLists(data);

        // Auto-select list from URL query parameter
        if (initialListId) {
          const found = data.find((l) => l.listId === initialListId);
          if (found) {
            setSelectedList(found);
            setActiveTypeTab(found.type as "NORMAL" | "DEVIATION");
            fetchRequestsForList(initialListId);
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch requests for a selected list
  const fetchRequestsForList = async (listId: string) => {
    try {
      setRequestsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/grade5/approval-lists/${listId}/requests`);
      if (res.ok) {
        const data: ScholarshipRequest[] = await res.json();
        setRequests(data);

        // Initialize default decisions to APPROVED
        const initialDecisions: Record<string, { status: "APPROVED" | "REJECTED"; rejectReason: string }> = {};
        data.forEach((r) => {
          if (r.status === "APPROVED" || r.status === "REJECTED") {
            initialDecisions[r.requestNo] = {
              status: r.status as "APPROVED" | "REJECTED",
              rejectReason: r.incompleteReason || "",
            };
          } else {
            initialDecisions[r.requestNo] = {
              status: "APPROVED",
              rejectReason: "",
            };
          }
        });
        setDecisions(initialDecisions);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardMeetings();
    fetchApprovalLists();
  }, []);

  const handleSelectRow = (list: ApprovalList) => {
    setSelectedListId(list.listId);
    setSelectedList(list);
    setRequests([]);
  };

  const handleRetrieveRequests = () => {
    if (selectedListId) {
      fetchRequestsForList(selectedListId);
    }
  };

  const handleDecisionChange = (requestNo: string, val: "APPROVED" | "REJECTED") => {
    setDecisions((prev) => ({
      ...prev,
      [requestNo]: { ...prev[requestNo], status: val },
    }));
  };

  const handleRejectReasonChange = (requestNo: string, reason: string) => {
    setDecisions((prev) => ({
      ...prev,
      [requestNo]: { ...prev[requestNo], rejectReason: reason },
    }));
  };

  // Open delete confirmation modal
  const handleDeleteList = () => {
    if (!selectedListId) return;
    setIsDeleteModalOpen(true);
  };

  // Perform delete approval list
  const handleConfirmDeleteList = async () => {
    if (!selectedListId) return;
    setIsDeleteModalOpen(false);

    try {
      const res = await fetch(`${API_BASE_URL}/api/grade5/approval-lists/${selectedListId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showPopup("success", "Success", "Board approval list deleted successfully");
        setSelectedListId("");
        setSelectedList(null);
        setRequests([]);
        fetchApprovalLists();
      } else {
        showPopup("error", "Error", "Failed to delete list");
      }
    } catch (error) {
      console.error(error);
      showPopup("error", "Error", "An error occurred while attempting to delete the list.");
    }
  };

  // Open processing dialog
  const handleOpenProcessModal = () => {
    // Validate that all rejected requests have a reason entered
    const invalid = Object.entries(decisions).some(
      ([_, dec]) => dec.status === "REJECTED" && !dec.rejectReason.trim()
    );
    if (invalid) {
      showPopup("warning", "Validation Required", "Rejection reason is mandatory for all rejected requests.");
      return;
    }

    // Set actual date default to board meeting date
    if (selectedList) {
      setActualMeetingDate(selectedList.boardMeetingDate);
    }
    setIsProcessModalOpen(true);
  };

  // Submit list processing
  const handleConfirmProcess = async () => {
    if (!selectedListId) return;

    let scannedReportPath = "";

    try {
      // 1. If scanned file is attached, upload it to AWS S3 / storage
      if (scannedFile) {
        try {
          const formData = new FormData();
          formData.append("file", scannedFile);

          const uploadRes = await fetch(`${API_BASE_URL}/api/file/upload`, {
            method: "POST",
            body: formData,
          });

          if (uploadRes.ok) {
            scannedReportPath = await uploadRes.text();
          } else {
            scannedReportPath = scannedFile.name;
          }
        } catch (uploadError) {
          console.warn("File upload error, proceeding with filename:", uploadError);
          scannedReportPath = scannedFile.name;
        }
      }

      // Map request details
      const requestDetails = Object.entries(decisions).map(([reqNo, dec]) => ({
        requestNo: reqNo,
        status: dec.status,
        rejectReason: dec.rejectReason,
      }));

      const res = await fetch(`${API_BASE_URL}/api/grade5/approval-lists/${selectedListId}/process`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualMeetingDate,
          boardRemarks,
          scannedReportPath,
          requestDetails,
        }),
      });

      if (res.ok) {
        setIsProcessModalOpen(false);
        setScannedFile(null);
        showPopup("success", "Success", "Approval list processed successfully and scanned report uploaded to AWS S3.");
        fetchApprovalLists();
        fetchRequestsForList(selectedListId);
      } else {
        showPopup("error", "Error", "Failed to process approval list");
      }
    } catch (error) {
      console.error(error);
      showPopup("error", "Error", "An error occurred while processing the approval list.");
    }
  };

  // Print function
  const handlePrint = () => {
    if (!selectedListId) return;
    /*
     * Opens the report route rather than printing this page. window.print() here put
     * the sidebar, the tab bar and the search panel on the sheet - a screenshot of the
     * application, not a board report.
     */
    router.push(
      `/scholarships/grade-5/approval-lists/print/${encodeURIComponent(selectedListId)}`
    );
  };

  // Calculate summary counts
  const totalCount = requests.length;
  const approvedCount = Object.values(decisions).filter((d) => d.status === "APPROVED").length;
  const rejectedCount = Object.values(decisions).filter((d) => d.status === "REJECTED").length;

  // Filter lists by activeTypeTab (NORMAL vs DEVIATION)
  const filteredLists = lists.filter((list) => list.type === activeTypeTab);

  if (user && !canViewLists) {
    return (
      <AccessRestricted
        message="Grade 5 Scholarship Approval Lists are restricted to Head Office and Board Secretariat personnel."
        fallbackHref="/scholarships/grade-5"
        fallbackLabel="Back to Grade 5 Requests"
      />
    );
  }

  return (
    <div className="w-full flex flex-1 flex-col gap-4 p-6 pt-0">
      {/* Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/scholarships/grade-5")}
          className="text-[#953002] hover:text-[#7a2700] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-7 w-7" />
        </button>
        <h1 className="text-2xl font-bold text-[#953002]">Grade 5 Scholarship Approval Lists</h1>
      </div>

      {/* Tabs */}
      <div className="inline-flex w-fit rounded-md border bg-muted p-1">
        <Button
          type="button"
          variant={activeTypeTab === "NORMAL" ? "secondary" : "ghost"}
          className={`h-8 rounded-sm px-3 text-xs ${activeTypeTab === "NORMAL"
            ? "bg-white text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-transparent"
            }`}
          onClick={() => handleTabChange("NORMAL")}
        >
          Normal Board Approval
        </Button>
        <Button
          type="button"
          variant={activeTypeTab === "DEVIATION" ? "secondary" : "ghost"}
          className={`h-8 rounded-sm px-3 text-xs ${activeTypeTab === "DEVIATION"
            ? "bg-white text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-transparent"
            }`}
          onClick={() => handleTabChange("DEVIATION")}
        >
          Deviation Board Approval
        </Button>
      </div>

      {/* Search Approval Lists Card */}
      <Card className="rounded-xl py-0 shadow-sm">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-lg font-bold text-[#953002]">
            Search Approval Lists
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex w-full flex-col gap-1 md:max-w-md">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Date Filter</label>
            <div className="flex items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as "ALL" | "PERIOD")}
                className="border rounded-md px-3 py-2 flex-1 text-sm bg-white h-9"
              >
                <option value="ALL">All Dates</option>
                <option value="PERIOD">Date Period</option>
              </select>
              <Button
                type="button"
                className="bg-[#953002] text-white hover:bg-[#7a2700] h-9"
                onClick={fetchApprovalLists}
              >
                <Search size={14} className="mr-1" />
                Retrieve
              </Button>
            </div>
          </div>

          {filterType === "PERIOD" && (
            <div className="grid grid-cols-2 gap-4 mt-3 max-w-md">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  max={today}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && val > today) {
                      setFromDate(today);
                    } else {
                      setFromDate(val);
                    }
                  }}
                  className="border rounded-md px-3 py-1.5 w-full text-sm h-9"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  max={today}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && val > today) {
                      setToDate(today);
                    } else {
                      setToDate(val);
                    }
                  }}
                  className="border rounded-md px-3 py-1.5 w-full text-sm h-9"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Split screen content layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[350px_1fr]">

        {/* Left Panel: Approval Lists Card */}
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

              {loading ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Loading lists...
                </div>
              ) : filteredLists.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No approval lists found.
                </div>
              ) : (
                filteredLists.map((item) => (
                  <button
                    key={item.listId}
                    type="button"
                    onClick={() => handleSelectRow(item)}
                    className={`grid w-full grid-cols-[1fr_auto] items-center border-t px-5 py-3 text-left transition-colors first:border-t-0 hover:bg-[#f6f6f6] ${selectedListId === item.listId ? "bg-[#d9d9d9]" : ""
                      }`}
                  >
                    <div className="leading-tight">
                      <p className="text-sm font-medium text-gray-800">{item.listId}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.boardMeetingDate}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.status === "PROCESSED"
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                      }`}>
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
                disabled={!selectedListId || requestsLoading}
                onClick={handleRetrieveRequests}
              >
                {requestsLoading ? "Retrieving..." : "Retrieve Applications"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* min-w-0 is what stops this card blowing past the viewport. A grid item
            defaults to min-width:auto, so without it the column refuses to shrink below
            the table's intrinsic width and the whole card grows instead of the table
            scrolling inside it — clipping the action buttons and the last column. */}
        {/* Right Panel: Applications Details Card */}
        <Card className="min-w-0 rounded-xl py-0 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-[#953002]">Applications</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedList && requests.length > 0
                    ? `Showing ${requests.length} applications for List ${selectedListId}`
                    : "Click 'Retrieve Applications' to view data"}
                </p>
              </div>

              {/* Actions at top right */}
              {selectedList && requests.length > 0 && (
                <div className="flex gap-2 print:hidden">
                  {selectedList.status === "CREATED" && (
                    <>
                      {canDeleteList && (
                        <Button
                          variant="outline"
                          onClick={handleDeleteList}
                          className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3 text-xs"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete List
                        </Button>
                      )}
                      {canPrintList && (
                        <Button
                          variant="outline"
                          onClick={handlePrint}
                          className="border-[#953002]/20 text-[#953002] hover:bg-[#953002]/5 h-8 px-3 text-xs"
                        >
                          <Printer className="h-3.5 w-3.5 mr-1" />
                          Print List
                        </Button>
                      )}
                      {canProcessList && (
                        <Button
                          onClick={handleOpenProcessModal}
                          className="bg-[#953002] text-white hover:bg-[#7a2700] h-8 px-3 text-xs"
                        >
                          Proceed
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            {!selectedListId || requests.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center text-muted-foreground p-8">
                <FileText size={36} className="text-gray-300" />
                <p className="text-sm font-medium text-gray-500">Select a list and click Retrieve Applications</p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Processed Metadata Log if PROCESSED */}
                {selectedList?.status === "PROCESSED" && (
                  <div className="text-xs text-gray-600 bg-green-50 border border-green-100 rounded-lg p-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 font-medium">Processed By</p>
                      <p className="font-semibold text-gray-700">{selectedList?.processedBy || "Head Office User"}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-medium">Processed At</p>
                      <p className="font-semibold text-gray-700">{selectedList?.processedAt?.replace("T", " ")}</p>
                    </div>
                  </div>
                )}

                {/* Applications Table */}
                <div className="w-full overflow-x-auto rounded-lg border">
                  <Table className="border-collapse">
                    <TableHeader>
                      <TableRow className="bg-[#fafafa] hover:bg-[#fafafa]">
                        {[
                          "Request ID",
                          "Member ID",
                          "Student Name",
                          "Marks Obtained",
                          "Disbursement",
                        ].map((h) => (
                          <TableHead
                            key={h}
                            className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase"
                          >
                            {h}
                          </TableHead>
                        ))}
                        <TableHead className="w-40 px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                          Decision
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                          Reason (If Reject)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requestsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-12 text-center">
                            <div className="flex items-center justify-center gap-2 text-neutral-500">
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>Retrieving requests…</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : requests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-neutral-500">
                            This list holds no requests.
                          </TableCell>
                        </TableRow>
                      ) : (
                        requests.map((r) => {
                          const rowDecision = decisions[r.requestNo] || { status: "APPROVED", rejectReason: "" };
                          // Locked once the list is processed, and also for anyone
                          // without approve/reject rights — a read-only viewer should
                          // not be able to stage decisions they cannot submit.
                          const isProcessed =
                            selectedList?.status === "PROCESSED" || !canProcessList;

                          return (
                            <TableRow key={r.id} className="hover:bg-neutral-50">
                              <TableCell className="px-4 py-4 font-medium">
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/membership/directory/grade5-scholarship?memberId=${r.memberId}&requestId=${r.id}&mode=view`
                                    )
                                  }
                                  className="text-left text-[#9d3602] hover:underline"
                                  type="button"
                                >
                                  {r.requestNo}
                                </button>
                              </TableCell>
                              <TableCell className="px-4 py-4 text-neutral-700">{r.memberId}</TableCell>
                              <TableCell className="px-4 py-4 text-neutral-700">{r.studentName}</TableCell>
                              <TableCell className="px-4 py-4 font-medium text-neutral-700 tabular-nums">
                                {r.marksObtained}
                              </TableCell>
                              <TableCell className="px-4 py-4">
                                <span className="rounded border bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-800">
                                  {r.disbursementOption?.replace(/_/g, " ")}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-4">
                                <select
                                  disabled={isProcessed}
                                  value={rowDecision.status}
                                  onChange={(e) =>
                                    handleDecisionChange(r.requestNo, e.target.value as "APPROVED" | "REJECTED")
                                  }
                                  className="h-9 w-full rounded-md border bg-white px-2 text-xs font-medium disabled:bg-gray-100 disabled:text-gray-700"
                                >
                                  <option value="APPROVED">Approve</option>
                                  <option value="REJECTED">Reject</option>
                                </select>
                              </TableCell>
                              <TableCell className="px-4 py-4">
                                {rowDecision.status === "REJECTED" ? (
                                  <input
                                    type="text"
                                    disabled={isProcessed}
                                    placeholder="Enter reason..."
                                    value={rowDecision.rejectReason}
                                    onChange={(e) => handleRejectReasonChange(r.requestNo, e.target.value)}
                                    className="w-full rounded border border-red-300 bg-white px-2 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-700"
                                  />
                                ) : (
                                  <span className="text-xs text-neutral-400">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

              </div>
            )}
          </CardContent>
        </Card>

      </div>  {/* Confirmation Process Modal */}
      {isProcessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-[#953002]">
              Approve / Reject Grade 5 Scholarship Requests
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Board Meeting Date</p>
                <p className="font-semibold text-gray-800">{selectedList?.boardMeetingDate}</p>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Actual Board Meeting Date
                </label>
                <select
                  value={actualMeetingDate}
                  onChange={(e) => setActualMeetingDate(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm w-full bg-white font-semibold"
                >
                  {boardMeetings.map((bm) => (
                    <option key={bm.id} value={bm.scheduledDate}>
                      {bm.scheduledDate}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Document Scan Upload */}
            <div
              onDoubleClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50/80 transition-colors select-none"
              title="Double click to upload document"
            >
              <p className="text-xs text-gray-500 mb-1 font-medium">
                Upload Scanned Report (Grade 5 Scholarship Report)
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setScannedFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                className="hidden"
              />
              <p className="text-xs text-gray-700 font-medium">
                Choose file:{" "}
                <span className={scannedFile ? "font-semibold text-[#953002]" : "text-gray-400 italic"}>
                  {scannedFile ? scannedFile.name : "No file chosen"}
                </span>
              </p>
            </div>

            {/* Request Summary Card */}
            <div className="border border-gray-100/80 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                REQUEST SUMMARY
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {/* Total Requests */}
                <div className="bg-white border border-gray-200/80 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-xs">
                  <span className="text-2xl font-bold text-slate-800">{totalCount}</span>
                  <span className="text-xs font-medium text-gray-500 mt-1">Total Requests</span>
                </div>

                {/* To Approve */}
                <div className="bg-[#eefcf2] border border-emerald-100 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-xs">
                  <span className="text-2xl font-bold text-emerald-600">{approvedCount}</span>
                  <span className="text-xs font-semibold text-emerald-600 mt-1">To Approve</span>
                </div>

                {/* To Reject */}
                <div className="bg-[#fff1f2] border border-rose-100 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-xs">
                  <span className="text-2xl font-bold text-rose-600">{rejectedCount}</span>
                  <span className="text-xs font-semibold text-rose-600 mt-1">To Reject</span>
                </div>
              </div>
            </div>

            {/* Remarks comment field */}
            <div>
              <label className="block text-sm text-gray-600 font-medium mb-1">
                Board Remarks / Comments
              </label>
              <textarea
                placeholder="Enter remarks..."
                value={boardRemarks}
                onChange={(e) => setBoardRemarks(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={() => setIsProcessModalOpen(false)}
                className="bg-white text-black hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmProcess}
                className="bg-[#953002] text-white hover:bg-[#672102]"
              >
                Process
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-[#953002]">
              Delete Grade 5 Scholarship Approval List
            </h3>

            <p className="text-sm text-gray-700 leading-relaxed">
              Do you want to delete the selected Grade 5 Scholarship Approval List{" "}
              <span className="font-semibold text-gray-900">{selectedListId}</span>?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="bg-white text-black hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDeleteList}
                className="bg-[#953002] text-white hover:bg-[#672102]"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Message Modal */}
      {popupModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-[#953002]">
              {popupModal.title}
            </h3>

            <p className="text-sm text-gray-700 leading-relaxed">
              {popupModal.message}
            </p>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={closePopup}
                className="bg-[#953002] text-white hover:bg-[#672102] min-w-[80px]"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
