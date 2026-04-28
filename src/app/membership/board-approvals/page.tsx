"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  FileText,
  Printer,
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
import { createBoardMeeting, getBoardMeetings, deleteBoardMeeting, type BoardMeetingDTO } from "@/lib/api/boardMeeting";

type BoardMeeting = BoardMeetingDTO & {
  date: string;
};

type BoardTab = "meetings" | "approval-lists";

type ApprovalListStatus = "CREATED" | "PROCESSED";

type ApprovalListItem = {
  listId: string;
  status: ApprovalListStatus;
  meetingId: number;
  date: string;
};

type ApplicationDecision = "Approve" | "Reject";

type ApprovalApplication = {
  appId: string;
  name: string;
  hasWarning?: boolean;
};

type ProcessedListState = {
  processedBy: string;
  processedAt: string;
  decision: ApplicationDecision;
  rejectReason: string;
};

function formatDisplayDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${year}-${month}-${day}`;
}

export default function BoardApprovalsPage() {
  const [activeTab, setActiveTab] = useState<BoardTab>("meetings");
  const [selectedDate, setSelectedDate] = useState("");
  const [createdMeetings, setCreatedMeetings] = useState<BoardMeeting[]>([]);
  const [dateFilter, setDateFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [approvalLists, setApprovalLists] = useState<ApprovalListItem[]>([
    {
      listId: "BAL-2026-001",
      status: "CREATED",
      meetingId: 108,
      date: "2026-02-28",
    },
    {
      listId: "BAL-6892",
      status: "CREATED",
      meetingId: 108,
      date: "2026-02-28",
    },
  ]);
  const [selectedApprovalListId, setSelectedApprovalListId] = useState("");
  const [applicationsRetrieved, setApplicationsRetrieved] = useState(false);
  const [applicationDecision, setApplicationDecision] =
    useState<ApplicationDecision>("Approve");
  const [rejectReason, setRejectReason] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actualMeetingDateValue, setActualMeetingDateValue] = useState("");
  const [signedListScan, setSignedListScan] = useState("");
  const [boardRemarks, setBoardRemarks] = useState("");
  const [processedLists, setProcessedLists] = useState<Record<string, ProcessedListState>>(
    {}
  );
  const [showProcessToast, setShowProcessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Fetch board meetings from database
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        setIsFetching(true);
        const meetings = await getBoardMeetings();
        const formattedMeetings = meetings.map((m) => ({
          ...m,
          date: m.scheduledDate,
        }));
        setCreatedMeetings(formattedMeetings);
      } catch (error) {
        console.error("Error fetching board meetings:", error);
        setToastMessage("Failed to load board meetings");
        setShowProcessToast(true);
      } finally {
        setIsFetching(false);
      }
    };

    fetchMeetings();
  }, []);

  // Toast timeout effect
  useEffect(() => {
    if (!showProcessToast) return;

    const timeoutId = window.setTimeout(() => {
      setShowProcessToast(false);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [showProcessToast]);

  const listApplications: Record<string, ApprovalApplication[]> = {
    "BAL-2026-001": [
      {
        appId: "APP-2026-003",
        name: "Rejoining Member",
        hasWarning: true,
      },
    ],
    "BAL-6892": [
      {
        appId: "APP-2026-001",
        name: "New User One",
      },
    ],
  };

  const selectedListApplications =
    (selectedApprovalListId && listApplications[selectedApprovalListId]) || [];

  const selectedProcessedState =
    (selectedApprovalListId && processedLists[selectedApprovalListId]) || null;

  const handleAddMeeting = async () => {
    if (!selectedDate) return;

    const isDuplicateDate = createdMeetings.some(
      (meeting) => meeting.date === selectedDate
    );
    if (isDuplicateDate) {
      setToastMessage("A meeting already exists for this date");
      setShowProcessToast(true);
      return;
    }

    try {
      setIsLoading(true);
      const newMeeting = await createBoardMeeting({
        scheduledDate: selectedDate,
      });
      
      const formattedMeeting = {
        ...newMeeting,
        date: newMeeting.scheduledDate,
      };
      
      setCreatedMeetings((prev) => [formattedMeeting, ...prev]);
      setSelectedDate("");
      setToastMessage("Board meeting created successfully");
      setShowProcessToast(true);
    } catch (error) {
      console.error("Error creating board meeting:", error);
      setToastMessage("Failed to create board meeting");
      setShowProcessToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMeeting = async (id: number) => {
    try {
      setIsLoading(true);
      await deleteBoardMeeting(id);
      setCreatedMeetings((prev) => prev.filter((meeting) => meeting.id !== id));
      setToastMessage("Board meeting deleted successfully");
      setShowProcessToast(true);
    } catch (error) {
      console.error("Error deleting board meeting:", error);
      setToastMessage("Failed to delete board meeting");
      setShowProcessToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredApprovalLists = useMemo(() => {
    if (dateFilter === "all") return approvalLists;

    const now = new Date();
    return approvalLists.filter((item) => {
      const itemDate = new Date(item.date);
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

  const selectedApprovalList = useMemo(
    () =>
      filteredApprovalLists.find((item) => item.listId === selectedApprovalListId) ??
      null,
    [filteredApprovalLists, selectedApprovalListId]
  );

  const actualMeetingDateOptions = useMemo(() => {
    const unique = new Map<string, { value: string; label: string }>();

    approvalLists.forEach((item) => {
      const value = `${item.date}|${item.meetingId}`;
      if (!unique.has(value)) {
        unique.set(value, {
          value,
          label: `${formatDisplayDate(item.date)} (${item.meetingId})`,
        });
      }
    });

    return Array.from(unique.values());
  }, [approvalLists]);

  const totalCount = selectedListApplications.length;
  const approvedCount =
    applicationDecision === "Approve" ? selectedListApplications.length : 0;
  const rejectedCount =
    applicationDecision === "Reject" ? selectedListApplications.length : 0;

  const handleRetrieveApprovalLists = () => {
    const generated = createdMeetings
      .filter((meeting) => meeting.id !== undefined)
      .map((meeting, index) => ({
        listId: `BAL-${new Date(meeting.date).getFullYear()}-${String((meeting.id || 0) + index).padStart(3, "0")}`,
        status: "CREATED" as const,
        meetingId: meeting.id || 0,
        date: meeting.date,
      }));

    if (generated.length > 0) {
      setApprovalLists((prev) => {
        const seen = new Set(prev.map((item) => item.listId));
        const newItems = generated.filter((item) => !seen.has(item.listId));
        return [...newItems, ...prev];
      });
    }

    setSelectedApprovalListId("");
    setApplicationsRetrieved(false);
  };

  const handleRetrieveApplications = () => {
    if (!selectedApprovalListId) return;
    setApplicationsRetrieved(true);
  };

  const handleDeleteSelectedList = () => {
    if (!selectedApprovalListId) return;

    setApprovalLists((prev) =>
      prev.filter((item) => item.listId !== selectedApprovalListId)
    );
    setProcessedLists((prev) => {
      const next = { ...prev };
      delete next[selectedApprovalListId];
      return next;
    });
    setSelectedApprovalListId("");
    setApplicationsRetrieved(false);
    setApplicationDecision("Approve");
    setRejectReason("");
    setShowConfirmModal(false);
  };

  const handleOpenConfirmModal = () => {
    if (!selectedApprovalList) return;

    const selectedValue = `${selectedApprovalList.date}|${selectedApprovalList.meetingId}`;
    setActualMeetingDateValue(selectedValue);
    setShowConfirmModal(true);
  };

  const handleProcessBoardDecision = () => {
    if (!selectedApprovalListId || !selectedApprovalList) return;

    const now = new Date();
    const formatted = `${now.toLocaleDateString("en-US")} ${now.toLocaleTimeString("en-US")}`;

    setProcessedLists((prev) => ({
      ...prev,
      [selectedApprovalListId]: {
        processedBy: "Head Office User",
        processedAt: formatted,
        decision: applicationDecision,
        rejectReason,
      },
    }));

    setApprovalLists((prev) =>
      prev.map((item) =>
        item.listId === selectedApprovalListId
          ? { ...item, status: "PROCESSED" }
          : item
      )
    );

    setShowConfirmModal(false);
    setShowProcessToast(true);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-3xl font-bold text-[#953002]">Board Administration</h1>

      <div className="inline-flex w-fit rounded-md border bg-muted p-1">
        <Button
          type="button"
          variant={activeTab === "meetings" ? "secondary" : "ghost"}
          className={`h-8 rounded-sm px-3 text-xs ${
            activeTab === "meetings"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-transparent"
          }`}
          onClick={() => setActiveTab("meetings")}
        >
          Board Meetings
        </Button>
        <Button
          type="button"
          variant={activeTab === "approval-lists" ? "secondary" : "ghost"}
          className={`h-8 rounded-sm px-3 text-xs ${
            activeTab === "approval-lists"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-transparent"
          }`}
          onClick={() => setActiveTab("approval-lists")}
        >
          Board Approval Lists
        </Button>
      </div>

      {activeTab === "meetings" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="rounded-xl py-0 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-4 font-bold text-[#953002]">
                Create Board Meeting
              </CardTitle>
              <p className="text-sm text-muted-foreground">Schedule new meetings</p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <CalendarDays
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddMeeting}
                  disabled={!selectedDate || isLoading}
                  className="bg-[#953002] text-white hover:bg-[#7a2700]"
                >
                  {isLoading ? "Creating..." : "Add"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl py-0 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-4 font-bold text-[#953002]">
                Board Meetings Created
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {isFetching ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  Loading meetings...
                </div>
              ) : createdMeetings.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  No meetings added yet.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {createdMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded bg-[#f7ede8] p-1.5 text-[#953002]">
                          <CalendarDays size={14} />
                        </div>
                        <div className="leading-tight">
                          <p className="font-semibold text-foreground">{meeting.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDisplayDate(meeting.date)}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={() => meeting.id && handleDeleteMeeting(meeting.id)}
                        aria-label={`Delete meeting ${meeting.id}`}
                        disabled={!meeting.id}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <Card className="rounded-xl py-0 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-4 font-bold text-[#953002]">
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
                    onClick={handleRetrieveApprovalLists}
                  >
                    <Search size={14} />
                    Retrieve
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            <Card className="rounded-xl py-0 shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-4 font-bold text-[#953002]">Approval Lists</CardTitle>
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
                        key={item.listId}
                        type="button"
                        onClick={() => {
                          setSelectedApprovalListId(item.listId);
                          setApplicationsRetrieved(false);
                          setApplicationDecision("Approve");
                          setRejectReason("");
                        }}
                        className={`grid w-full grid-cols-[1fr_auto] items-center border-t px-5 py-3 text-left transition-colors first:border-t-0 hover:bg-[#f6f6f6] ${
                          selectedApprovalListId === item.listId ? "bg-[#d9d9d9]" : ""
                        }`}
                      >
                        <div className="leading-tight">
                          <p className="text-sm font-medium text-gray-800">{item.listId}</p>
                          <p className="text-xs text-muted-foreground">{item.meetingId}</p>
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
                    disabled={!selectedApprovalListId}
                    onClick={handleRetrieveApplications}
                  >
                    Retrieve Applications
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl py-0 shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-4 font-bold text-[#953002]">Applications</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {applicationsRetrieved && selectedApprovalListId
                    ? `Showing ${selectedListApplications.length} applications`
                    : "Click 'Retrieve Applications' to view data"}
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {!selectedApprovalListId || !applicationsRetrieved ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center text-muted-foreground">
                    <FileText size={36} className="text-gray-300" />
                    <p>Select a list and click Retrieve Applications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedProcessedState ? (
                      <div className="rounded-md bg-[#d9d9d9] px-3 py-2 text-sm text-gray-600">
                        Processed by <span className="font-semibold">{selectedProcessedState.processedBy}</span>{" "}
                        on <span className="font-semibold">{selectedProcessedState.processedAt}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <Button type="button" variant="outline" className="h-8 px-3">
                          <Printer size={14} />
                          Print
                        </Button>
                        <Button
                          type="button"
                          className="h-8 bg-rose-600 px-3 text-white hover:bg-rose-700"
                          onClick={handleDeleteSelectedList}
                          disabled={!selectedApprovalListId}
                        >
                          <Trash2 size={14} />
                          Delete List
                        </Button>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs font-semibold text-gray-500">
                            <th className="pb-2 pr-3">App ID</th>
                            <th className="pb-2 pr-3">Name</th>
                            <th className="pb-2 pr-3">{selectedProcessedState ? "Status" : "Decision"}</th>
                            <th className="pb-2">Reason (If Reject)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedListApplications.map((application) => (
                            <tr key={application.appId} className="align-top">
                              <td className="py-3 pr-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-800">{application.appId}</span>
                                  {application.hasWarning && (
                                    <AlertCircle size={13} className="text-red-500" />
                                  )}
                                </div>
                              </td>
                              <td className="py-3 pr-3 text-gray-700">{application.name}</td>
                              <td className="py-3 pr-3">
                                {selectedProcessedState ? (
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${
                                      selectedProcessedState.decision === "Approve"
                                        ? "bg-green-600"
                                        : "bg-rose-600"
                                    }`}
                                  >
                                    {selectedProcessedState.decision === "Approve"
                                      ? "Approved"
                                      : "Rejected"}
                                  </span>
                                ) : (
                                  <Select
                                    value={applicationDecision}
                                    onValueChange={(value) =>
                                      setApplicationDecision(value as ApplicationDecision)
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
                              <td className="py-3">
                                {selectedProcessedState ? (
                                  <span
                                    className={
                                      selectedProcessedState.decision === "Reject"
                                        ? "text-rose-600"
                                        : "text-gray-500"
                                    }
                                  >
                                    {selectedProcessedState.decision === "Reject"
                                      ? selectedProcessedState.rejectReason || "Reject Reason"
                                      : "-"}
                                  </span>
                                ) : (
                                  <Input
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    disabled={applicationDecision !== "Reject"}
                                    placeholder="Reason required..."
                                    className={
                                      applicationDecision === "Reject" && rejectReason.trim() === ""
                                        ? "border-red-400 focus-visible:border-red-400 focus-visible:ring-red-200"
                                        : ""
                                    }
                                  />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {!selectedProcessedState && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          className="min-w-[106px] bg-[#953002] text-white hover:bg-[#7a2700]"
                          disabled={
                            applicationDecision === "Reject" && rejectReason.trim() === ""
                          }
                          onClick={handleOpenConfirmModal}
                        >
                          Proceed
                          <ArrowRight size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {showConfirmModal && selectedApprovalList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[760px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-4">
              <div>
                <h2 className="text-[29px] font-semibold text-[#953002]">
                  Confirm Board Decision
                </h2>
                <p className="text-sm text-muted-foreground">
                  Review summary and confirm the board meeting details.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-gray-500"
                onClick={() => setShowConfirmModal(false)}
                aria-label="Close confirmation modal"
              >
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-4 px-5 pb-5 pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-md border bg-gray-50 px-4 py-3 text-center">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-[32px] font-semibold text-gray-800">{totalCount}</p>
                </div>
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-center">
                  <p className="text-xs text-green-700">Approved</p>
                  <p className="text-[32px] font-semibold text-green-700">{approvedCount}</p>
                </div>
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center">
                  <p className="text-xs text-red-700">Rejected</p>
                  <p className="text-[32px] font-semibold text-red-700">{rejectedCount}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Scheduled Date</label>
                  <Input
                    value={formatDisplayDate(selectedApprovalList.date)}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Actual Meeting Date</label>
                  <Select
                    value={actualMeetingDateValue}
                    onValueChange={setActualMeetingDateValue}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select meeting date" />
                    </SelectTrigger>
                    <SelectContent>
                      {actualMeetingDateOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Signed List Scan</label>
                <Input
                  value={signedListScan}
                  onChange={(e) => setSignedListScan(e.target.value)}
                  placeholder=""
                />
              </div>

              <div className="space-y-1">
                <textarea
                  value={boardRemarks}
                  onChange={(e) => setBoardRemarks(e.target.value)}
                  placeholder="Any remarks from the board..."
                  className="border-input h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-gray-700"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-green-600 text-white hover:bg-green-700"
                  disabled={!actualMeetingDateValue}
                  onClick={handleProcessBoardDecision}
                >
                  <CheckSquare size={14} />
                  Process
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProcessToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border bg-white px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2 text-sm text-gray-800">
            <CheckCircle2 size={16} className="text-black" />
            <span>{toastMessage || "Board Approval List Processed Successfully"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
