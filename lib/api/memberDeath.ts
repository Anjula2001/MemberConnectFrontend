import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:8080",
});

const BASE = "/api/member-deaths";

export type DeathRecordStatus =
  | "NEW"
  | "SUBMITTED_FOR_APPROVAL"
  | "DISTRICT_COMMITTEE"
  | "PD_COMMITTEE"
  | "APPROVED"
  | "REJECTED"
  | "INCOMPLETE"
  | "INACTIVE";

export interface MinorAccountDTO {
  minorAccountNumber: string;
  minorAccountHolderName: string;
  disbursementBank: string;
  branch: string;
  disbursementAccountNumber: string;
}

export interface DocumentDTO {
  documentType: string;
  fileName: string;
  mimeType?: string;
  mandatory?: boolean;
}

export interface CreateMemberDeathDTO {
  memberId: number;
  informedDate: string;
  deceasedDate: string;
  causeOfDeath: string;
  comment?: string;
  concernsIdentified?: string;
  nomineeFullName?: string;
  nomineeAddress?: string;
  nomineeRelationship?: string;
  nomineeIdentificationTypeAndNumber?: string;
  nomineeMobileNo: string;
  nomineeEmailAddress?: string;
  bank: string;
  bankBranch: string;
  accountNumber: string;
  minorAccounts?: MinorAccountDTO[];
  documents?: DocumentDTO[];
}

export interface MemberDeathResponseDTO extends Omit<CreateMemberDeathDTO, "memberId"> {
  id: number;
  recordId: string;
  memberId: number;
  memberName: string;
  memberNic: string;
  status: DeathRecordStatus;
  incompleteReason?: string;
  createdAt: string;
  updatedAt: string;
}

export async function createMemberDeathRecord(data: CreateMemberDeathDTO): Promise<MemberDeathResponseDTO> {
  const res = await apiClient.post<MemberDeathResponseDTO>(BASE, data);
  return res.data;
}

export async function saveMemberDeathRecord(id: number, data: CreateMemberDeathDTO): Promise<MemberDeathResponseDTO> {
  const res = await apiClient.put<MemberDeathResponseDTO>(`${BASE}/${id}/save`, data);
  return res.data;
}

export async function submitMemberDeathRecord(id: number, data?: CreateMemberDeathDTO): Promise<MemberDeathResponseDTO> {
  const res = await apiClient.put<MemberDeathResponseDTO>(`${BASE}/${id}/submit`, data);
  return res.data;
}

export async function markMemberDeathIncomplete(id: number, reason: string): Promise<MemberDeathResponseDTO> {
  const res = await apiClient.put<MemberDeathResponseDTO>(`${BASE}/${id}/incomplete`, { reason });
  return res.data;
}

export async function getMemberDeathRecord(id: number): Promise<MemberDeathResponseDTO> {
  const res = await apiClient.get<MemberDeathResponseDTO>(`${BASE}/${id}`);
  return res.data;
}

export async function getAllMemberDeathRecords(): Promise<MemberDeathResponseDTO[]> {
  const res = await apiClient.get<MemberDeathResponseDTO[]>(BASE);
  return res.data;
}
