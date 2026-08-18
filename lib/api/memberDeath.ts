import { apiClient } from "@/lib/api/client";

export interface CauseOfDeath {
  id: number;
  code: string;
  name: string;
}

export interface MemberDeathMinorDisbursement {
  id?: number;
  minorAccountNo: string;
  holderName?: string;
  disbursementBankId?: number | null;
  disbursementBankName?: string;
  disbursementBranchId?: number | null;
  disbursementBranchName?: string;
  disbursementAccountNo?: string;
}

export interface MemberDeathDocument {
  id?: number;
  recordNo?: string;
  documentType: string;
  fileName: string;
  fileType?: string;
  uploadedAt?: string;
  mandatory?: boolean;
}

export interface MemberDeathRecord {
  id?: number;
  recordNo?: string;
  memberId?: string;
  memberFullName?: string;
  memberNameWithInitials?: string;
  memberNic?: string;
  status?: string;
  informedDate?: string;
  deceasedDate?: string;
  causeOfDeathId?: number | null;
  causeOfDeathName?: string;
  comment?: string;
  concernsIdentified?: string;
  nomineeFullName?: string;
  nomineeRelationship?: string;
  nomineeAddress?: string;
  nomineeIdentificationType?: string;
  nomineeIdentificationNumber?: string;
  nomineeMobile?: string;
  nomineeEmail?: string;
  nomineeBankId?: number | null;
  nomineeBankName?: string;
  nomineeBranchId?: number | null;
  nomineeBranchName?: string;
  nomineeAccountNo?: string;
  deathDonationAmount?: number | string | null;
  incompleteReason?: string;
  rejectReason?: string;
  editable?: boolean;
  submittable?: boolean;
  hasLoanBalance?: boolean;
  hasIndirectObligations?: boolean;
  minorDisbursements?: MemberDeathMinorDisbursement[];
  documents?: MemberDeathDocument[];
}

export interface MemberDeathValidation {
  hasOutstandingLoans: boolean;
  hasLoanObligations: boolean;
  totalOutstandingLoanBalance: number;
  canSubmit: boolean;
  message: string;
}

export interface MinorSavingsAccount {
  minorAccountNo: string;
  memberId: string;
  holderName: string;
  balance: number;
}

export interface BankOption {
  id: number;
  name: string;
}

export interface BranchOption {
  id: number;
  name: string;
}

const BASE_PATH = "/api/member-death-records";

export async function searchMemberDeathRecords(params?: {
  statuses?: string[];
  fromDate?: string;
  toDate?: string;
  searchKey?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const query = new URLSearchParams();

  params?.statuses?.forEach((status) => query.append("statuses", status));
  if (params?.fromDate) query.append("fromDate", params.fromDate);
  if (params?.toDate) query.append("toDate", params.toDate);
  if (params?.searchKey?.trim()) query.append("searchKey", params.searchKey.trim());
  if (params?.sortBy) query.append("sortBy", params.sortBy);
  if (params?.sortOrder) query.append("sortOrder", params.sortOrder);

  const { data } = await apiClient.get<MemberDeathRecord[]>(
    `${BASE_PATH}?${query.toString()}`
  );
  return data;
}

export async function getCauseOfDeathOptions() {
  const { data } = await apiClient.get<CauseOfDeath[]>("/api/masters/cause-of-death");
  return data;
}

export async function getMemberDeathValidation(memberId: string) {
  const { data } = await apiClient.get<MemberDeathValidation>(
    `/api/members/${encodeURIComponent(memberId)}/member-death-validation`
  );
  return data;
}

export async function getActiveMemberDeathRecord(memberId: string) {
  try {
    const { data, status } = await apiClient.get<MemberDeathRecord>(
      `${BASE_PATH}/member/${encodeURIComponent(memberId)}/active`
    );
    if (status === 204 || !data?.recordNo) {
      return null;
    }
    return data;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      (error as { response?: { status?: number } }).response?.status === 204
    ) {
      return null;
    }
    throw error;
  }
}

export async function getMemberDeathRecord(recordNo: string) {
  const { data } = await apiClient.get<MemberDeathRecord>(
    `${BASE_PATH}/${encodeURIComponent(recordNo)}`
  );
  return data;
}

