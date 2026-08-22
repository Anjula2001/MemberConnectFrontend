import { apiClient } from "@/lib/api/client";

/** Mirrors RetirementRequestResponseDTO on the backend. */
export interface RetirementRequestResponse {
  id?: number;
  requestNo?: string;
  memberId?: string;
  memberFullName?: string;
  nameAsInPayroll?: string;
  nameWithInitials?: string;
  nic?: string;
  requestedDate?: string;
  effectiveDate?: string;
  comment?: string;
  status?: string;
  incompleteReason?: string;
  rejectReason?: string;
  hasLoanBalance?: boolean;
  hasIndirectObligations?: boolean;
  /** The member's own status - RETIREMENT_APPROVED until Finance completes, then RETIRED. */
  memberStatus?: string;
}

/** Mirrors MemberRetirementRequestDTO — the save/update payload. */
export interface RetirementRequestPayload {
  requestedDate: string;
  effectiveDate: string;
  comment?: string;
}

/** Mirrors MemberRetirementValidationDTO. */
export interface RetirementValidation {
  hasOutstandingLoans: boolean;
  hasLoanObligations: boolean;
  totalOutstandingLoanBalance: number;
  canSubmit: boolean;
  message: string;
}

export interface MemberSummary {
  memberId: string;
  fullName: string;
  nameWithInitials: string;
  nic: string;
  status?: string;
}

export interface SearchRetirementRequestsParams {
  locations?: string[];
  statuses?: string[];
  fromDate?: string;
  toDate?: string;
  searchKey?: string;
  sortBy?: string;
  sortOrder?: string;
}

const encode = (value: string) => encodeURIComponent(value);

export async function searchRetirementRequests(
  params: SearchRetirementRequestsParams = {}
) {
  // URLSearchParams rather than axios `params` so repeated `statuses`/`locations` keys serialise the
  // way the backend's List<String> @RequestParam expects them.
  const query = new URLSearchParams();
  params.locations?.forEach((location) => query.append("locations", location));
  params.statuses?.forEach((status) => query.append("statuses", status));
  if (params.fromDate) query.append("fromDate", params.fromDate);
  if (params.toDate) query.append("toDate", params.toDate);
  if (params.searchKey) query.append("searchKey", params.searchKey);
  if (params.sortBy) query.append("sortBy", params.sortBy);
  if (params.sortOrder) query.append("sortOrder", params.sortOrder);

  const { data } = await apiClient.get<RetirementRequestResponse[]>(
    `/api/retirement-requests?${query.toString()}`
  );
  return data;
}

export async function getRetirementRequestsByMember(memberId: string) {
  const { data } = await apiClient.get<RetirementRequestResponse[]>(
    `/api/retirement-requests/member/${encode(memberId)}`
  );
  return data;
}

export async function getRetirementRequestById(requestId: string) {
  const { data } = await apiClient.get<RetirementRequestResponse>(
    `/api/retirement-requests/request/${encode(requestId)}`
  );
  return data;
}

export async function saveRetirementRequest(
  memberId: string,
  payload: RetirementRequestPayload
) {
  const { data } = await apiClient.post<RetirementRequestResponse>(
    `/api/retirement-requests/${encode(memberId)}`,
    payload
  );
  return data;
}

export async function updateRetirementRequest(
  requestNo: string,
  payload: RetirementRequestPayload
) {
  const { data } = await apiClient.put<RetirementRequestResponse>(
    `/api/retirement-requests/${encode(requestNo)}`,
    payload
  );
  return data;
}

export async function submitRetirementRequest(requestNo: string) {
  const { data } = await apiClient.post<RetirementRequestResponse>(
    `/api/retirement-requests/${encode(requestNo)}/submit`
  );
  return data;
}

export async function markRetirementRequestIncomplete(
  requestNo: string,
  reason: string
) {
  const { data } = await apiClient.put<RetirementRequestResponse>(
    `/api/retirement-requests/${encode(requestNo)}/mark-incomplete`,
    { reason }
  );
  return data;
}

export async function approveRetirementRequest(requestNo: string) {
  const { data } = await apiClient.put<RetirementRequestResponse>(
    `/api/retirement-requests/${encode(requestNo)}/approve`
  );
  return data;
}

/**
 * MMT17 — hand an approved retirement to the Finance Module. On success the member
 * becomes RETIRED; the request itself stays APPROVED.
 */
export async function sendRetirementToFinance(requestNo: string) {
  const { data } = await apiClient.post<RetirementRequestResponse>(
    `/api/retirement-requests/${encode(requestNo)}/send-to-finance`
  );
  return data;
}

export async function rejectRetirementRequest(requestNo: string, reason: string) {
  const { data } = await apiClient.put<RetirementRequestResponse>(
    `/api/retirement-requests/${encode(requestNo)}/reject`,
    { reason }
  );
  return data;
}

export async function changeRetirementRequestStatus(
  requestNo: string,
  status: string
) {
  const { data } = await apiClient.put<RetirementRequestResponse>(
    `/api/retirement-requests/${encode(requestNo)}/status`,
    { status }
  );
  return data;
}

export async function getRetirementValidation(memberId: string) {
  const { data } = await apiClient.get<RetirementValidation>(
    `/api/members/${encode(memberId)}/retirement-validation`
  );
  return data;
}

export async function getMemberSummary(memberId: string) {
  const { data } = await apiClient.get<MemberSummary>(
    `/api/members/${encode(memberId)}`
  );
  return data;
}

export async function getMembers() {
  const { data } = await apiClient.get<MemberSummary[]>("/api/members/getMembers");
  return data;
}

/** One row of the Required Documents panel, as returned by DocumentController. */
export interface RequiredDocument {
  id: number;
  documentName: string;
  mandatory: boolean;
  uploaded: boolean;
}

/**
 * Served by the shared DocumentController (`/api/{requestType}/...`), not by
 * RetirementRequestController — so it carries no RET_* permission of its own. It lives
 * here because the retirement screen is what calls it.
 */
export async function getRetirementRequiredDocuments(
  requestNo: string,
  memberId: string
) {
  const { data } = await apiClient.get<RequiredDocument[]>(
    `/api/retirement-requests/${encode(requestNo)}/required-documents?memberId=${encode(memberId)}`
  );
  return data;
}
