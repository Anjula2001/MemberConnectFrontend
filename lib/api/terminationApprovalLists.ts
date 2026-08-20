import { apiClient } from "@/lib/api/client";
import type { TerminationRequestResponse } from "@/lib/api/terminationRequests";

export interface TerminationApprovalListDTO {
  id?: number;
  listId?: string;
  boardMeetingId?: number;
  boardMeetingDate?: string;
  actualMeetingDate?: string;
  requestNos: string[];
  status?: string;
  createdAt?: string;
  processedAt?: string;
  processedBy?: string;
  /** Server-derived: "Approve", "Reject", or "Mixed". */
  decision?: string;
  rejectReason?: string;
  boardRemarks?: string;
  approvedListDocument?: string;
  requestDecisions?: TerminationRequestDecision[];
  approvedCount?: number;
  rejectedCount?: number;
}

export interface TerminationRequestDecision {
  requestNo: string;
  decision: "Approve" | "Reject";
  /** Mandatory when decision is "Reject" — the server rejects the whole list without it. */
  rejectReason?: string;
}

/**
 * The board marks each request individually, so every request in the list must
 * carry its own decision. The server applies them all in one transaction and
 * derives the list-level verdict itself ("Approve", "Reject", or "Mixed") —
 * which is why there is no list-level `decision` field to send.
 */
export interface ProcessTerminationApprovalListPayload {
  /** The date the board actually sat — may differ if the meeting was postponed. */
  actualMeetingDate: string;
  requestDecisions: TerminationRequestDecision[];
  boardRemarks?: string;
  /** Stored reference to the scanned, board-signed approval sheet. */
  approvedListDocument?: string;
}

const BASE_PATH = "/api/termination-approval-lists";

export async function createTerminationApprovalList(payload: TerminationApprovalListDTO) {
  const { data } = await apiClient.post<TerminationApprovalListDTO>(
    `${BASE_PATH}/create`,
    payload
  );
  return data;
}

export async function getTerminationApprovalLists() {
  const { data } = await apiClient.get<TerminationApprovalListDTO[]>(BASE_PATH);
  return data;
}

export async function getTerminationApprovalListByListId(listId: string) {
  const { data } = await apiClient.get<TerminationApprovalListDTO>(
    `${BASE_PATH}/${encodeURIComponent(listId)}`
  );
  return data;
}

export async function getTerminationApprovalListRequests(listId: string) {
  const { data } = await apiClient.get<TerminationRequestResponse[]>(
    `${BASE_PATH}/${encodeURIComponent(listId)}/requests`
  );
  return data;
}

export async function processTerminationApprovalList(
  listId: string,
  payload: ProcessTerminationApprovalListPayload
) {
  const { data } = await apiClient.patch<TerminationApprovalListDTO>(
    `${BASE_PATH}/${encodeURIComponent(listId)}/process`,
    payload
  );
  return data;
}

export async function deleteTerminationApprovalList(listId: string) {
  const { data } = await apiClient.delete<string>(
    `${BASE_PATH}/${encodeURIComponent(listId)}`
  );
  return data;
}
