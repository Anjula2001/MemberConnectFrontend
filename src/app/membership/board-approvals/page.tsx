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
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { createBoardMeeting, getBoardMeetings, updateBoardMeeting, deleteBoardMeeting, type BoardMeetingDTO } from "@/lib/api/boardMeeting";
import {
  getBoardApprovalLists,
  getBoardApprovalListByListId,
  deleteBoardApprovalList,
  getBoardApprovalListApplications,
  processBoardApprovalList,
  type ProcessBoardApprovalListPayload,
  type BoardApprovalListDTO,
} from "@/lib/api/boardApprovalLists";
import {
  getMemberApplicationById,
  type MemberApplicationDTO,
} from "@/lib/api/memberApplications";

type BoardMeeting = BoardMeetingDTO & {
  date: string;
};

type BoardTab = "meetings" | "approval-lists";

type ApplicationDecision = "Approve" | "Reject";

type ApprovalApplication = {
  id: number;
  appId: string;
  name: string;
  status: string;
  nic: string;
  hasWarning?: boolean;
};

type ProcessedListState = {
  processedBy: string;
  processedAt: string;
  actualMeetingDate: string;
  decision: ApplicationDecision;
  rejectReason: string;
  boardRemarks: string;
};

type PendingDeleteMeeting = {
  id: number;
  boardMeetingId?: string;
  date: string;
};

function formatDisplayDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${year}-${month}-${day}`;
}

export default function BoardApprovalsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BoardTab>("approval-lists");
  const [selectedDate, setSelectedDate] = useState("");
  const [createdMeetings, setCreatedMeetings] = useState<BoardMeeting[]>([]);
  const [dateFilter, setDateFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isRetrievingLists, setIsRetrievingLists] = useState(false);
  const [isRetrievingApplications, setIsRetrievingApplications] = useState(false);
  const [isDeletingSelectedList, setIsDeletingSelectedList] = useState(false);
  const [approvalLists, setApprovalLists] = useState<BoardApprovalListDTO[]>([]);
  const [selectedApprovalListId, setSelectedApprovalListId] = useState("");
  const [applicationsRetrieved, setApplicationsRetrieved] = useState(false);
  const [selectedListApplications, setSelectedListApplications] = useState<ApprovalApplication[]>([]);
  const [applicationDecision, setApplicationDecision] =
    useState<ApplicationDecision>("Approve");
  const [rejectReason, setRejectReason] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteMeetingModal, setShowDeleteMeetingModal] = useState(false);
  const [showDeleteListModal, setShowDeleteListModal] = useState(false);
  const [showEditMeetingModal, setShowEditMeetingModal] = useState(false);
  const [pendingDeleteMeeting, setPendingDeleteMeeting] =
    useState<PendingDeleteMeeting | null>(null);
  const [pendingEditMeeting, setPendingEditMeeting] = useState<BoardMeeting | null>(null);
  const [editedMeetingDate, setEditedMeetingDate] = useState("");
  const [boardRemarks, setBoardRemarks] = useState("");
  const [isEditingProcessedList, setIsEditingProcessedList] = useState(false);
  const [processedLists, setProcessedLists] = useState<Record<string, ProcessedListState>>(
    {}
  );
  const [showProcessToast, setShowProcessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showApplicationDetailsModal, setShowApplicationDetailsModal] = useState(false);
  const [selectedApplicationForDetails, setSelectedApplicationForDetails] = useState<ApprovalApplication | null>(null);
  const [selectedApplicationDetails, setSelectedApplicationDetails] = useState<ApprovalApplication | null>(null);
  const [selectedListDetails, setSelectedListDetails] = useState<BoardApprovalListDTO | null>(null);
  const [isLoadingApplicationDetails, setIsLoadingApplicationDetails] = useState(false);
  const [isUpdatingMeeting, setIsUpdatingMeeting] = useState(false);

  const mapApplicationToRow = (application: MemberApplicationDTO): ApprovalApplication => ({
    id: application.id ?? 0,
    appId: application.applicationID ?? `APP-${application.id ?? ""}`,
    name: application.fullName ?? "-",
    status: application.status ?? "NEW",
    nic: application.nicNumber ?? "-",
    hasWarning: application.rejoinFlag ?? false,
  });

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

  const selectedApprovalList = useMemo(
    () =>
      approvalLists.find((item) => item.listId === selectedApprovalListId) ?? null,
    [approvalLists, selectedApprovalListId]
  );

  const selectedProcessedState = useMemo<ProcessedListState | null>(() => {
    if (selectedApprovalListId && processedLists[selectedApprovalListId]) {
      return processedLists[selectedApprovalListId];
    }

    if (!selectedApprovalList || selectedApprovalList.status !== "PROCESSED") {
      return null;
    }

    return {
      processedBy: selectedApprovalList.processedBy ?? "Head Office User",
      processedAt: selectedApprovalList.processedAt ?? "",
      actualMeetingDate:
        selectedApprovalList.actualMeetingDate ??
        selectedApprovalList.boardMeetingDate ??
        "",
      decision:
        selectedApprovalList.decision?.toLowerCase() === "reject"
          ? "Reject"
          : "Approve",
      rejectReason: selectedApprovalList.rejectReason ?? "",
      boardRemarks: selectedApprovalList.boardRemarks ?? "",
    };
  }, [approvalLists, processedLists, selectedApprovalList, selectedApprovalListId]);

  const isSelectedListProcessed =
    selectedApprovalList?.status === "PROCESSED" || Boolean(selectedProcessedState);

  const todayDate = new Date().toISOString().split("T")[0];

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

  const handleOpenDeleteMeetingModal = (meeting: BoardMeeting) => {
    if (!meeting.id) return;

    setPendingDeleteMeeting({
      id: meeting.id,
      boardMeetingId: meeting.boardMeetingId,
      date: meeting.date,
    });
    setShowDeleteMeetingModal(true);
  };

  const handleConfirmDeleteMeeting = async () => {
    if (!pendingDeleteMeeting) return;

    try {
      setIsLoading(true);
      await deleteBoardMeeting(pendingDeleteMeeting.id);
      setCreatedMeetings((prev) =>
        prev.filter((meeting) => meeting.id !== pendingDeleteMeeting.id)
      );
      setToastMessage("Board meeting deleted successfully");
      setShowProcessToast(true);
      setShowDeleteMeetingModal(false);
      setPendingDeleteMeeting(null);
    } catch (error) {
      console.error("Error deleting board meeting:", error);
      setToastMessage("Failed to delete board meeting");
      setShowProcessToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEditMeetingModal = (meeting: BoardMeeting) => {
    if (!meeting.id) return;

    setPendingEditMeeting(meeting);
    setEditedMeetingDate(meeting.date);
    setShowEditMeetingModal(true);
  };

  const handleConfirmUpdateMeeting = async () => {
    if (!pendingEditMeeting?.id || !editedMeetingDate) return;

    const duplicateDate = createdMeetings.some(
      (meeting) => meeting.id !== pendingEditMeeting.id && meeting.date === editedMeetingDate
    );

    if (duplicateDate) {
      setToastMessage("A meeting already exists for this date");
      setShowProcessToast(true);
      return;
    }

    try {
      setIsUpdatingMeeting(true);
      const updatedMeeting = await updateBoardMeeting(pendingEditMeeting.id, {
        scheduledDate: editedMeetingDate,
      });

      setCreatedMeetings((prev) =>
        prev.map((meeting) =>
          meeting.id === pendingEditMeeting.id
            ? {
                ...meeting,
                ...updatedMeeting,
                date: updatedMeeting.scheduledDate ?? editedMeetingDate,
              }
            : meeting
        )
      );

      setToastMessage("Board meeting updated successfully");
      setShowProcessToast(true);
      setShowEditMeetingModal(false);
      setPendingEditMeeting(null);
      setEditedMeetingDate("");
    } catch (error) {
      console.error("Error updating board meeting:", error);
      setToastMessage("Failed to update board meeting");
      setShowProcessToast(true);
    } finally {
      setIsUpdatingMeeting(false);
    }
  };

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

  const actualMeetingDateOptions = useMemo(() => {
    const unique = new Map<string, { value: string; label: string }>();

    createdMeetings.forEach((item) => {
      const value = `${item.scheduledDate}|${item.id}`;
      if (!unique.has(value)) {
        unique.set(value, {
          value,
          label: `${formatDisplayDate(item.scheduledDate ?? "")} (${item.boardMeetingId ?? item.id})`,
        });
      }
    });

    return Array.from(unique.values());
  }, [createdMeetings]);

  const totalCount = selectedListApplications.length;
  const approvedCount =
    applicationDecision === "Approve" ? selectedListApplications.length : 0;
  const rejectedCount =
    applicationDecision === "Reject" ? selectedListApplications.length : 0;

  const handleRetrieveApprovalLists = async () => {
    try {
      setIsRetrievingLists(true);
      const lists = await getBoardApprovalLists();
      setApprovalLists(lists);
      setSelectedApprovalListId("");
      setApplicationsRetrieved(false);
      setSelectedListApplications([]);
    } catch (error) {
      console.error("Error retrieving board approval lists:", error);
      setToastMessage("Failed to retrieve board approval lists");
      setShowProcessToast(true);
    } finally {
      setIsRetrievingLists(false);
    }
  };

  const handleRetrieveApplications = async () => {
    if (!selectedApprovalListId) return;

    try {
      setIsRetrievingApplications(true);
      const applications = await getBoardApprovalListApplications(selectedApprovalListId);
      setSelectedListApplications(applications.map(mapApplicationToRow));
      setApplicationsRetrieved(true);
    } catch (error) {
      console.error("Error retrieving board approval list applications:", error);
      setToastMessage("Failed to retrieve applications for this list");
      setShowProcessToast(true);
    } finally {
      setIsRetrievingApplications(false);
    }
  };

  const handleDeleteSelectedList = () => {
    if (!selectedApprovalListId) return;
    setShowDeleteListModal(true);
  };

  const handleConfirmDeleteList = async () => {
    if (!selectedApprovalListId) return;

    try {
      setIsDeletingSelectedList(true);
      await deleteBoardApprovalList(selectedApprovalListId);

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
      setSelectedListApplications([]);
      setApplicationDecision("Approve");
      setRejectReason("");
      setBoardRemarks("");
      setIsEditingProcessedList(false);
      setShowConfirmModal(false);
      setShowDeleteListModal(false);
      setToastMessage("Board approval list deleted successfully");
      setShowProcessToast(true);
    } catch (error) {
      console.error("Error deleting board approval list:", error);
      setToastMessage("Failed to delete board approval list");
      setShowProcessToast(true);
    } finally {
      setIsDeletingSelectedList(false);
    }
  };

  const handleOpenConfirmModal = () => {
    if (!selectedApprovalList) return;
    setShowConfirmModal(true);
  };

  const handleEditProcessedList = () => {
    if (!selectedProcessedState) return;

    setApplicationDecision(selectedProcessedState.decision);
    setRejectReason(selectedProcessedState.rejectReason);
    setBoardRemarks(selectedProcessedState.boardRemarks);
    setIsEditingProcessedList(true);
  };

  const handleOpenApplicationDetails = async (application: ApprovalApplication) => {
    if (!selectedApprovalListId || !application.id) return;

    try {
      setIsLoadingApplicationDetails(true);
      const [listDetails, applicationDetails] = await Promise.all([
        getBoardApprovalListByListId(selectedApprovalListId),
        getMemberApplicationById(application.id),
      ]);

      setSelectedListDetails(listDetails);
      setSelectedApplicationDetails({
        id: applicationDetails.id ?? application.id,
        appId: applicationDetails.applicationID ?? application.appId,
        name: applicationDetails.fullName ?? application.name,
        status: applicationDetails.status ?? application.status,
        nic: applicationDetails.nicNumber ?? application.nic,
        hasWarning: applicationDetails.rejoinFlag ?? application.hasWarning ?? false,
      });
      setSelectedApplicationForDetails(application);
      setShowApplicationDetailsModal(true);
    } catch (error) {
      console.error("Error loading application details:", error);
      setToastMessage("Failed to load application details");
      setShowProcessToast(true);
    } finally {
      setIsLoadingApplicationDetails(false);
    }
  };

  const handleProcessBoardDecision = async () => {
    if (!selectedApprovalListId || !selectedApprovalList) return;

    try {
      const now = new Date();
      const formatted = `${now.toLocaleDateString("en-US")} ${now.toLocaleTimeString("en-US")}`;
      const payload: ProcessBoardApprovalListPayload = {
        actualMeetingDate: todayDate,
        decision: applicationDecision,
        rejectReason: applicationDecision === "Reject" ? rejectReason : undefined,
        boardRemarks,
        processedBy: "Super Admin User",
      };

      const processedList = await processBoardApprovalList(selectedApprovalListId, payload);

      setProcessedLists((prev) => ({
        ...prev,
        [selectedApprovalListId]: {
          processedBy: processedList.processedBy ?? "Head Office User",
          processedAt: formatted,
          actualMeetingDate: processedList.actualMeetingDate ?? todayDate,
          decision: applicationDecision,
          rejectReason: processedList.rejectReason ?? rejectReason,
          boardRemarks: processedList.boardRemarks ?? boardRemarks,
        },
      }));

      setApprovalLists((prev) =>
        prev.map((item) =>
          item.listId === selectedApprovalListId
            ? { ...item, status: "PROCESSED", ...processedList }
            : item
        )
      );

      setIsEditingProcessedList(false);
      setShowConfirmModal(false);
      setShowProcessToast(true);
      setToastMessage("Board approval list processed successfully");
    } catch (error) {
      console.error("Error processing board approval list:", error);
      setToastMessage("Failed to process board approval list");
      setShowProcessToast(true);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-3xl font-bold text-[#953002]">Board Administration</h1>

      <div className="inline-flex w-fit rounded-md border bg-muted p-1">
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="rounded bg-[#f7ede8] text-[#953002] hover:bg-[#f0dfd8] hover:text-[#7a2700]"
                          onClick={() => handleOpenEditMeetingModal(meeting)}
                          aria-label={`Edit meeting ${meeting.id}`}
                          disabled={!meeting.id}
                        >
                          <CalendarDays size={14} />
                        </Button>
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
                        onClick={() => handleOpenDeleteMeetingModal(meeting)}
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
                        key={item.listId ?? item.id ?? item.boardMeetingId ?? "approval-list"}
                        type="button"
                        onClick={() => {
                          if (!item.listId) return;
                          setSelectedApprovalListId(item.listId);
                          setApplicationsRetrieved(false);
                          setSelectedListApplications([]);
                          setApplicationDecision("Approve");
                          setRejectReason("");
                          setBoardRemarks("");
                          setIsEditingProcessedList(false);
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
                    disabled={!selectedApprovalListId || isRetrievingApplications}
                    onClick={handleRetrieveApplications}
                  >
                    {isRetrievingApplications ? "Retrieving..." : "Retrieve Applications"}
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
                    {selectedProcessedState && !isEditingProcessedList && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-3"
                          onClick={handleEditProcessedList}
                        >
                          Edit
                        </Button>
                      </div>
                    )}
                    {(!selectedProcessedState || isEditingProcessedList) && (
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
                            <th className="pb-2 pr-3">Decision</th>
                            <th className="pb-2 pr-3">Reason (If Reject)</th>
                            <th className="pb-2 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedListApplications.map((application) => (
                            <tr key={application.appId} className="align-top">
                              <td className="py-3 pr-3">
                                <button
                                  type="button"
                                  className="flex items-center gap-2 text-left"
                                  onClick={() => {
                                    if (!application.id) return;
                                    router.push(
                                      `/membership/new-registrations?applicationId=${application.id}&mode=view`
                                    );
                                  }}
                                >
                                  <span className="font-medium text-gray-800 hover:underline">
                                    {application.appId}
                                  </span>
                                  {application.hasWarning && (
                                    <AlertCircle size={13} className="text-red-500" />
                                  )}
                                </button>
                              </td>
                              <td className="py-3 pr-3 text-gray-700">{application.name}</td>
                              <td className="py-3 pr-3">
                                {selectedProcessedState && !isEditingProcessedList ? (
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
                              <td className="py-3 pr-3">
                                {selectedProcessedState && !isEditingProcessedList ? (
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
                              <td className="py-3 text-center">
                                {selectedProcessedState && !isEditingProcessedList ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-[#953002] hover:bg-[#f7ede8]"
                                    onClick={() => handleOpenApplicationDetails(application)}
                                  >
                                    View
                                  </Button>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {(!selectedProcessedState || isEditingProcessedList) && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          className="min-w-[106px] bg-[#953002] text-white hover:bg-[#7a2700]"
                          disabled={
                            applicationDecision === "Reject" && rejectReason.trim() === ""
                          }
                          onClick={handleOpenConfirmModal}
                        >
                          {isEditingProcessedList ? "Update" : "Proceed"}
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

      {showDeleteMeetingModal && pendingDeleteMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[460px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <h2 className="text-[29px] font-semibold text-red-600">
                  Delete Board Meeting
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {(pendingDeleteMeeting.boardMeetingId || pendingDeleteMeeting.id)} - {formatDisplayDate(pendingDeleteMeeting.date)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-gray-500"
                onClick={() => {
                  setShowDeleteMeetingModal(false);
                  setPendingDeleteMeeting(null);
                }}
                aria-label="Close delete modal"
                disabled={isLoading}
              >
                <X size={18} />
              </Button>
            </div>

            <div className="px-5 pb-5 pt-4">
              <p className="text-base leading-relaxed text-gray-600">
                Are you sure you want to permanently delete this board meeting?
              </p>

              <div className="mt-7 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-gray-700"
                  onClick={() => {
                    setShowDeleteMeetingModal(false);
                    setPendingDeleteMeeting(null);
                  }}
                  disabled={isLoading}
                >
                  No, Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 text-white hover:bg-red-700"
                  disabled={isLoading}
                  onClick={handleConfirmDeleteMeeting}
                >
                  {isLoading ? "Deleting..." : "Yes, Delete"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteListModal && selectedApprovalList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[460px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <h2 className="text-[29px] font-semibold text-red-600">
                  Delete Approval List
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedApprovalList.listId} - {formatDisplayDate(selectedApprovalList.boardMeetingDate ?? "")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-gray-500"
                onClick={() => setShowDeleteListModal(false)}
                aria-label="Close delete modal"
                disabled={isDeletingSelectedList}
              >
                <X size={18} />
              </Button>
            </div>

            <div className="px-5 pb-5 pt-4">
              <p className="text-base leading-relaxed text-gray-600">
                Are you sure you want to permanently delete this board approval list? All applications will be reverted to their previous status.
              </p>

              <div className="mt-7 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-gray-700"
                  onClick={() => setShowDeleteListModal(false)}
                  disabled={isDeletingSelectedList}
                >
                  No, Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 text-white hover:bg-red-700"
                  disabled={isDeletingSelectedList}
                  onClick={handleConfirmDeleteList}
                >
                  {isDeletingSelectedList ? "Deleting..." : "Yes, Delete"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditMeetingModal && pendingEditMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[460px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <h2 className="text-[29px] font-semibold text-[#953002]">
                  Edit Board Meeting
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {(pendingEditMeeting.boardMeetingId || pendingEditMeeting.id)} - {formatDisplayDate(pendingEditMeeting.date)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-gray-500"
                onClick={() => {
                  setShowEditMeetingModal(false);
                  setPendingEditMeeting(null);
                  setEditedMeetingDate("");
                }}
                aria-label="Close edit modal"
                disabled={isUpdatingMeeting}
              >
                <X size={18} />
              </Button>
            </div>

            <div className="px-5 pb-5 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Scheduled Date</label>
                <div className="relative">
                  <CalendarDays
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    type="date"
                    value={editedMeetingDate}
                    onChange={(e) => setEditedMeetingDate(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="mt-7 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-gray-700"
                  onClick={() => {
                    setShowEditMeetingModal(false);
                    setPendingEditMeeting(null);
                    setEditedMeetingDate("");
                  }}
                  disabled={isUpdatingMeeting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-[#953002] text-white hover:bg-[#7a2700]"
                  disabled={isUpdatingMeeting || !editedMeetingDate}
                  onClick={handleConfirmUpdateMeeting}
                >
                  {isUpdatingMeeting ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          </div>
        </div>
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
                    value={formatDisplayDate(selectedApprovalList.boardMeetingDate ?? "")}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Actual Meeting Date</label>
                  <Input value={todayDate} readOnly className="bg-gray-50" />
                </div>
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
                  onClick={handleProcessBoardDecision}
                >
                  <CheckSquare size={14} />
                  {isEditingProcessedList ? "Update" : "Process"}
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

      {showApplicationDetailsModal && selectedApplicationForDetails && selectedProcessedState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="flex max-h-[80vh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border bg-white shadow-xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-xl font-bold text-[#953002]">
                  Application Decision
                </h2>
                <p className="mt-1 text-xs text-gray-600">
                  {selectedApplicationForDetails.appId}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowApplicationDetailsModal(false)}
                aria-label="Close details modal"
              >
                <X size={20} />
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {isLoadingApplicationDetails ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed bg-gray-50 text-sm text-muted-foreground">
                  Loading latest details...
                </div>
              ) : (
                <>
              {/* Applicant Information Section */}
              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Applicant Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Name</p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {selectedApplicationDetails?.name ?? selectedApplicationForDetails.name}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">NIC Number</p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {selectedApplicationDetails?.nic ?? selectedApplicationForDetails.nic}
                    </p>
                  </div>
                </div>
              </div>

              {/* Meeting Information Section */}
              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Meeting Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Scheduled Date</p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {formatDisplayDate(selectedListDetails?.boardMeetingDate ?? selectedApprovalList?.boardMeetingDate ?? "")}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Actual Date</p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {selectedListDetails?.actualMeetingDate ?? selectedProcessedState.actualMeetingDate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Processing Details Section */}
              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Processing Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Processed By</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">
                        {selectedListDetails?.processedBy ?? selectedProcessedState.processedBy}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Processed At</p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {selectedListDetails?.processedAt ?? selectedProcessedState.processedAt}
                    </p>
                  </div>
                </div>
              </div>

              {/* Decision Section */}
              <div className="rounded-lg border border-[#f0d9cf] bg-gradient-to-r from-[#f7ede8] to-[#faf5f2] p-3.5">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-600">Decision</h3>
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex rounded-full px-3 py-1.5 text-sm font-bold text-white ${
                      (selectedListDetails?.decision ?? selectedProcessedState.decision) === "Approve"
                        ? "bg-green-600"
                        : "bg-rose-600"
                    }`}
                  >
                    {(selectedListDetails?.decision ?? selectedProcessedState.decision) === "Approve"
                      ? "✓ Approved"
                      : "✕ Rejected"}
                  </span>
                </div>
              </div>

              {/* Additional Information */}
              {((selectedListDetails?.decision ?? selectedProcessedState.decision) === "Reject" || selectedListDetails?.boardRemarks || selectedProcessedState.boardRemarks) && (
                <div className="space-y-3">
                  {(selectedListDetails?.decision ?? selectedProcessedState.decision) === "Reject" && (selectedListDetails?.rejectReason ?? selectedProcessedState.rejectReason) && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-red-700">Reject Reason</p>
                      <p className="mt-1 text-sm font-medium text-red-800">
                        {selectedListDetails?.rejectReason ?? selectedProcessedState.rejectReason}
                      </p>
                    </div>
                  )}
                  {(selectedListDetails?.boardRemarks ?? selectedProcessedState.boardRemarks) && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Board Remarks</p>
                      <p className="mt-1 text-sm font-medium text-blue-800">
                        {selectedListDetails?.boardRemarks ?? selectedProcessedState.boardRemarks}
                      </p>
                    </div>
                  )}
                </div>
              )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t bg-gray-50 px-5 py-3.5">
              <Button
                type="button"
                variant="ghost"
                className="text-gray-700 hover:bg-gray-200"
                onClick={() => setShowApplicationDetailsModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
