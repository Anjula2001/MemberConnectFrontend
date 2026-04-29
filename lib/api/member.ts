import { apiClient } from "@/lib/api/client";

export type MemberStatus = 
"ACTIVE" | "INACTIVE" | "RESIGNED" | "TERMINATED" | "DECEASED";

export type Gender = "MALE" | "FEMALE";

export type Language = "ENGLISH" | "SINHALA" | "TAMIL";

export type NatureOfOccupation = "PERMANENT" | "PROBATION" | "TEMPORARY" | "CASUAL";

export type Identification = "NIC" | "Passport" | "DrivingLicense" | "BirthCertificate";

export interface MemberDTO {
  id?: number;
  memberId?: string;
  applicationId?: number;         // FK to Member_Application — link approved application to member
  memberType?: string;
  status?: MemberStatus;
  membershipStartDate?: string;   // ISO date string from backend
  title?: string;
  fullName?: string;
  nameAsInPayroll?: string;
  nameWithInitials?: string;
  nic?: string;                   // field name used by the backend Member entity
  nicNumber?: string;             // alias kept for registration forms
  dateOfBirth?: string;
  gender?: Gender;
  preferredLanguage?: Language;
  permanentPrivateAddress?: string;
  privateTelephone?: string;
  mobileNumber?: string;
  emailAddress?: string;
  computerNoInPayslip?: string;
  salaryPayingOffice?: string;
  profilePictureUrl?: string;
  signatureUrl?: string;
  workingLocationType?: string;
  designation?: string;
  natureOfOccupation?: NatureOfOccupation;
  educationalDistrict?: string;
  educationalZone?: string;
  workingLocation?: string;
  workingLocationAddress?: string;
  officeTelephone?: string;
  nomineeFullName?: string;
  nomineeRelationship?: string;
  nomineeAddress?: string;
  identification?: Identification;
  identificationNumber?: string;
  identificationDetails?: string;
  // registration-form-only fields
  shareAccountAmount?: number;
  specialDepositAmount?: number;
  fixedDepositAmount?: number;
  scholarshipDeathDonationPensionAmount?: number | string;
  boardDecisionReason?: string;
  rejoinFlag?: boolean;
}

const BASE_PATH = "/api/members";

export async function createMember(payload: MemberDTO) {
  const { data } = await apiClient.post<MemberDTO>(
    `${BASE_PATH}/createMember`,
    payload
  );
  return data;
}

export async function getMembers() {
  const { data } = await apiClient.get<MemberDTO[]>(
    `${BASE_PATH}/getMembers`);
  return data;
}

export async function getMemberById(id: number) {
  const { data } = await apiClient.get<MemberDTO>(
    `${BASE_PATH}/getMemberById/${id}`);
  return data;
}

export async function getMemberByNic(nic: string) {
  const { data } = await apiClient.get<MemberDTO>(
    `${BASE_PATH}/getMemberByNic/${nic}`);
  return data;
}

export interface MemberSearchParams {
  query?: string;
  statuses?: string[];
  locations?: string[];
  workingLocationType?: string;
  educationalZone?: string;
}

export async function searchMembers(params: MemberSearchParams) {
  const searchParams: Record<string, string | string[]> = {};
  if (params.query) searchParams.query = params.query;
  if (params.statuses && params.statuses.length > 0) searchParams.statuses = params.statuses;
  if (params.locations && params.locations.length > 0) searchParams.locations = params.locations;
  if (params.workingLocationType) searchParams.workingLocationType = params.workingLocationType;
  if (params.educationalZone) searchParams.educationalZone = params.educationalZone;

  const { data } = await apiClient.get<MemberDTO[]>(`${BASE_PATH}/search`, {
    params: searchParams,
    paramsSerializer: { indexes: null }, // serialize arrays as ?statuses=A&statuses=B
  });
  return data;
}

export async function updateMember(id: number, payload: MemberDTO) {
  const { data } = await apiClient.put<MemberDTO>(
    `${BASE_PATH}/updateMember/${id}`,
    payload
  );
  return data;
}

export async function deleteMember(id: number) {
  const { data } = await apiClient.delete<string>(
    `${BASE_PATH}/deleteMember/${id}`
  );
  return data;
}

export async function updateMemberStatus(id: number, status: MemberStatus) {
  const { data } = await apiClient.patch<MemberDTO>(
    `${BASE_PATH}/${id}/status`,
    null,
    {
      params: { status },
    }
  );
  return data;
}
