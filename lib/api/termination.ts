import { apiClient } from "@/lib/api/client";

export type TerminationReason =
  | "RETIREMENT"
  | "RESIGNATION"
  | "DEATH"
  | "TERMINATION_OF_SERVICE"
  | "VOLUNTARY_WITHDRAWAL"
  | "DISMISSAL"
  | "MEDICAL_GROUNDS"
  | "OTHER";

export type TerminationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSED"
  | "CANCELLED";

export interface MemberTerminationDTO {
  id?: number;
  memberId: number;
  terminationReason: TerminationReason;
  terminationDate: string; // ISO date format: YYYY-MM-DD
  requestedDate: string;   // ISO date format: YYYY-MM-DD
  remarks?: string;
}

export interface MemberTerminationResponse {
  id: number;
  memberId: number;
  terminationReason: TerminationReason;
  terminationDate: string;
  requestedDate: string;
  remarks?: string;
  terminationStatus: TerminationStatus;
  terminationId?: string;
  memberName?: string;
  memberId_Code?: string;
  createdAt?: string;
  updatedAt?: string;
  message?: string;
}

const BASE_PATH = "/api/terminations";

/**
 * Create a new member termination request
 */
export async function createMemberTermination(payload: MemberTerminationDTO) {
  try {
    console.log("createMemberTermination request payload:", payload);

    const { data } = await apiClient.post<MemberTerminationResponse>(
      `${BASE_PATH}/create`,
      payload
    );

    console.log("createMemberTermination response:", data);
    return data;
  } catch (error: unknown) {
    console.error("createMemberTermination error:", error);

    throw error instanceof Error
      ? error
      : new Error("Failed to create termination request");
  }
}

/**
 * Get termination by ID
 */
export async function getTerminationById(id: number) {
  const { data } = await apiClient.get<MemberTerminationResponse>(
    `${BASE_PATH}/getTerminationById/${id}`
  );
  return data;
}

/**
 * Get all terminations for a member
 */
export async function getMemberTerminations(memberId: number) {
  const { data } = await apiClient.get<MemberTerminationResponse[]>(
    `${BASE_PATH}/member/${memberId}`
  );
  return data;
}

/**
 * Get all pending terminations (for admin approval)
 */
export async function getPendingTerminations() {
  const { data } = await apiClient.get<MemberTerminationResponse[]>(
    `${BASE_PATH}/status/PENDING`
  );
  return data;
}

/**
 * Approve a termination request
 */
export async function approveTermination(id: number) {
  const { data } = await apiClient.post<MemberTerminationResponse>(
    `${BASE_PATH}/${id}/approve`
  );
  return data;
}

/**
 * Reject a termination request
 */
export async function rejectTermination(id: number, reason?: string) {
  const { data } = await apiClient.post<MemberTerminationResponse>(
    `${BASE_PATH}/${id}/reject`,
    { reason }
  );
  return data;
}

/**
 * Delete a termination record
 */
export async function deleteTermination(id: number) {
  const { data } = await apiClient.delete<{ message: string }>(
    `${BASE_PATH}/${id}`
  );
  return data;
}

/**
 * Update an existing termination request
 */
export async function updateTermination(id: number, payload: Partial<MemberTerminationDTO>) {
  try {
    const { data } = await apiClient.put<MemberTerminationResponse>(
      `${BASE_PATH}/updateTermination/${id}`,
      payload
    );
    return data;
  } catch (error: unknown) {
    throw error instanceof Error
      ? error
      : new Error("Failed to update termination request");
  }
}
