import { apiClient } from "@/lib/api/client";

export interface DeathDonationRelative {
  id?: number;
  relativeMemberId: string;
  relationshipToDeceased: string;
  autoPopulated: boolean;
  relativeMemberName?: string;
}

export interface DeathDonationRequest {
  id?: number;
  requestNo?: string;
  memberId?: string;
  memberFullName?: string;
  memberNameWithInitials?: string;
  memberNameAsInPayroll?: string;
  memberNic?: string;
  memberWorkingLocation?: string;
  memberEducationalDistrict?: string;
  status?: string;
  relationshipToDeceased?: string;
  requestedDate?: string;
  deceasedMember?: boolean;
  deceasedMemberId?: string;
  deceasedName?: string;
  maidenNameIfMarried?: string;
  deceasedDate?: string;
  deathCertificateNumber?: string;
  deceasedPlaceOfWork?: string;
  concernsIdentified?: string;
  incompleteReason?: string;
  rejectReason?: string;
  submissionLocation?: string;
  createdBy?: string;
  dateRangeWarning?: boolean;
  /** Server-built warning text; the eligible period is configuration, not a constant. */
  eligiblePeriodWarning?: string | null;

  // Death Donation Details (SRS 2.2.3)
  monthsRemitted?: number | null;
  monthsRemittedEdited?: boolean | null;
  maximumDonationAmount?: number | null;
  eligibleDonationAmount?: number | null;
  receivedPast12Months?: number | null;
  receivedPast12MonthsEdited?: boolean | null;
  funeralAccountNo?: string | null;
  funeralAccountCredited?: number | null;
  funeralAccountMaximum?: number | null;
  creditedToSpecialFixedAccount?: number | null;
  creditedToSpecialFixedEdited?: boolean | null;
  disburseDonationAmount?: number | null;
  donationMultiplierApplied?: number | null;

  // Per-level decision trail (MMD05 / MMD06 / MMD07)
  level1DecidedBy?: string | null;
  level1DecidedAt?: string | null;
  level2DecidedBy?: string | null;
  level2DecidedAt?: string | null;
  level3DecidedBy?: string | null;
  level3DecidedAt?: string | null;

  /** MMD04 transitions the server will accept from this caller, already filtered. */
  allowedStatusChanges?: string[];

  relatives?: DeathDonationRelative[];
}

export interface DeathDonationDocument {
  id?: number;
  requestNo?: string;
  /** The stable code an upload is filed under, e.g. DEATH_CERTIFICATE. */
  documentType: string;
  fileName: string;
  fileType?: string;
  uploadedAt?: string;
  /** Only on the Required Documents listing, from the Supporting Documents master. */
  documentName?: string;
  mandatory?: boolean;
}

export interface DeathDonationDeceasedPopulate {
  deceasedMemberId: string;
  deceasedName: string;
  deceasedPlaceOfWork?: string;
}

export async function getDeathDonationRequestsByMember(memberId: string) {
  const { data } = await apiClient.get<DeathDonationRequest[]>(
    `/api/death-donation-requests/member/${encodeURIComponent(memberId)}`
  );
  return data;
}

export async function searchDeathDonationRequests(params?: {
  locations?: string[];
  statuses?: string[];
  fromDate?: string;
  toDate?: string;
  searchKey?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const query = new URLSearchParams();

  params?.locations?.forEach((location) => query.append("locations", location));
  params?.statuses?.forEach((status) => query.append("statuses", status));

  if (params?.fromDate) query.append("fromDate", params.fromDate);
  if (params?.toDate) query.append("toDate", params.toDate);
  if (params?.searchKey?.trim()) query.append("searchKey", params.searchKey.trim());
  if (params?.sortBy) query.append("sortBy", params.sortBy);
  if (params?.sortOrder) query.append("sortOrder", params.sortOrder);

  const { data } = await apiClient.get<DeathDonationRequest[]>(
    `/api/death-donation-requests?${query.toString()}`
  );
  return data;
}

export async function getDeathDonationRequest(requestNo: string) {
  const { data } = await apiClient.get<DeathDonationRequest>(
    `/api/death-donation-requests/${encodeURIComponent(requestNo)}`
  );
  return data;
}

export async function saveDeathDonationRequest(
  memberId: string,
  payload: DeathDonationRequest
) {
  const { data } = await apiClient.post<DeathDonationRequest>(
    `/api/death-donation-requests/${encodeURIComponent(memberId)}`,
    payload
  );
  return data;
}

export async function updateDeathDonationRequest(
  requestNo: string,
  payload: DeathDonationRequest
) {
  const { data } = await apiClient.put<DeathDonationRequest>(
    `/api/death-donation-requests/${encodeURIComponent(requestNo)}`,
    payload
  );
  return data;
}

export async function submitDeathDonationRequest(requestNo: string) {
  const { data } = await apiClient.post<DeathDonationRequest>(
    `/api/death-donation-requests/${encodeURIComponent(requestNo)}/submit`
  );
  return data;
}

export async function markDeathDonationIncomplete(requestNo: string, reason: string) {
  const { data } = await apiClient.put<DeathDonationRequest>(
    `/api/death-donation-requests/${encodeURIComponent(requestNo)}/mark-incomplete`,
    { reason }
  );
  return data;
}

export async function approveDeathDonationRequest(requestNo: string) {
  const { data } = await apiClient.put<DeathDonationRequest>(
    `/api/death-donation-requests/${encodeURIComponent(requestNo)}/approve`
  );
  return data;
}

export async function rejectDeathDonationRequest(requestNo: string, reason: string) {
  const { data } = await apiClient.put<DeathDonationRequest>(
    `/api/death-donation-requests/${encodeURIComponent(requestNo)}/reject`,
    { reason }
  );
  return data;
}

/** MMD05: escalate from the District Office to the District Committee. */
export async function forwardDeathDonationToDistrictCommittee(
  requestNo: string,
  concerns?: string
) {
  const { data } = await apiClient.put<DeathDonationRequest>(
    `/api/death-donation-requests/${encodeURIComponent(requestNo)}/forward-to-district-committee`,
    { concerns: concerns ?? "" }
  );
  return data;
}

/** MMD06: escalate from the District Committee to the P&D Committee. */
export async function forwardDeathDonationToPdCommittee(requestNo: string, concerns?: string) {
  const { data } = await apiClient.put<DeathDonationRequest>(
    `/api/death-donation-requests/${encodeURIComponent(requestNo)}/forward-to-pd-committee`,
    { concerns: concerns ?? "" }
  );
  return data;
}

/** MMD04 manual status change. The server enforces the matrix on SRS p.24. */
export async function changeDeathDonationStatus(requestNo: string, status: string) {
  const { data } = await apiClient.put<DeathDonationRequest>(
    `/api/death-donation-requests/${encodeURIComponent(requestNo)}/change-status`,
    { status }
  );
  return data;
}

/** The Concerns Identified field, editable in View Mode for approvers. */
export async function updateDeathDonationConcerns(requestNo: string, concerns: string) {
  const { data } = await apiClient.put<DeathDonationRequest>(
    `/api/death-donation-requests/${encodeURIComponent(requestNo)}/concerns`,
    { concerns }
  );
  return data;
}

/**
 * SRS 2.2.3 refresh: send whatever the three editable inputs hold and let the
 * server recalculate the rest. An omitted value means "leave it alone", so the
 * fields are only sent when they carry something.
 */
export async function refreshDeathDonationEntitlement(
  requestNo: string,
  overrides: {
    monthsRemitted?: string | number | null;
    receivedPast12Months?: string | number | null;
    creditedToSpecialFixedAccount?: string | number | null;
  }
) {
  const body: Record<string, string> = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      body[key] = String(value).trim();
    }
  }

  const { data } = await apiClient.post<DeathDonationRequest>(
    `/api/death-donation-requests/${encodeURIComponent(requestNo)}/donation/refresh`,
    body
  );
  return data;
}

