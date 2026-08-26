"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  BOARD_GOVERNANCE_ROLES,
  BOARD_MEETING_VIEW_ROLES,
  DELETE_RIGHTS_ROLES,
  PROFILE_CHANGE_APPROVAL_LIST_PROCESS_ROLES,
  hasRole,
} from "@/lib/permissions";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
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
import {
  TablePagination,
  clampPage,
  pageSlice,
} from "@/src/components/ui/table-pagination";
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
  getNameChangeRequestsByListId,
  getNomineeChangeRequestsByListId,
  processBoardApprovalList,
  type ProcessBoardApprovalListPayload,
  type BoardApprovalListDTO,
} from "@/lib/api/boardApprovalLists";
import {
  getTerminationApprovalLists,
  type TerminationApprovalListDTO,
} from "@/lib/api/terminationApprovalLists";
import {
  getMemberApplicationById,
  updateMemberApplicationPartial,
  type MemberApplicationDTO,
} from "@/lib/api/memberApplications";
import { createMember, type MemberDTO } from "@/lib/api/member";

type BoardMeeting = BoardMeetingDTO & {
  date: string;
};

type BoardTab = "meetings" | "approval-lists";

type ApplicationDecision = "Approve" | "Reject";

type ApprovalListKind = "membership" | "termination";

/**
 * What the list actually holds. Separate from `kind`, which drives behaviour (which
 * endpoint to retrieve from) and must stay "membership" for every BAL - a name change
 * list is still a membership-side board approval list.
 */
type ApprovalListContent = "applications" | "name-change" | "nominee-change" | "termination";

type ApprovalListRow = {
  kind: ApprovalListKind;
  /** Drives the badge and the count's noun; derived from the list's contents. */
  content: ApprovalListContent;
  listId: string;
  status?: string;
  boardMeetingId?: number;
  boardMeetingDate?: string;
  createdAt?: string;
  itemCount: number;
};

const CONTENT_BADGES: Record<
  ApprovalListContent,
  { label: string; className: string; noun: string }
> = {
  applications: { label: "Membership", className: "bg-blue-50 text-blue-700", noun: "applications" },
  "name-change": { label: "Name Change", className: "bg-violet-50 text-violet-700", noun: "requests" },
  "nominee-change": { label: "Nominee Change", className: "bg-emerald-50 text-emerald-700", noun: "requests" },
  termination: { label: "Termination", className: "bg-[#f7ede8] text-[#953002]", noun: "requests" },
};

