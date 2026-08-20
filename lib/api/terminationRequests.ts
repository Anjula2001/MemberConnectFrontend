import { apiClient } from "@/lib/api/client";

export interface TerminationRequestResponse {
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

/**
 * MMT04 manual status change.
 *
 * Deliberately routed through apiClient rather than the raw fetch the rest of
 * this page still uses: the server decides "Inactive rights" from the
 * authenticated principal, so a call without the JWT would be refused as
 * unauthorised no matter who the user actually is.
 */
export async function changeTerminationRequestStatus(requestNo: string, targetStatus: string) {
  const { data } = await apiClient.patch<TerminationRequestResponse>(
    `/api/termination-requests/${encodeURIComponent(requestNo)}/status`,
    { targetStatus }
  );
  return data;
}

export async function approveTerminationRequest(requestNo: string) {
  const { data } = await apiClient.put<TerminationRequestResponse>(
    `/api/termination-requests/${encodeURIComponent(requestNo)}/approve`
  );
  return data;
}

export async function rejectTerminationRequest(requestNo: string, reason: string) {
  const { data } = await apiClient.put<TerminationRequestResponse>(
    `/api/termination-requests/${encodeURIComponent(requestNo)}/reject`,
    { reason }
  );
  return data;
}
