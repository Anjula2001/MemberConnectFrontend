import { apiClient } from "./client";


export type DeathDonationStatus =
  | "NEW"
  | "SUBMITTED_FOR_APPROVAL"
  | "DISTRICT_COMMITTEE"
  | "PD_COMMITTEE"
  | "APPROVED"
  | "REJECTED"
  | "INCOMPLETE"
  | "INACTIVE";

export interface RelativeDTO {
  memberId: string;
  relationshipToDeceased: string;
  isAuto: boolean;
}

export interface DeathDonationRequestPayload {
  memberId: number;
  relationshipToDeceased: string;
  requestedDate: string;          
  isDeceasedMember: boolean;
  deceasedMemberId?: string;
  deceasedName: string;
  maidenName?: string;
  deceasedDate: string;           
  deathCertificateNumber: string;
  placeOfWork?: string;
  concernsIdentified?: string;
  relatives?: RelativeDTO[];
}

export interface RelativeResponse {
  id: number;
  memberId: string;
  relationshipToDeceased: string;
  isAuto: boolean;
}

export interface DocumentResponse {
  id: number;
  documentType: string;
  fileName: string;
  mimeType: string;
  mandatory: boolean;
  uploadedAt: string;
}

// Response return
export interface DeathDonationResponse {
  id: number;
  requestId: string;
  memberId: number;
  memberName: string;
  relationshipToDeceased: string;
  requestedDate: string;
  isDeceasedMember: boolean;
  deceasedMemberId?: string;
  deceasedName: string;
  maidenName?: string;
  deceasedDate: string;
  deathCertificateNumber: string;
  placeOfWork?: string;
  concernsIdentified?: string;
  status: DeathDonationStatus;
  incompleteReason?: string;
  createdAt: string;
  updatedAt: string;
  relatives: RelativeResponse[];
  documents: DocumentResponse[];
}

const BASE = "/api/death-donations";


// Create new Death Donation Request

export async function createDeathDonationRequest(
  payload: DeathDonationRequestPayload
): Promise<DeathDonationResponse> {
  const { data } = await apiClient.post<DeathDonationResponse>(BASE, payload);
  return data;
}

// Update request

export async function saveDeathDonationRequest(
  id: number,
  payload: DeathDonationRequestPayload
): Promise<DeathDonationResponse> {
  const { data } = await apiClient.put<DeathDonationResponse>(
    `${BASE}/${id}/save`,
    payload
  );
  return data;
}

// Submit the request for approval

export async function submitDeathDonationRequest(
  id: number,
  payload?: Partial<DeathDonationRequestPayload>
): Promise<DeathDonationResponse> {
  const { data } = await apiClient.put<DeathDonationResponse>(
    `${BASE}/${id}/submit`,
    payload ?? {}
  );
  return data;
}

// Mark the request as Incomplete 
 
export async function markDeathDonationIncomplete(
  id: number,
  reason: string
): Promise<DeathDonationResponse> {
  const { data } = await apiClient.put<DeathDonationResponse>(
    `${BASE}/${id}/incomplete`,
    { reason }
  );
  return data;
}

// Change the status

export async function changeDeathDonationStatus(
  id: number,
  status: DeathDonationStatus
): Promise<DeathDonationResponse> {
  const { data } = await apiClient.put<DeathDonationResponse>(
    `${BASE}/${id}/status`,
    { status }
  );
  return data;
}


 // Fetch request by id.
 
export async function getDeathDonationRequest(
  id: number
): Promise<DeathDonationResponse> {
  const { data } = await apiClient.get<DeathDonationResponse>(`${BASE}/${id}`);
  return data;
}


 // Fetch all 

export async function getAllDeathDonationRequests(): Promise<DeathDonationResponse[]> {
  const { data } = await apiClient.get<DeathDonationResponse[]>(BASE);
  return data;
}