type ApprovalApplication = {
  id: number;
  appId: string;
  name: string;
  status: string;
  nic: string;
  hasWarning?: boolean;
  boardDecisionReason?: string;
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
  const { user, isLoading: isAuthLoading } = useAuth();
  const canDelete = hasRole(user?.role, DELETE_RIGHTS_ROLES);
  const canViewBoardMeetings = hasRole(user?.role, BOARD_MEETING_VIEW_ROLES);

  // MMC12 / MMC25: recording what the board decided is the Board Secretary's. Head
  // Office builds the list, prints it and reads it back afterwards — it keeps all of
  // that — but Proceed and Process are hidden for it rather than shown and refused.
  const canProcess = hasRole(user?.role, PROFILE_CHANGE_APPROVAL_LIST_PROCESS_ROLES);

  // MMC11 and MMC24 are separate reports from the Application List, because a name or
  // nominee change is judged as a comparison and needs its current value printed too.
  const printPathFor = (listId: string) => {
    const base = "/membership/board-approvals/print";
    if (selectedListNameChangeRequests.length > 0) return base + "/name/" + encodeURIComponent(listId);
    if (selectedListNomineeChangeRequests.length > 0) return base + "/nominee/" + encodeURIComponent(listId);
    return base + "/" + encodeURIComponent(listId);
  };
  const [activeTab, setActiveTab] = useState<BoardTab>("approval-lists");
  const [selectedDate, setSelectedDate] = useState("");
  const [createdMeetings, setCreatedMeetings] = useState<BoardMeeting[]>([]);
  const [dateFilter, setDateFilter] = useState("all");
  // Bounds for the "Date Period" option. An empty side is open-ended, so a From
  // with no To reads as "everything since that day", and a To with no From as
  // "everything up to it".
  const [listFromDate, setListFromDate] = useState("");
  const [listToDate, setListToDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isRetrievingLists, setIsRetrievingLists] = useState(false);
  const [isRetrievingApplications, setIsRetrievingApplications] = useState(false);
  const [isDeletingSelectedList, setIsDeletingSelectedList] = useState(false);
  const [approvalLists, setApprovalLists] = useState<BoardApprovalListDTO[]>([]);
  const [terminationApprovalLists, setTerminationApprovalLists] = useState<
    TerminationApprovalListDTO[]
  >([]);
  const [selectedApprovalListId, setSelectedApprovalListId] = useState("");
  const [selectedListKind, setSelectedListKind] = useState<ApprovalListKind>("membership");
  const [applicationsRetrieved, setApplicationsRetrieved] = useState(false);
  const [selectedListApplications, setSelectedListApplications] = useState<ApprovalApplication[]>([]);
  const [selectedListNameChangeRequests, setSelectedListNameChangeRequests] = useState<any[]>([]);
  const [selectedListNomineeChangeRequests, setSelectedListNomineeChangeRequests] = useState<any[]>([]);
  const [selectedListNameChangeDecisions, setSelectedListNameChangeDecisions] = useState<Record<string, { decision: ApplicationDecision; rejectReason: string }>>({});
  const [selectedListNomineeChangeDecisions, setSelectedListNomineeChangeDecisions] = useState<Record<string, { decision: ApplicationDecision; rejectReason: string }>>({});
  const [applicationDecisions, setApplicationDecisions] = useState<Record<number, { decision: ApplicationDecision; rejectReason: string }>>({});
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
  // Scan of the signed board approval sheet, attached when processing the list.
  const [approvalSheetFile, setApprovalSheetFile] = useState<File | null>(null);

  const mapApplicationToRow = (application: MemberApplicationDTO): ApprovalApplication => ({
    id: application.id ?? 0,
    appId: application.applicationID ?? `APP-${application.id ?? ""}`,
    name: application.fullName ?? "-",
    status: application.status ?? "NEW",
    nic: application.nicNumber ?? "-",
    hasWarning: application.rejoinFlag ?? false,
    boardDecisionReason: application.boardDecisionReason ?? "",
  });

  // Fetch board meetings from database.
  // The BOARD_GOVERNANCE_ROLES guard further down is a render-time early return,
  // which does not stop this effect from committing — so a District Office user
  // landing here used to get both the Access Restricted screen and a "Failed to
  // load board meetings" toast off the resulting 403. isAuthLoading covers the
  // first render, where AuthProvider has not yet hydrated `user` from localStorage.
  useEffect(() => {
    if (isAuthLoading) return;
    if (!canViewBoardMeetings) {
      setIsFetching(false);
      return;
    }

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
    // If a listId query param is present, auto-open it after lists are loaded
    const params = new URLSearchParams(window.location.search);
    const listIdParam = params.get('listId');
    if (listIdParam) {
      (async () => {
        try {
          const lists = await getBoardApprovalLists();
          setApprovalLists(lists);
          if (lists && lists.length > 0) {
            const found = lists.find(l => l.listId === listIdParam);
            if (found) {
              setSelectedApprovalListId(found.listId ?? '');
            }
          }
        } catch (e) {
          // ignore
        }
      })();
    }
  }, [isAuthLoading, canViewBoardMeetings]);

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

  const todayDate = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
  })();

  const handleAddMeeting = async () => {
    if (!selectedDate) return;

    // A meeting is scheduled, so it cannot be scheduled for a day that has passed.
    // Checked here as well as through the picker's min, because a date input still
    // accepts a typed value that ignores min.
    if (selectedDate < todayDate) {
      setToastMessage("A board meeting cannot be scheduled for a past date");
      setShowProcessToast(true);
      return;
    }

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

  const combinedApprovalLists = useMemo<ApprovalListRow[]>(() => {
    const membershipRows: ApprovalListRow[] = approvalLists
      .filter((item) => Boolean(item.listId))
      .map((item) => {
        // A list holds one kind of record - MMC08 and MMC21 only allow a homogeneous
        // selection - so the first non-empty collection identifies it. Counting the
        // matching collection also fixes name and nominee lists showing no count at
        // all, because only applicationIds was ever counted.
        const names = item.nameChangeRequestIds?.length ?? 0;
        const nominees = item.nomineeChangeRequestIds?.length ?? 0;
        // applicationCount comes from the server; applicationIds is only populated
        // when a single list is opened, so counting it here would read 0 for every row.
        const applications = item.applicationCount ?? item.applicationIds?.length ?? 0;

        const content: ApprovalListContent =
          names > 0 ? "name-change" : nominees > 0 ? "nominee-change" : "applications";

        return {
          kind: "membership" as const,
          content,
          listId: item.listId as string,
          status: item.status,
          boardMeetingId: item.boardMeetingId,
          boardMeetingDate: item.boardMeetingDate,
          createdAt: item.createdAt,
          itemCount: names > 0 ? names : nominees > 0 ? nominees : applications,
        };
      });

    const terminationRows: ApprovalListRow[] = terminationApprovalLists
      .filter((item) => Boolean(item.listId))
      .map((item) => ({
        kind: "termination" as const,
        content: "termination" as const,
        listId: item.listId as string,
        status: item.status,
        boardMeetingId: item.boardMeetingId,
        boardMeetingDate: item.boardMeetingDate,
        createdAt: item.createdAt,
        itemCount: item.requestCount ?? item.requestNos?.length ?? 0,
      }));

    return [...membershipRows, ...terminationRows].sort((left, right) => {
      const leftDate = left.createdAt ?? left.boardMeetingDate ?? "";
      const rightDate = right.createdAt ?? right.boardMeetingDate ?? "";
      return rightDate.localeCompare(leftDate);
    });
  }, [approvalLists, terminationApprovalLists]);

  /**
   * The Board Meeting date period the dropdown currently describes, in the form the
   * server expects. "All" sends neither bound.
   *
   * Formatted from the local calendar fields rather than toISOString(): this runs in
   * UTC+5:30, where local midnight on the 1st is the previous month in UTC, so
   * toISOString() would silently send the wrong month boundary.
   *
   * Every option now measures the same thing - boardMeetingDate. This Month and Last
   * Month previously measured createdAt while Date Period measured the meeting date,
   * so one dropdown answered two different questions depending on which row you picked.
   */
  const meetingDateRange = useMemo((): { from?: string; to?: string } => {
    const iso = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`;

    const now = new Date();

    if (dateFilter === "thisMonth") {
      return {
        from: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    }

    if (dateFilter === "lastMonth") {
      return {
        from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: iso(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    }

    if (dateFilter === "datePeriod") {
      return { from: listFromDate || undefined, to: listToDate || undefined };
    }

    return {};
  }, [dateFilter, listFromDate, listToDate]);

  // The rows are already narrowed by the query that fetched them, so there is nothing
  // left to filter here. Retrieve now genuinely retrieves a period rather than
  // reloading the whole table and discarding most of it in the browser.
  const filteredApprovalLists = combinedApprovalLists;

  const [listPage, setListPage] = useState(1);

  // Narrowing the filter, or retrieving a fresh set, can leave the stored page
  // beyond the end of the new result - page 3 of a list that now has four rows
  // renders as empty rather than as "no matches". Going back to the first page
  // whenever the criteria change is what keeps the panel showing the top of the
  // result the user just asked for.
  useEffect(() => {
    setListPage(1);
  }, [combinedApprovalLists]);

  const safeListPage = clampPage(listPage, filteredApprovalLists.length);
  const pagedApprovalLists = useMemo(
    () => pageSlice(filteredApprovalLists, listPage),
    [filteredApprovalLists, listPage]
  );

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
  const approvedCount = selectedListApplications.filter(app => (applicationDecisions[app.id]?.decision || "Approve") === "Approve").length;
  const rejectedCount = selectedListApplications.filter(app => (applicationDecisions[app.id]?.decision || "Approve") === "Reject").length;

  const handleRetrieveApprovalLists = async () => {
    try {
      setIsRetrievingLists(true);
      const [membershipResult, terminationResult] = await Promise.allSettled([
        getBoardApprovalLists(meetingDateRange),
        getTerminationApprovalLists(meetingDateRange),
      ]);

      if (membershipResult.status === "fulfilled") {
        setApprovalLists(membershipResult.value);
      } else {
        console.error("Error retrieving board approval lists:", membershipResult.reason);
      }

      if (terminationResult.status === "fulfilled") {
        setTerminationApprovalLists(terminationResult.value);
      } else {
        console.error(
          "Error retrieving termination approval lists:",
          terminationResult.reason
        );
      }

      const membershipFailed = membershipResult.status === "rejected";
      const terminationFailed = terminationResult.status === "rejected";
      if (membershipFailed || terminationFailed) {
        setToastMessage(
          membershipFailed && terminationFailed
            ? "Failed to retrieve approval lists"
            : membershipFailed
              ? "Failed to retrieve membership approval lists"
              : "Failed to retrieve termination approval lists"
        );
        setShowProcessToast(true);
      }

      setSelectedApprovalListId("");
      setSelectedListKind("membership");
      setApplicationsRetrieved(false);
      setSelectedListApplications([]);
      setSelectedListNameChangeRequests([]);
      setSelectedListNomineeChangeRequests([]);
      setSelectedListNameChangeDecisions({});
      setSelectedListNomineeChangeDecisions({});
      setApplicationDecisions({});
    } finally {
      setIsRetrievingLists(false);
    }
  };

  const handleRetrieveApplications = async () => {
    if (!selectedApprovalListId || selectedListKind !== "membership") return;

    try {
      setIsRetrievingApplications(true);
      const applications = await getBoardApprovalListApplications(selectedApprovalListId);
      setSelectedListApplications(applications.map(mapApplicationToRow));

      // Fetch name change requests for this list (if any)
      try {
        const ncrs = await getNameChangeRequestsByListId(selectedApprovalListId);
        setSelectedListNameChangeRequests(ncrs || []);
        setSelectedListNameChangeDecisions(
          (ncrs || []).reduce((acc, ncr) => {
            const key = String(ncr.nameChangeRequestID ?? "");
            if (!key) return acc;
            acc[key] = {
              decision: String(ncr.newStatus || ncr.status || "").trim().toUpperCase() === "REJECTED" ? "Reject" : "Approve",
              rejectReason: String(ncr.boardDecisionReason || ""),
            };
            return acc;
          }, {} as Record<string, { decision: ApplicationDecision; rejectReason: string }>)
        );
      } catch (err) {
        setSelectedListNameChangeRequests([]);
        setSelectedListNameChangeDecisions({});
      }

      // Fetch nominee change requests for this list (if any)
      try {
        const nmrs = await getNomineeChangeRequestsByListId(selectedApprovalListId);
        setSelectedListNomineeChangeRequests(nmrs || []);
        setSelectedListNomineeChangeDecisions(
          (nmrs || []).reduce((acc, nmr) => {
            const key = String(nmr.id ?? nmr.nomineeChangeID ?? nmr.nommineChangeId ?? "");
            if (!key) return acc;
            acc[key] = {
              decision: String(nmr.newStatus || nmr.status || "").trim().toUpperCase() === "REJECTED" ? "Reject" : "Approve",
              rejectReason: String(nmr.boardDecisionReason || ""),
            };
            return acc;
          }, {} as Record<string, { decision: ApplicationDecision; rejectReason: string }>)
        );
      } catch (err) {
        setSelectedListNomineeChangeRequests([]);
        setSelectedListNomineeChangeDecisions({});
      }
      
      const initialDecisions: Record<number, { decision: ApplicationDecision; rejectReason: string }> = {};
      applications.forEach(app => {
        initialDecisions[app.id!] = {
          decision: app.status === "REJECTED" ? "Reject" : "Approve",
          rejectReason: app.boardDecisionReason || ""
        };
      });
      setApplicationDecisions(initialDecisions);
      
      setApplicationsRetrieved(true);
    } catch (error) {
      console.error("Error retrieving board approval list applications:", error);
      setToastMessage("Failed to retrieve applications for this list");
      setShowProcessToast(true);
    } finally {
      setIsRetrievingApplications(false);
    }
  };

  const handleOpenTerminationList = (listId: string) => {
    if (!listId) return;
    router.push(
      `/membership/termination/approval-lists?listId=${encodeURIComponent(listId)}`
    );
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
      setApplicationDecisions({});
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
      // The list-wide decision applies to membership applications only. Deriving it
      // from an empty set made a change-request-only list resolve to "Reject" with no
      // reason, which the backend refused — such a list could never be processed.
      const decisionsArray = Object.values(applicationDecisions).map(d => d.decision);
      const listDecision: ApplicationDecision | undefined =
        decisionsArray.length === 0
          ? undefined
          : decisionsArray.includes("Approve")
            ? "Approve"
            : "Reject";

      // MMC12 / MMC25: each change request carries its own decision and reason.
      const nameChangeDecisions = selectedListNameChangeRequests
        .map((ncr) => {
          const key = String(ncr.nameChangeRequestID ?? "");
          const state = selectedListNameChangeDecisions[key];
          return key
            ? {
                requestId: Number(key),
                decision: state?.decision ?? "Approve",
                rejectReason: state?.rejectReason ?? "",
              }
            : null;
        })
        .filter((d): d is { requestId: number; decision: ApplicationDecision; rejectReason: string } => d !== null);

      const nomineeChangeDecisions = selectedListNomineeChangeRequests
        .map((nmr) => {
          const key = String(nmr.id ?? nmr.nomineeChangeID ?? nmr.nommineChangeId ?? "");
          const state = selectedListNomineeChangeDecisions[key];
          return key
            ? {
                requestId: Number(key),
                decision: state?.decision ?? "Approve",
                rejectReason: state?.rejectReason ?? "",
              }
            : null;
        })
        .filter((d): d is { requestId: number; decision: ApplicationDecision; rejectReason: string } => d !== null);

      // The reason is mandatory on any rejected row, so catch it before the round trip.
      const missingReason = [...nameChangeDecisions, ...nomineeChangeDecisions]
        .find((d) => d.decision === "Reject" && !d.rejectReason.trim());
      if (missingReason) {
        setToastMessage("Enter a reject reason for every rejected request before proceeding.");
        setShowProcessToast(true);
        return;
      }

      // Upload the scanned, signed approval sheet first (if attached) so the stored
      // key can be saved alongside the decision. A failed upload must not lose the
      // board's decision, so fall back to recording the filename.
      let approvedListDocument: string | undefined;
      if (approvalSheetFile) {
        try {
          const formData = new FormData();
          formData.append("file", approvalSheetFile);
          const uploadRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"}/api/file/upload`,
            { method: "POST", body: formData }
          );
          approvedListDocument = uploadRes.ok
            ? await uploadRes.text()
            : approvalSheetFile.name;
        } catch (uploadError) {
          console.warn("Approval sheet upload failed, storing filename:", uploadError);
          approvedListDocument = approvalSheetFile.name;
        }
      }

      const payload: ProcessBoardApprovalListPayload = {
        actualMeetingDate: todayDate,
        ...(listDecision ? { decision: listDecision } : {}),
        boardRemarks,
        processedBy: "Super Admin User",
        ...(approvedListDocument ? { approvedListDocument } : {}),
        ...(nameChangeDecisions.length > 0 ? { nameChangeDecisions } : {}),
        ...(nomineeChangeDecisions.length > 0 ? { nomineeChangeDecisions } : {}),
      };

      const processedList = await processBoardApprovalList(selectedApprovalListId, payload);

      let approveToastMessage: string | null = null;
      const memberCreationErrors: string[] = [];
      let newMembersCount = 0;

      await Promise.allSettled(
        selectedListApplications.map(async (app) => {
          const appDecisionState = applicationDecisions[app.id];
          const appDecision = appDecisionState?.decision || "Approve";

          if (appDecision === "Approve") {
            try {
              const appDetails: MemberApplicationDTO = await getMemberApplicationById(app.id);

              const memberPayload: MemberDTO = {
                status: "INACTIVE",
                applicationId: appDetails.id,
                submissionLocation: appDetails.submissionLocation,
                nic: appDetails.nicNumber,
                title: appDetails.title,
                fullName: appDetails.fullName,
                nameAsInPayroll: appDetails.nameAsInPayroll,
                nameWithInitials: appDetails.nameWithInitials,
                dateOfBirth: appDetails.dateOfBirth,
                gender: appDetails.gender as MemberDTO["gender"],
                preferredLanguage: appDetails.preferredLanguage as MemberDTO["preferredLanguage"],
                permanentPrivateAddress: appDetails.permanentPrivateAddress,
                privateTelephone: appDetails.privateTelephone,
                mobileNumber: appDetails.mobileNumber,
                emailAddress: appDetails.emailAddress,
                computerNoInPayslip: appDetails.computerNoInPayslip,
                salaryPayingOffice: appDetails.salaryPayingOffice,
                workingLocationType: appDetails.workingLocationType,
                designation: appDetails.designation,
                natureOfOccupation: appDetails.natureOfOccupation as MemberDTO["natureOfOccupation"],
                educationalDistrict: appDetails.educationalDistrict,
                educationalZone: appDetails.educationalZone,
                workingLocation: appDetails.workingLocation,
                workingLocationAddress: appDetails.workingLocationAddress,
                officeTelephone: appDetails.officeTelephone,
                nomineeFullName: appDetails.nomineeFullName,
                nomineeRelationship: appDetails.nomineeRelationship,
                nomineeAddress: appDetails.nomineeAddress,
                identification: appDetails.identification as MemberDTO["identification"],
                identificationNumber: appDetails.identificationNumber,
                identificationDetails: appDetails.identificationDetails,
                membershipStartDate: appDetails.applicationDate ?? todayDate,
              };

              await createMember(memberPayload);
              // APPROVED, not INACTIVE — the application succeeded and became a member.
              // INACTIVE means "an authorised user deactivated it", which is a different
              // thing; reusing it here made the two indistinguishable in the list.
              await updateMemberApplicationPartial(app.id, { status: "APPROVED" });
              newMembersCount++;
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Unknown error";
              memberCreationErrors.push(`${app.appId}: ${msg}`);
            }
          } else {
            try {
              await updateMemberApplicationPartial(app.id, {
                status: "REJECTED",
                boardDecisionReason: appDecisionState?.rejectReason || ""
              });
            } catch (err: unknown) {
              console.error("Failed to reject application", app.id, err);
            }
          }
        })
      );

      if (memberCreationErrors.length > 0) {
        console.warn("Some members could not be created:", memberCreationErrors);
        approveToastMessage = `List processed but ${memberCreationErrors.length} member(s) could not be created: ${memberCreationErrors.join("; ")}`;
      } else {
        approveToastMessage = `Board approval list processed. ${newMembersCount} member(s) approved and created with INACTIVE status.`;
      }

      setProcessedLists((prev) => ({
        ...prev,
        [selectedApprovalListId]: {
          processedBy: processedList.processedBy ?? "Head Office User",
          processedAt: formatted,
          actualMeetingDate: processedList.actualMeetingDate ?? todayDate,
          decision: listDecision ?? "Approve",
          rejectReason: "",
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
      setApprovalSheetFile(null);
      setShowProcessToast(true);
      setToastMessage(
        approveToastMessage ?? "Board approval list processed successfully."
      );

    } catch (error) {
      console.error("Error processing board approval list:", error);
      setToastMessage("Failed to process board approval list");
      setShowProcessToast(true);
    }
  };

  // Allow-list (not a blocklist) so any role not explicitly granted board governance
  // access — District Office, but also Accounts/Scholarship Officer/Death Donation
  // Officer — is denied by default rather than slipping through.
  if (user && !hasRole(user.role, BOARD_GOVERNANCE_ROLES)) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-800">Access Restricted</h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500">
          Board Approvals and Meeting Management are restricted to Head Office and Board Secretariat personnel.
        </p>
        <button
          onClick={() => router.push("/membership/new-registrations")}
          className="mt-6 flex items-center gap-2 rounded-lg bg-[#9e3600] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#b33f00]"
        >
          Go to New Registrations
        </button>
      </div>
    );
  }

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
        /* items-start: without it the grid stretches both cards to the taller one, so
           the Create panel grew a large empty area whenever the meetings list was long. */
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <Card className="rounded-xl py-0 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-lg font-bold text-[#953002]">
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
                    min={todayDate}
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
              <CardTitle className="text-lg font-bold text-[#953002]">
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
                /*
                 * Fixed height with the list scrolling inside, so the card stays the same
                 * size whatever it holds. Left to grow, a busy year of meetings stretched
                 * this card far past the Create panel beside it and pushed everything
                 * below off screen. ~5 rows is what fits before scrolling starts.
                 *
                 * pr-1 keeps the scrollbar off the row borders.
                 */
                <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                  {createdMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex shrink-0 items-center justify-between rounded-lg border px-4 py-3"
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

                      {canDelete && (
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
                      )}
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
              <CardTitle className="text-lg font-bold text-[#953002]">
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
                    onClick={handleRetrieveApprovalLists}
                  >
                    <Search size={14} />
                    Retrieve
                  </Button>
                </div>
              </div>

              {dateFilter === "datePeriod" && (
                <div className="mt-3 max-w-md">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="board-list-from-date"
                        className="text-xs font-medium text-gray-600"
                      >
                        From Date
                      </label>
                      <Input
                        id="board-list-from-date"
                        type="date"
                        value={listFromDate}
                        onChange={(event) => {
                          const nextFrom = event.target.value;
                          setListFromDate(nextFrom);
                          // The To picker below only offers days from From onward,
                          // so a To carried over from an earlier range can be left
                          // outside what that picker can still reach. Clearing it
                          // keeps the visible pair and the filtered result in
                          // agreement.
                          if (nextFrom && listToDate && listToDate < nextFrom) {
                            setListToDate("");
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="board-list-to-date"
                        className="text-xs font-medium text-gray-600"
                      >
                        To Date
                      </label>
                      <Input
                        id="board-list-to-date"
                        type="date"
                        value={listToDate}
                        // Greys out every day before From in the native picker, so
                        // the period can only ever run forwards from the day chosen
                        // there.
                        min={listFromDate || undefined}
                        onChange={(event) => setListToDate(event.target.value)}
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
                <CardTitle className="text-lg font-bold text-[#953002]">Approval Lists</CardTitle>
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
                        key={`${item.kind}-${item.listId}`}
                        type="button"
                        onClick={() => {
                          setSelectedApprovalListId(item.listId);
                          setSelectedListKind(item.kind);
                          setApplicationsRetrieved(false);
                          setSelectedListApplications([]);
                          setApplicationDecisions({});
                          setBoardRemarks("");
                          setIsEditingProcessedList(false);
                        }}
                        className={`grid w-full grid-cols-[1fr_auto] items-center border-t px-5 py-3 text-left transition-colors first:border-t-0 hover:bg-[#f6f6f6] ${
                          selectedApprovalListId === item.listId ? "bg-[#d9d9d9]" : ""
                        }`}
                      >
                        <div className="leading-tight">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-gray-800">{item.listId}</p>
                            <span
                              className={"rounded-full px-2 py-0.5 text-[10px] font-semibold " + CONTENT_BADGES[item.content].className}
                            >
                              {CONTENT_BADGES[item.content].label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.boardMeetingDate ?? "-"}
                            {item.boardMeetingId ? ` (${item.boardMeetingId})` : ""}
                            {item.itemCount
                              ? " · " + item.itemCount + " " + CONTENT_BADGES[item.content].noun
                              : ""}
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
                    disabled={!selectedApprovalListId || isRetrievingApplications}
                    onClick={() =>
                      selectedListKind === "termination"
                        ? handleOpenTerminationList(selectedApprovalListId)
                        : handleRetrieveApplications()
                    }
                  >
                    {selectedListKind === "termination"
                      ? "Open Termination Requests"
                      : isRetrievingApplications
                        ? "Retrieving..."
                        : "Retrieve Applications"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* min-w-0: the table below carries min-w-[560px], and without this the
                grid column would grow to fit it instead of the table scrolling inside. */}
            <Card className="min-w-0 rounded-xl py-0 shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-lg font-bold text-[#953002]">
                  {selectedListKind === "termination" && selectedApprovalListId
                    ? "Termination Requests"
                    : "Applications"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedListKind === "termination" && selectedApprovalListId
                    ? "Open this list to review its termination requests"
                    : applicationsRetrieved && selectedApprovalListId
                      ? `Showing ${selectedListApplications.length} applications`
                      : "Click 'Retrieve Applications' to view data"}
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {selectedListKind === "termination" && selectedApprovalListId ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center text-muted-foreground">
                    <FileText size={36} className="text-gray-300" />
                    <p className="text-sm">
                      <span className="font-medium text-gray-800">{selectedApprovalListId}</span> is a
                      termination approval list.
                    </p>
                    <p className="text-xs">
                      Its requests are reviewed on the termination approvals screen.
                    </p>
                    <Button
                      type="button"
                      className="bg-[#953002] text-white hover:bg-[#7a2700]"
                      onClick={() => handleOpenTerminationList(selectedApprovalListId)}
                    >
                      Open Termination Requests
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                ) : !selectedApprovalListId || !applicationsRetrieved ? (
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
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-3"
                          onClick={() =>
                            window.open(printPathFor(selectedApprovalListId), "_blank")
                          }
                          disabled={!selectedApprovalListId}
                        >
                          <Printer size={14} />
                          Print
                        </Button>
                        {canDelete && (
                          <Button
                            type="button"
                            className="h-8 bg-rose-600 px-3 text-white hover:bg-rose-700"
                            onClick={handleDeleteSelectedList}
                            disabled={!selectedApprovalListId}
                          >
                            <Trash2 size={14} />
                            Delete List
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="w-full overflow-x-auto">
                        {selectedListNameChangeRequests.length > 0 && (
                          <div className="mb-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Name Change Requests in this list</h3>
                            <div className="space-y-2">
                              {selectedListNameChangeRequests.map((ncr) => {
                                const requestId = String(ncr.nameChangeRequestID ?? "");
                                const decisionState = selectedListNameChangeDecisions[requestId] || { decision: "Approve", rejectReason: "" };
                                return (
                                  <div key={requestId} className="rounded border p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <div className="text-sm font-medium text-gray-800 hover:underline cursor-pointer" onClick={() => {
                                          if (requestId) router.push(`/membership/name-changes/${requestId}`);
                                        }}>{ncr.newFullName || `NCR-${requestId}`}</div>
                                        <div className="text-xs text-muted-foreground">{ncr.newNameAsInPayroll || ncr.newNameWithInitials || ''}</div>
                                      </div>
                                      <div className="text-xs text-gray-500">ID: {requestId}</div>
                                    </div>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
                                      <div>
                                        <Select
                                          value={decisionState.decision}
                                          onValueChange={(value) =>
                                            setSelectedListNameChangeDecisions((prev) => ({
                                              ...prev,
                                              [requestId]: {
                                                ...(prev[requestId] || { rejectReason: "" }),
                                                decision: value as ApplicationDecision,
                                              },
                                            }))
                                          }
                                        >
                                          <SelectTrigger className="h-10 w-full">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Approve">Approve</SelectItem>
                                            <SelectItem value="Reject">Reject</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <Input
                                        value={decisionState.rejectReason}
                                        onChange={(e) =>
                                          setSelectedListNameChangeDecisions((prev) => ({
                                            ...prev,
                                            [requestId]: {
                                              ...(prev[requestId] || { decision: "Approve" }),
                                              rejectReason: e.target.value,
                                            },
                                          }))
                                        }
                                        placeholder="Reject reason"
                                        disabled={decisionState.decision !== "Reject"}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {selectedListNomineeChangeRequests.length > 0 && (
                          <div className="mb-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Nominee Change Requests in this list</h3>
                            <div className="space-y-2">
                              {selectedListNomineeChangeRequests.map((nmr) => {
                                const requestId = String(nmr.id ?? nmr.nomineeChangeID ?? nmr.nommineChangeId ?? "");
                                const decisionState = selectedListNomineeChangeDecisions[requestId] || { decision: "Approve", rejectReason: "" };
                                return (
                                  <div key={requestId} className="rounded border p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <div className="text-sm font-medium text-gray-800 hover:underline cursor-pointer" onClick={() => {
                                          if (requestId) router.push(`/membership/nommine-changes/${requestId}`);
                                        }}>
                                          {nmr.newnommineName || `NMR-${requestId}`}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{nmr.newRelationship || nmr.relationship || ''}</div>
                                      </div>
                                      <div className="text-xs text-gray-500">ID: {requestId}</div>
                                    </div>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
                                      <div>
                                        <Select
                                          value={decisionState.decision}
                                          onValueChange={(value) =>
                                            setSelectedListNomineeChangeDecisions((prev) => ({
                                              ...prev,
                                              [requestId]: {
                                                ...(prev[requestId] || { rejectReason: "" }),
                                                decision: value as ApplicationDecision,
                                              },
                                            }))
                                          }
                                        >
                                          <SelectTrigger className="h-10 w-full">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Approve">Approve</SelectItem>
                                            <SelectItem value="Reject">Reject</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <Input
                                        value={decisionState.rejectReason}
                                        onChange={(e) =>
                                          setSelectedListNomineeChangeDecisions((prev) => ({
                                            ...prev,
                                            [requestId]: {
                                              ...(prev[requestId] || { decision: "Approve" }),
                                              rejectReason: e.target.value,
                                            },
                                          }))
                                        }
                                        placeholder="Reject reason"
                                        disabled={decisionState.decision !== "Reject"}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      {/*
                        * Only render the applications table when there are applications.
                        * A Name Change or Nominee Change list has none — its requests are
                        * the cards above — so this used to leave a bare header row
                        * (App ID / Name / Decision / Reason / Action) under them with
                        * nothing beneath it. The same happened for an empty membership
                        * list; the "Showing 0 applications" line above already says so.
                        */}
                      {selectedListApplications.length > 0 && (
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
                                      application.status === "REJECTED"
                                        ? "bg-rose-600"
                                        : "bg-green-600"
                                    }`}
                                  >
                                    {application.status === "REJECTED"
                                      ? "Rejected"
                                      : "Approved"}
                                  </span>
                                ) : (
                                  <Select
                                    value={applicationDecisions[application.id]?.decision || "Approve"}
                                    onValueChange={(value) =>
                                      setApplicationDecisions(prev => ({ 
                                        ...prev, 
                                        [application.id]: { 
                                          ...(prev[application.id] || { rejectReason: "" }), 
                                          decision: value as ApplicationDecision 
                                        } 
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
                                {selectedProcessedState && !isEditingProcessedList ? (
                                  <span
                                    className={
                                      application.status === "REJECTED"
                                        ? "text-rose-600"
                                        : "text-gray-500"
                                    }
                                  >
                                    {application.status === "REJECTED"
                                      ? application.boardDecisionReason || "Reject Reason"
                                      : "-"}
                                  </span>
                                ) : (
                                  <Input
                                    value={applicationDecisions[application.id]?.rejectReason || ""}
                                    onChange={(e) => setApplicationDecisions(prev => ({ 
                                      ...prev, 
                                      [application.id]: { 
                                        ...(prev[application.id] || { decision: "Approve" }), 
                                        rejectReason: e.target.value 
                                      } 
                                    }))}
                                    disabled={applicationDecisions[application.id]?.decision !== "Reject"}
                                    placeholder="Reason required..."
                                    className={
                                      applicationDecisions[application.id]?.decision === "Reject" && !applicationDecisions[application.id]?.rejectReason?.trim()
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
                      )}
                    </div>

                    {(!selectedProcessedState || isEditingProcessedList) && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          className="min-w-[106px] bg-[#953002] text-white hover:bg-[#7a2700]"
                          disabled={
                            Object.values(applicationDecisions).some(
                              (d) => d.decision === "Reject" && !d.rejectReason.trim()
                            )
                          }
                          onClick={handleOpenConfirmModal}
                          hidden={!canProcess}
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

              {/* Optional scan of the signed "Application List for Board Approval"
                  sheet brought back from the meeting (spec 4.5). */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Signed Approval Sheet{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setApprovalSheetFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#9e3600] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-[#8b2f00]"
                />
                {approvalSheetFile && (
                  <p className="text-xs text-gray-500">
                    Selected: {approvalSheetFile.name}
                  </p>
                )}
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
                  hidden={!canProcess}
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
                      selectedApplicationForDetails.status !== "REJECTED"
                        ? "bg-green-600"
                        : "bg-rose-600"
                    }`}
                  >
                    {selectedApplicationForDetails.status !== "REJECTED"
                      ? "✓ Approved"
                      : "✕ Rejected"}
                  </span>
                </div>
              </div>

              {/* Additional Information */}
              {(selectedApplicationForDetails.status === "REJECTED" || selectedListDetails?.boardRemarks || selectedProcessedState.boardRemarks) && (
                <div className="space-y-3">
                  {selectedApplicationForDetails.status === "REJECTED" && selectedApplicationForDetails.boardDecisionReason && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-red-700">Reject Reason</p>
                      <p className="mt-1 text-sm font-medium text-red-800">
                        {selectedApplicationForDetails.boardDecisionReason}
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
