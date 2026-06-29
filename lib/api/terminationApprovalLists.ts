import { apiClient } from "@/lib/api/client";
import type { TerminationRequestDTO } from "@/lib/api/terminationRequests";

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
  decision?: string;
  rejectReason?: string;
  boardRemarks?: string;
}

export interface ProcessTerminationApprovalListPayload {
  actualMeetingDate: string;
  decision: "Approve" | "Reject";
  rejectReason?: string;
  boardRemarks?: string;
  processedBy?: string;
}

const BASE_PATH = "/api/termination-approval-lists";

export async function createTerminationApprovalList(payload: TerminationApprovalListDTO) {
  const { data } = await apiClient.post<TerminationApprovalListDTO>(
    `${BASE_PATH}/createTerminationApprovalList`,
    payload
  );
  return data;
}

export async function getTerminationApprovalLists() {
  const { data } = await apiClient.get<TerminationApprovalListDTO[]>(
    `${BASE_PATH}/getAllTerminationApprovalLists`
  );
  return data;
}

export async function getTerminationApprovalListByListId(listId: string) {
  const { data } = await apiClient.get<TerminationApprovalListDTO>(
    `${BASE_PATH}/getTerminationApprovalListByListId/${encodeURIComponent(listId)}`
  );
  return data;
}

export async function getTerminationApprovalListRequests(listId: string) {
  const { data } = await apiClient.get<TerminationRequestDTO[]>(
    `${BASE_PATH}/getRequestsByListId/${encodeURIComponent(listId)}`
  );
  return data;
}

export async function processTerminationApprovalList(
  listId: string,
  payload: ProcessTerminationApprovalListPayload
) {
  const { data } = await apiClient.patch<TerminationApprovalListDTO>(
    `${BASE_PATH}/processTerminationApprovalList/${encodeURIComponent(listId)}`,
    payload
  );
  return data;
}

export async function deleteTerminationApprovalList(listId: string) {
  const { data } = await apiClient.delete<string>(
    `${BASE_PATH}/deleteTerminationApprovalList/${encodeURIComponent(listId)}`
  );
  return data;
}
