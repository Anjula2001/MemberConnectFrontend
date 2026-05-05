import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

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

/** Payload sent to POST /api/death-donations (create) and PUT /{id}/save */
export interface DeathDonationRequestPayload {
  memberId: number;
  relationshipToDeceased: string;
  requestedDate: string;          // "YYYY-MM-DD"
  isDeceasedMember: boolean;
  deceasedMemberId?: string;
  deceasedName: string;
  maidenName?: string;
  deceasedDate: string;           // "YYYY-MM-DD"
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

/** Response shape returned by the backend */
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

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Create a brand-new Death Donation Request (status = NEW).
 * Maps to the "Save" button on a blank form.
 */
export async function createDeathDonationRequest(
  payload: DeathDonationRequestPayload
): Promise<DeathDonationResponse> {
  const { data } = await apiClient.post<DeathDonationResponse>(BASE, payload);
  return data;
}

/**
 * Update an existing NEW (draft) request without changing its status.
 * Maps to "Save" when re-editing a previously saved draft.
 */
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

/**
 * Submit the request for approval (NEW → SUBMITTED_FOR_APPROVAL).
 * Backend re-validates all mandatory fields.
 */
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

/**
 * Mark the request as INCOMPLETE with a reason.
 */
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

/**
 * Change the status of the request (e.g., NEW, INACTIVE).
 */
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

/**
 * Fetch a single request by its DB id.
 */
export async function getDeathDonationRequest(
  id: number
): Promise<DeathDonationResponse> {
  const { data } = await apiClient.get<DeathDonationResponse>(`${BASE}/${id}`);
  return data;
}

/**
 * Fetch all requests.
 */
export async function getAllDeathDonationRequests(): Promise<DeathDonationResponse[]> {
  const { data } = await apiClient.get<DeathDonationResponse[]>(BASE);
  return data;
}
