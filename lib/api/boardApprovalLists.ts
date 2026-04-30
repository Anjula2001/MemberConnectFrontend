import { apiClient } from "@/lib/api/client";
import type { MemberApplicationDTO } from "@/lib/api/memberApplications";

export interface BoardApprovalListDTO {
  id?: number;
  listId?: string;
  boardMeetingId?: number;
  boardMeetingDate?: string;
  actualMeetingDate?: string;
  applicationIds: string[];
  status?: string;
  createdAt?: string;
  processedAt?: string;
  processedBy?: string;
  decision?: string;
  rejectReason?: string;
  boardRemarks?: string;
}

export interface ProcessBoardApprovalListPayload {
  actualMeetingDate: string;
  decision: "Approve" | "Reject";
  rejectReason?: string;
  boardRemarks?: string;
  processedBy?: string;
}

const BASE_PATH = "/api/board-approval-lists";

export async function createBoardApprovalList(payload: BoardApprovalListDTO) {
  const { data } = await apiClient.post<BoardApprovalListDTO>(
    `${BASE_PATH}/createBoardApprovalList`,
    payload
  );
  return data;
}

export async function getBoardApprovalLists() {
  const { data } = await apiClient.get<BoardApprovalListDTO[]>(
    `${BASE_PATH}/getAllBoardApprovalLists`
  );
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