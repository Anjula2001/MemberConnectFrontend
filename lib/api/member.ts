import { apiClient } from "@/lib/api/client";

/**
 * Mirrors the backend MemberStatus enum. The termination and retirement
 * in-progress states were missing here, which made TypeScript narrow away
 * comparisons against statuses the API genuinely returns.
 */
export type MemberStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "RESIGNED"
  | "TERMINATION_REQUESTED"
  | "TERMINATION_APPROVED"
  | "TERMINATED"
  | "RETIREMENT_REQUESTED"
  | "RETIREMENT_APPROVED"
  | "RETIRED"
  | "MEMBER_DEATH_RECORDED"
  | "MEMBER_DEATH_APPROVED"
  | "DECEASED"
  | "SELECTED_FOR_DORMANT"
  | "SENT_FOR_DORMANT_APPROVAL"
  | "INACTIVE_DORMANT";

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
  // The District Office branch this member registered/is administered through —
  // distinct from educationalDistrict (the member's working district).
  submissionLocation?: string;
  // Membership documentation tracking (MR15-18). Null means not yet done.
  membershipCardPrintedAt?: string | null;
  signatureCardPrintedAt?: string | null;
  passbookPrintedAt?: string | null;
  documentsDispatchedAt?: string | null;
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

/**
 * Looks a member up by their business identifier - the "MEM-..." string the screens
 * carry around - rather than the numeric primary key.
 *
 * The profile Actions menu passes `?memberId=MEM-DEMO-037`, so the four profile change
 * screens were calling getMemberById(Number(memberId)), which is NaN for every real
 * member. That produced "Could not load data. Check backend connection." on a perfectly
 * healthy backend, with every current value blank.
 */
export async function getMemberByMemberId(memberId: string) {
  const { data } = await apiClient.get<MemberDTO>(
    `${BASE_PATH}/by-member-id/${encodeURIComponent(memberId)}`
  );
  return data;
}

/**
 * Resolves whichever member identifier a screen was handed.
 *
 * The profile Actions menu passes the membership number (`?memberId=MEM-DEMO-037`),
 * while older links passed the numeric primary key. Screens that assumed one or the
 * other broke on the links they did not expect, so they all go through this instead of
 * guessing.
 *
 * A value of pure digits is treated as the primary key; anything else as the membership
 * number. Membership numbers always carry a prefix, so the two cannot be confused.
 */
export async function resolveMember(idOrMemberId: string) {
  return /^\d+$/.test(idOrMemberId.trim())
    ? getMemberById(Number(idOrMemberId))
    : getMemberByMemberId(idOrMemberId.trim());
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
  /** The member's WORKING district — distinct from `locations` (the District Office). */
  educationalDistrict?: string;
  /** Membership Start Date period, ISO dates. */
  membershipStartFrom?: string;
  membershipStartTo?: string;
  /**
   * "Members without <document>" (MR15/16/17) - keeps only members whose copy of this
   * document has not been printed. Applied by the server; filtering it in the browser
   * meant fetching every active member and discarding the printed ones.
   */
  withoutDocument?: "MEMBERSHIP_CARD" | "SIGNATURE_CARD" | "PASSBOOK";
  /**
   * Board Meeting Date period (MR15/16/17) - keeps only members approved by a board
   * meeting inside it. Omitting both is the spec's "Any". Resolved server-side through
   * the application the member was created from, since a member has no meeting date.
   */
  boardMeetingFrom?: string;
  boardMeetingTo?: string;
  /** memberID | status | working-location-type | district | zone; default membership date. */
  sortBy?: string;
  /** "asc" (default) or "desc". */
  sortDirection?: "asc" | "desc";
}

export async function searchMembers(params: MemberSearchParams) {
  const searchParams: Record<string, string | string[]> = {};
  if (params.query) searchParams.query = params.query;
  if (params.statuses && params.statuses.length > 0) searchParams.statuses = params.statuses;
  if (params.locations && params.locations.length > 0) searchParams.locations = params.locations;
  if (params.workingLocationType) searchParams.workingLocationType = params.workingLocationType;
  if (params.educationalZone) searchParams.educationalZone = params.educationalZone;
  if (params.educationalDistrict) searchParams.educationalDistrict = params.educationalDistrict;
  if (params.membershipStartFrom) searchParams.membershipStartFrom = params.membershipStartFrom;
  if (params.membershipStartTo) searchParams.membershipStartTo = params.membershipStartTo;
  if (params.withoutDocument) searchParams.withoutDocument = params.withoutDocument;
  if (params.boardMeetingFrom) searchParams.boardMeetingFrom = params.boardMeetingFrom;
  if (params.boardMeetingTo) searchParams.boardMeetingTo = params.boardMeetingTo;
  if (params.sortBy) searchParams.sortBy = params.sortBy;
  if (params.sortDirection) searchParams.sortDirection = params.sortDirection;

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
