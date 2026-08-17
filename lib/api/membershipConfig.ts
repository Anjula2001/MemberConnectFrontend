import { apiClient } from "@/lib/api/client";

// ─── Remittance Master ────────────────────────────────────────────────────────

export type RemittanceAccountCode =
  | "SHARE"
  | "SPECIAL_DEPOSIT"
  | "FIXED_DEPOSIT"
  | "SCHOLARSHIP_DEATH_DONATION_PENSION";

export interface RemittanceMasterAccountDTO {
  id?: number;
  accountCode: RemittanceAccountCode;
  accountName: string;
  /** When set, the application field is auto-filled with this and locked. */
  fixedAmount?: number | null;
  /** When set, a user-entered amount must not be less than this. */
  minimumAmount?: number | null;
  mandatory?: boolean;
  displayOrder?: number;
  active?: boolean;
}

const REMITTANCE_PATH = "/api/remittance-master";

/** Active accounts only — what the registration form should render. */
export async function getActiveRemittanceAccounts() {
  const { data } = await apiClient.get<RemittanceMasterAccountDTO[]>(
    `${REMITTANCE_PATH}/active`
  );
  return data;
}

/** All accounts incl. inactive — for the Accounts-owned config screen. */
export async function getRemittanceMaster() {
  const { data } = await apiClient.get<RemittanceMasterAccountDTO[]>(REMITTANCE_PATH);
  return data;
}

export async function updateRemittanceAccount(
  id: number,
  payload: Partial<RemittanceMasterAccountDTO>
) {
  const { data } = await apiClient.put<RemittanceMasterAccountDTO>(
    `${REMITTANCE_PATH}/${id}`,
    payload
  );
  return data;
}

// ─── Membership eligibility (age limits) ──────────────────────────────────────

export interface MembershipEligibilityConfigDTO {
  id?: number;
  minimumAge: number;
  maximumAge: number;
}

const ELIGIBILITY_PATH = "/api/membership-eligibility";

export async function getMembershipEligibility() {
  const { data } = await apiClient.get<MembershipEligibilityConfigDTO>(ELIGIBILITY_PATH);
  return data;
}

export async function updateMembershipEligibility(
  payload: MembershipEligibilityConfigDTO
) {
  const { data } = await apiClient.put<MembershipEligibilityConfigDTO>(
    ELIGIBILITY_PATH,
    payload
  );
  return data;
}