export async function saveMemberDeathRecord(memberId: string, payload: MemberDeathRecord) {
  const { data } = await apiClient.post<MemberDeathRecord>(
    `${BASE_PATH}/${encodeURIComponent(memberId)}`,
    payload
  );
  return data;
}

export async function updateMemberDeathRecord(recordNo: string, payload: MemberDeathRecord) {
  const { data } = await apiClient.put<MemberDeathRecord>(
    `${BASE_PATH}/${encodeURIComponent(recordNo)}`,
    payload
  );
  return data;
}

export async function submitMemberDeathRecord(recordNo: string) {
  const { data } = await apiClient.post<MemberDeathRecord>(
    `${BASE_PATH}/${encodeURIComponent(recordNo)}/submit`
  );
  return data;
}

export async function markMemberDeathIncomplete(recordNo: string, reason: string) {
  const { data } = await apiClient.put<MemberDeathRecord>(
    `${BASE_PATH}/${encodeURIComponent(recordNo)}/mark-incomplete`,
    { reason }
  );
  return data;
}

export async function changeMemberDeathStatus(recordNo: string, status: string) {
  const { data } = await apiClient.put<MemberDeathRecord>(
    `${BASE_PATH}/${encodeURIComponent(recordNo)}/change-status`,
    { status }
  );
  return data;
}

export async function approveMemberDeathRecord(recordNo: string) {
  const { data } = await apiClient.put<MemberDeathRecord>(
    `${BASE_PATH}/${encodeURIComponent(recordNo)}/approve`
  );
  return data;
}

export async function rejectMemberDeathRecord(recordNo: string, reason: string) {
  const { data } = await apiClient.put<MemberDeathRecord>(
    `${BASE_PATH}/${encodeURIComponent(recordNo)}/reject`,
    { reason }
  );
  return data;
}

export async function getMemberDeathDocuments(recordNo: string) {
  const { data } = await apiClient.get<MemberDeathDocument[]>(
    `${BASE_PATH}/${encodeURIComponent(recordNo)}/documents`
  );
  return data;
}

export async function uploadMemberDeathDocument(
  recordNo: string,
  documentType: string,
  file: File
) {
  if (!recordNo) {
    throw new Error("Please save the record before uploading documents.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
  const url = `${baseUrl}${BASE_PATH}/${encodeURIComponent(recordNo)}/documents/${encodeURIComponent(documentType)}/upload`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(
      "Could not reach the server to upload the document. Check that the backend is running."
    );
  }

  const rawText = await response.text();
  let data: MemberDeathDocument | { message?: string } | null = null;
  try {
    data = rawText ? (JSON.parse(rawText) as MemberDeathDocument | { message?: string }) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      (data && "message" in data && data.message) ||
      rawText ||
      `Failed to upload document (HTTP ${response.status})`;
    throw new Error(message);
  }

  if (!data || !("fileName" in data)) {
    throw new Error("Upload succeeded but the server returned an unexpected response.");
  }

  return data as MemberDeathDocument;
}

export async function deleteMemberDeathDocument(documentId: number) {
  await apiClient.delete(`${BASE_PATH}/documents/${documentId}`);
}

export function getMemberDeathDocumentDownloadUrl(documentId: number) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
  return `${baseUrl}${BASE_PATH}/documents/${documentId}/download`;
}

export async function getMinorSavingsAccounts(memberId: string) {
  const { data } = await apiClient.get<MinorSavingsAccount[]>(
    `/api/members/${encodeURIComponent(memberId)}/minor-savings-accounts`
  );
  return data;
}

export async function getBanks() {
  const { data } = await apiClient.get<Array<{ id: number; name: string }>>("/api/banks");
  return data.map((bank) => ({
    id: bank.id,
    name: bank.name,
  }));
}

export async function getBranches(bankId: number | string) {
  const { data } = await apiClient.get<Array<{ id: number; name: string }>>(
    `/api/branches/${encodeURIComponent(String(bankId))}`
  );
  return data.map((branch) => ({
    id: branch.id,
    name: branch.name,
  }));
}

export async function getMemberBankAccounts(memberId: string) {
  const { data } = await apiClient.get<
    Array<{
      id: number;
      memberId: string;
      bankId: string;
      bankName: string;
      branchId: string;
      branchName: string;
      accountNumber: string;
    }>
  >(`/api/members/${encodeURIComponent(memberId)}/bank-accounts`);
  return data;
}
