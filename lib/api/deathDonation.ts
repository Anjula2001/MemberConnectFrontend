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
  dateRangeWarning?: boolean;
  relatives?: DeathDonationRelative[];
}

export interface DeathDonationDocument {
  id?: number;
  requestNo?: string;
  documentType: string;
  fileName: string;
  fileType?: string;
  uploadedAt?: string;
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

/** @deprecated Use searchDeathDonationRequests instead */
export async function getAllDeathDonationRequests(params?: {
  status?: string;
  search?: string;
}) {
  return searchDeathDonationRequests({
    statuses: params?.status ? [params.status] : undefined,
    searchKey: params?.search,
  });
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

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
  const response = await fetch(
    `${baseUrl}/api/death-donation-requests/${encodeURIComponent(requestNo)}/documents/${encodeURIComponent(documentType)}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = (await response.json().catch(() => null)) as
    | DeathDonationDocument
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      (data && "message" in data && data.message) || "Failed to upload document"
    );
  }

  return data as DeathDonationDocument;
}

export async function deleteDeathDonationDocument(documentId: number) {
  await apiClient.delete(`/api/death-donation-requests/documents/${documentId}`);
}

export function getDeathDonationDocumentDownloadUrl(documentId: number) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
  return `${baseUrl}/api/death-donation-requests/documents/${documentId}/download`;
}