/** The Death Donation Relationship master (MMD01 dropdown). */
export async function getDeathDonationRelationships() {
  const { data } = await apiClient.get<string[]>(
    `/api/death-donation-requests/relationships`
  );
  return data;
}

export async function refreshDeathDonationRelatives(
  deathCertificateNumber: string,
  excludeRequestNo?: string
) {
  const { data } = await apiClient.get<DeathDonationRelative[]>(
    `/api/death-donation-requests/relatives-by-certificate`,
    {
      params: {
        deathCertificateNumber,
        excludeRequestNo: excludeRequestNo || undefined,
      },
    }
  );
  return data;
}

export async function populateDeceasedMember(memberId: string) {
  const { data } = await apiClient.get<DeathDonationDeceasedPopulate>(
    `/api/death-donation-requests/deceased-member/${encodeURIComponent(memberId)}/populate`
  );
  return data;
}

/**
 * MMD01 Required Documents, from the Supporting Documents master rather than a
 * list hardcoded in the browser. Needs a saved request because the server scopes
 * the answer to the district that raised it.
 */
export async function getDeathDonationRequiredDocuments(requestNo: string) {
  const { data } = await apiClient.get<DeathDonationDocument[]>(
    `/api/death-donation-requests/${encodeURIComponent(requestNo)}/required-documents`
  );
  return data;
}

export async function getDeathDonationDocuments(requestNo: string) {
  const { data } = await apiClient.get<DeathDonationDocument[]>(
    `/api/death-donation-requests/${encodeURIComponent(requestNo)}/documents`
  );
  return data;
}

export async function uploadDeathDonationDocument(
  requestNo: string,
  documentType: string,
  file: File
) {
  const formData = new FormData();
  formData.append("file", file);

  // Through apiClient, not a bare fetch: it attaches the JWT and already knows
  // to drop the JSON Content-Type for FormData so the browser can set its own
  // multipart boundary.
  const { data } = await apiClient.post<DeathDonationDocument>(
    `/api/death-donation-requests/${encodeURIComponent(requestNo)}/documents/${encodeURIComponent(documentType)}/upload`,
    formData
  );
  return data;
}

export async function deleteDeathDonationDocument(documentId: number) {
  await apiClient.delete(`/api/death-donation-requests/documents/${documentId}`);
}

/**
 * Fetches the file and hands the browser a blob URL.
 *
 * The previous version returned a plain URL for an <a href target="_blank">.
 * That is a top-level navigation, not a fetch, so neither axios nor the global
 * fetch patch could attach the Authorization header - and the endpoint requires
 * one, so every download answered 401. Pulling the bytes through apiClient and
 * opening an object URL keeps the click behaviour and actually authenticates.
 *
 * The caller is responsible for revoking the URL once the click is done.
 */
export async function downloadDeathDonationDocument(documentId: number, fileName?: string) {
  const response = await apiClient.get<Blob>(
    `/api/death-donation-requests/documents/${documentId}/download`,
    { responseType: "blob" }
  );

  const objectUrl = URL.createObjectURL(response.data);

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || "document";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Give the browser a moment to start the download before the blob goes away.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}
