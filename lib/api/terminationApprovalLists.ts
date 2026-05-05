import { apiClient } from "./client";

export interface TerminationApprovalListDTO {
  id?: number;
  listId?: string;
  boardMeetingId: number;
  boardMeetingDate: string;
  terminationIds: string[];
  status?: string;
  createdAt?: string;
  processedAt?: string;
  processedBy?: string;
  actualMeetingDate?: string;
  decision?: string;
  rejectReason?: string;
  boardRemarks?: string;
}

const BASE_PATH = "/api/terminationApprovalLists";

/**
 * Create a new termination approval list
 */
export async function createTerminationApprovalList(payload: TerminationApprovalListDTO) {
  try {
    const { data } = await apiClient.post<TerminationApprovalListDTO>(
      `${BASE_PATH}/create`,
      payload
    );
    return data;
  } catch (error: unknown) {
    throw error instanceof Error
      ? error
      : new Error("Failed to create termination approval list");
  }
}

/**
 * Get all termination approval lists
 */
export async function getTerminationApprovalLists() {
  try {
    const { data } = await apiClient.get<TerminationApprovalListDTO[]>(
      `${BASE_PATH}/getAll`
    );
    return data;
  } catch (error: unknown) {
    throw error instanceof Error
      ? error
      : new Error("Failed to fetch termination approval lists");
  }
}

/**
 * Delete a termination approval list by listId.
 * All attached termination requests are rolled back to their original status.
 */
export async function deleteTerminationApprovalList(listId: string) {
  try {
    const { data } = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/delete/${listId}`
    );
    return data;
  } catch (error: unknown) {
    throw error instanceof Error
      ? error
      : new Error("Failed to delete termination approval list");
  }
}

