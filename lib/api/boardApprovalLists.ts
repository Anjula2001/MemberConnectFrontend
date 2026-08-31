import { apiClient } from "@/lib/api/client";
import type { MemberApplicationDTO } from "@/lib/api/memberApplications";

export interface BoardApprovalListDTO {
  id?: number;
  listId?: string;
  boardMeetingId?: number;
  boardMeetingDate?: string;
  actualMeetingDate?: string;
  /**
   * Populated when a single list is opened. The list endpoint leaves this empty and
   * sends applicationCount instead - see the note there.
   */
  applicationIds?: string[];
  /**
   * How many applications the list holds.
   *
   * Prefer this over applicationIds.length: the list endpoint no longer ships the ids,
   * because rendering a row count never needed them and producing them meant loading a
   * lazy collection per row.
   */
  applicationCount?: number;
  nameChangeRequestIds?: number[];
  nomineeChangeRequestIds?: number[];
  status?: string;
  createdAt?: string;
  processedAt?: string;
  processedBy?: string;
  decision?: string;
  rejectReason?: string;
  boardRemarks?: string;
}

/** A Board Meeting date period. Both bounds are optional and independent. */
export interface MeetingDateRange {
  from?: string
  to?: string
}


export interface BoardApprovalListCreatePayload {
  boardMeetingId: number;
  boardMeetingDate: string;
  applicationIds?: string[];
  nameChangeRequestIds?: number[];
  nomineeChangeRequestIds?: number[];
  status?: string;
}

/** One request's decision inside a Name or Nominee Change Approval List. */
export interface ProfileChangeItemDecision {
  requestId: number;
  decision: "Approve" | "Reject";
  rejectReason?: string;
}

export interface ProcessBoardApprovalListPayload {
  actualMeetingDate: string;
  /**
   * The list-wide decision for membership applications. Omitted for a list that holds
   * only Name or Nominee change requests — those are decided per request below.
   */
  decision?: "Approve" | "Reject";
  rejectReason?: string;
  boardRemarks?: string;
  processedBy?: string;
  /** S3 key of the scanned, signed board approval sheet. */
  approvedListDocument?: string;
  /** MMC12 / MMC25: the board decides each change request individually. */
  nameChangeDecisions?: ProfileChangeItemDecision[];
  nomineeChangeDecisions?: ProfileChangeItemDecision[];
}

const BASE_PATH = "/api/board-approval-lists";

export async function createBoardApprovalList(payload: BoardApprovalListCreatePayload) {
  const { data } = await apiClient.post<BoardApprovalListDTO>(
    `${BASE_PATH}/createBoardApprovalList`,
    payload
  );
  return data;
}

/**
 * MR07 retrieval. Passing no range means "All"; the period is applied by the server
 * against boardMeetingDate rather than being filtered out in the browser afterwards.
 */
export async function getBoardApprovalLists(range: MeetingDateRange = {}) {
  const { data } = await apiClient.get<BoardApprovalListDTO[]>(
    `${BASE_PATH}/getAllBoardApprovalLists`,
    {
      params: {
        ...(range.from ? { from: range.from } : {}),
        ...(range.to ? { to: range.to } : {}),
      },
    }
  );
  return data;
}

/** A row of the Board Approvals table, from either approval list table. */
export interface ApprovalListRowDTO {
  /** Which endpoint owns the list. */
  kind: "membership" | "termination";
  /** What the list holds — derived server-side so the order can run across both. */
  content: "applications" | "name-change" | "nominee-change" | "termination";
  listId: string;
  status?: string | null;
  boardMeetingId?: number | null;
  boardMeetingDate?: string | null;
  createdAt?: string | null;
  itemCount: number;
}

export interface ApprovalListPage {
  content: ApprovalListRowDTO[];
  /** Zero-based, and not necessarily the page asked for: the server clamps a page
   *  that has fallen past the end of a shrunken result set. */
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/**
 * One page of the Board Approvals table, merged across membership and termination
 * approval lists.
 *
 * Replaces fetching both listings in full and merging them in the browser. The merge
 * has to happen before the slice — page 2 of the combined order is not page 2 of
 * either source — so it happens on the server and only the page comes back.
 */
export async function getCombinedApprovalListsPage(
  range: MeetingDateRange = {},
  page = 0,
  size = 10
) {
  const { data } = await apiClient.get<ApprovalListPage>(`${BASE_PATH}/combined/page`, {
    params: {
      ...(range.from ? { from: range.from } : {}),
      ...(range.to ? { to: range.to } : {}),
      page,
      size,
    },
  });
  return data;
}

export async function getBoardApprovalListByListId(listId: string) {
  const { data } = await apiClient.get<BoardApprovalListDTO>(
    `${BASE_PATH}/getBoardApprovalListByListId/${encodeURIComponent(listId)}`
  );
  return data;
}

export async function getBoardApprovalListApplications(listId: string) {
  const { data } = await apiClient.get<MemberApplicationDTO[]>(
    `${BASE_PATH}/getApplicationsByListId/${encodeURIComponent(listId)}`
  );
  return data;
}

export interface NameChangeRequestDTO {
  nameChangeRequestID?: string;
  newTitle?: string | null;
  newFullName?: string | null;
  newNameAsInPayroll?: string | null;
  newNameWithInitials?: string | null;
  newStatus?: string | null;
  status?: string | null;
  boardDecisionReason?: string | null;
}

export async function getNameChangeRequestsByListId(listId: string) {
  const { data } = await apiClient.get<NameChangeRequestDTO[]>(
    `${BASE_PATH}/getNameChangeRequestsByListId/${encodeURIComponent(listId)}`
  );
  return data;
}

export interface NommineChangeRequestDTO {
  id?: number;
  newnommineName?: string | null;
  relationship?: string | null;
  nic?: string | null;
  address?: string | null;
  newStatus?: string | null;
  status?: string | null;
  boardDecisionReason?: string | null;
  nomineeChangeID?: number | string | null;
  nommineChangeId?: number | string | null;
}

export async function getNomineeChangeRequestsByListId(listId: string) {
  const { data } = await apiClient.get<NommineChangeRequestDTO[]>(
    `${BASE_PATH}/getNomineeChangeRequestsByListId/${encodeURIComponent(listId)}`
  );
  return data;
}
export async function processBoardApprovalList(
  listId: string,
  payload: ProcessBoardApprovalListPayload
) {
  const { data } = await apiClient.patch<BoardApprovalListDTO>(
    `${BASE_PATH}/processBoardApprovalList/${encodeURIComponent(listId)}`,
    payload
  );
  return data;
}

export async function deleteBoardApprovalList(listId: string) {
  const { data } = await apiClient.delete<string>(
    `${BASE_PATH}/deleteBoardApprovalList/${encodeURIComponent(listId)}`
  );
  return data;
}