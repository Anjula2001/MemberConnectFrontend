import { apiClient } from "@/lib/api/client";

export type ApplicationStatus =
  | "NEW"
  | "SUBMITTED_FOR_APPROVAL"
  | "ADDED_TO_BOARD_APPROVAL_LIST"
  | "REJECTED"
  | "INACTIVE";

export type Gender = "MALE" | "FEMALE";
export type Language = "ENGLISH" | "SINHALA" | "TAMIL";
export type NatureOfOccupation =
  | "PERMANENT"
  | "PROBATION"
  | "TEMPORARY"
  | "CASUAL";
export type Identification = "NIC" | "Passport" | "DrivingLicense" | "BirthCertificate";

export interface MemberApplicationDTO {
  id?: number;
  applicationID?: string;
  status?: ApplicationStatus;
  applicationDate?: string;
  title?: string;
  fullName?: string;
  nameAsInPayroll?: string;
  nameWithInitials?: string;
  nicNumber?: string;
  dateOfBirth?: string;
  gender?: Gender;
  preferredLanguage?: Language;
  permanentPrivateAddress?: string;
  workingLocationType?: string;
  designation?: string;
  natureOfOccupation?: NatureOfOccupation;
  educationalDistrict?: string;
  educationalZone?: string;
  workingLocation?: string;
  workingLocationAddress?: string;
  computerNoInPayslip?: string;
  salaryPayingOffice?: string;
  officeTelephone?: string;
  privateTelephone?: string;
  mobileNumber?: string;
  emailAddress?: string;
  shareAccountAmount?: number;
  specialDepositAmount?: number;
  fixedDepositAmount?: number;
  scholarshipDeathDonationPensionAmount?: number;
  nomineeFullName?: string;
  nomineeRelationship?: string;
  identificationNumber?: string;
  identificationDetails?: string;
  nomineeAddress?: string;
  rejoinFlag?: boolean;
  identification?: Identification;
}

const BASE_PATH = "/api/applications";

export async function createMemberApplication(payload: MemberApplicationDTO) {
  const { data } = await apiClient.post<MemberApplicationDTO>(
    `${BASE_PATH}/createApplication`,
    payload
  );
  return data;
}

export async function getMemberApplications() {
  const { data } = await apiClient.get<MemberApplicationDTO[]>(
    `${BASE_PATH}/getApplication`
  );
  return data;
}

export async function getMemberApplicationById(id: number) {
  const { data } = await apiClient.get<MemberApplicationDTO>(`${BASE_PATH}/${id}`);
  return data;
}

export async function getMemberApplicationByNic(nic: string) {
  const { data } = await apiClient.get<MemberApplicationDTO>(
    `${BASE_PATH}/nic/${encodeURIComponent(nic)}`
  );
  return data;
}

export async function updateMemberApplication(
  id: number,
  payload: MemberApplicationDTO
) {
  const { data } = await apiClient.put<MemberApplicationDTO>(
    `${BASE_PATH}/updateApplication/${id}`,
    payload
  );
  return data;
}

export async function updateMemberApplicationPartial(
  id: number,
  payload: Partial<MemberApplicationDTO>
) {
  const { data } = await apiClient.patch<MemberApplicationDTO>(
    `${BASE_PATH}/updateApplicationPartial/${id}`,
    payload
  );
  return data;
}

export async function deleteMemberApplication(id: number) {
  const { data } = await apiClient.delete<string>(
    `${BASE_PATH}/deleteApplication/${id}`
  );
  return data;
}

export async function updateMemberApplicationStatus(
  id: number,
  status: ApplicationStatus
) {
  const { data } = await apiClient.patch<MemberApplicationDTO>(
    `${BASE_PATH}/${id}/status`,
    null,
    {
      params: { status },
    }
  );
  return data;
}
