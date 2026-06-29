import { apiClient } from "@/lib/api/client";

export interface TerminationRequestDTO {
  id?: number;
  requestNo?: string;
  memberId?: string;
  memberFullName?: string;
  nameAsInPayroll?: string;
  nameWithInitials?: string;
  nic?: string;
  terminationReasonId?: string;
  terminationReason?: string;
  requestedDate?: string;
  effectiveDate?: string;
  comment?: string;
  status?: string;
  incompleteReason?: string;
  rejectReason?: string;
  hasLoanBalance?: boolean;
  hasIndirectObligations?: boolean;
}

const BASE_PATH = "/api/termination-requests";

export async function approveTerminationRequest(requestNo: string) {
  const { data } = await apiClient.put<TerminationRequestDTO>(
    `${BASE_PATH}/${encodeURIComponent(requestNo)}/approve`
  );
  return data;
}

export async function rejectTerminationRequest(requestNo: string, reason: string) {
  const { data } = await apiClient.put<TerminationRequestDTO>(
    `${BASE_PATH}/${encodeURIComponent(requestNo)}/reject`,
    { reason }
  );
  return data;
}
