import { apiClient } from "@/lib/api/client";

const BASE = "/api/dormant-members";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DormantMember {
  id: number;
  memberId: string;
  fullName: string;
  nameWithInitials: string;
  nic: string;
  memberType: string;
  /**
   * The District Office that administers this member (submissionLocation).
   * This is what the Location filter matches and what a District Office user is
   * scoped to, so the column and the filter above it agree.
   */
  location: string;
  /** The member's working district. Shown for reference; not a filter. */
  educationalDistrict?: string;
  lastActivityDate: string | null;
  membershipDate: string | null;
  dormantSelectionDate: string | null;
  status: string;
  hasIndirectObligations: boolean;
  /** Set once a list has been processed. */
  decision?: string | null;
  rejectReason?: string | null;
  /**
   * True when the member transacted after the list was assembled — a warning
   * that the board is about to inactivate somebody who has since become active.
   */
  activitySinceListing?: boolean;
}

export interface DormantConfig {
  dormantPeriodMonths: number;
  scheduleDayOfMonth: number;
  scheduleHour: number;
  scheduleMinute: number;
  enabled: boolean;
  /** Read-only. Null until the process has run at least once. */
  lastRunOn?: string | null;
  lastRunSelectedCount?: number | null;
  lastRunClearedCount?: number | null;
}

export interface DormantMemberDecision {
  memberId: string;
  decision: "Approve" | "Reject";
  /** Mandatory when decision is "Reject" — the server refuses the whole list without it. */
  rejectReason?: string;
}

export interface DormantApprovalList {
  id?: number;
  listId: string;
  boardMeetingId?: number;
  boardMeetingDate?: string | null;
  actualMeetingDate?: string | null;
  memberIds: string[];
  members: DormantMember[];
  /** "CREATED" or "PROCESSED". */
  status: string;
  createdAt?: string;
  processedAt?: string;
  processedBy?: string;
  /** Server-derived: "Approve", "Reject", or "Mixed". */
  decision?: string;
  rejectReason?: string;
  boardRemarks?: string;
  inactivatedAt?: string;
  approvedListDocument?: string;
  approvedCount?: number;
  rejectedCount?: number;
}

/**
 * The board marks each member individually, so every member on the list must
 * carry their own decision. The server applies them all in one transaction and
 * derives the list-level verdict itself ("Approve", "Reject", or "Mixed") —
 * which is why there is no list-level `decision` field to send.
 */
export interface ProcessDormantApprovalListPayload {
  /** The date the board actually sat — may differ if the meeting was postponed. */
  actualMeetingDate: string;
  memberDecisions: DormantMemberDecision[];
  boardRemarks?: string;
  /** Filename of the scanned, board-signed approval sheet. */
  approvedListDocument?: string;
}

export interface DormantSearchParams {
  locations?: string[];
  memberType?: string;
  dateFilter?: string;
  fromDate?: string;
  toDate?: string;
  statuses?: string[];
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface BoardMeeting {
  id: number;
  boardMeetingId?: string;
  scheduledDate: string;
  actualDate?: string;
}

// ---------------------------------------------------------------------------
// Configuration + identification (MMD10 / MMD11)
// ---------------------------------------------------------------------------

export async function getDormantConfig(): Promise<DormantConfig> {
  const { data } = await apiClient.get<DormantConfig>(`${BASE}/config`);
  return data;
}

export async function updateDormantConfig(config: Partial<DormantConfig>): Promise<DormantConfig> {
  const { data } = await apiClient.put<DormantConfig>(`${BASE}/config`, config);
  return data;
}

export async function runDormantIdentification(): Promise<{ selected: number; cleared: number }> {
  const { data } = await apiClient.post<{ selected: number; cleared: number }>(
    `${BASE}/run-identification`
  );
  return data;
}

// ---------------------------------------------------------------------------
// Search + filter metadata (MMD12)
// ---------------------------------------------------------------------------

export async function getDormantLocations(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`${BASE}/locations`);
  return data;
}

export async function getDormantMemberTypes(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`${BASE}/member-types`);
  return data;
}

export async function searchDormantMembers(
  params: DormantSearchParams
): Promise<DormantMember[]> {
  const { data } = await apiClient.get<DormantMember[]>(`${BASE}/search`, { params });
  return data;
}

// ---------------------------------------------------------------------------
// Inactivation Approval Lists (MMD13 - MMD18)
// ---------------------------------------------------------------------------

export async function createDormantApprovalList(
  boardMeetingId: number,
  memberIds: string[]
): Promise<DormantApprovalList> {
  const { data } = await apiClient.post<DormantApprovalList>(`${BASE}/approval-lists`, {
    boardMeetingId,
    memberIds,
  });
  return data;
}

export async function getDormantApprovalLists(): Promise<DormantApprovalList[]> {
  const { data } = await apiClient.get<DormantApprovalList[]>(`${BASE}/approval-lists`);
  return data;
}

export async function getDormantApprovalList(listId: string): Promise<DormantApprovalList> {
  const { data } = await apiClient.get<DormantApprovalList>(`${BASE}/approval-lists/${listId}`);
  return data;
}

export async function getDormantApprovalListMembers(listId: string): Promise<DormantMember[]> {
  const { data } = await apiClient.get<DormantMember[]>(
    `${BASE}/approval-lists/${listId}/members`
  );
  return data;
}

/**
 * MMD17. One call, one transaction: the board's decision on every member is
 * applied together, or none of it is. There is deliberately no per-member
 * endpoint — the previous one let a member be inactivated by a list nobody had
 * approved.
 */
export async function processDormantApprovalList(
  listId: string,
  payload: ProcessDormantApprovalListPayload
): Promise<DormantApprovalList> {
  const { data } = await apiClient.patch<DormantApprovalList>(
    `${BASE}/approval-lists/${listId}/process`,
    payload
  );
  return data;
}

export async function deleteDormantApprovalList(listId: string): Promise<string> {
  const { data } = await apiClient.delete<string>(`${BASE}/approval-lists/${listId}`);
  return data;
}

export async function getBoardMeetings(): Promise<BoardMeeting[]> {
  const { data } = await apiClient.get<BoardMeeting[]>(
    `/api/board-meetings/getAllBoardMeetings`
  );
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Shared display helpers
// ---------------------------------------------------------------------------

export const DORMANT_STATUS_LABELS: Record<string, string> = {
  SELECTED_FOR_DORMANT: "Selected for Dormant",
  SENT_FOR_DORMANT_APPROVAL: "Sent for Dormant Approval",
  INACTIVE_DORMANT: "Inactive (Dormant)",
};

export function formatDormantDate(value?: string | null): string {
  if (!value) return "-";
  return value.length > 10 ? value.substring(0, 10) : value;
}
