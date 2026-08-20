import { apiClient } from "@/lib/api/client";
import type { RemittanceAccountCode } from "@/lib/api/membershipConfig";

const BASE_PATH = "/api/member-financials";

/** Where an operative account's details came from. */
export type AccountDataSource = "MANUAL" | "FINANCE";

export interface MemberRemittanceDTO {
  id?: number | null;
  accountCode?: RemittanceAccountCode;
  accountName?: string;
  amount?: number | null;
  effectiveFrom?: string | null;
  /** Remittance Master rules, so the UI can lock/validate without a second call. */
  fixedAmount?: number | null;
  minimumAmount?: number | null;
}

export interface MemberAccountDTO {
  id?: number | null;
  accountCode?: RemittanceAccountCode;
  accountName?: string;
  accountNumber?: string | null;
  balance?: number | null;
  openedDate?: string | null;
  source?: AccountDataSource | null;
  lastSyncedAt?: string | null;
}

export interface MemberFinancialsDTO {
  memberId?: number;
  memberCode?: string;
  memberName?: string;
  remittances?: MemberRemittanceDTO[];
  accounts?: MemberAccountDTO[];
  /** True while no operative account has been synced from the Finance Module. */
  awaitingFinanceIntegration?: boolean;
  /**
   * Temporary Scholarship finance eligibility, held on the Member until the Finance
   * Module lands. Omit on a PUT to leave the stored values untouched.
   */
  isRemittance?: boolean;
  isSettlement?: boolean;
}

export async function getMemberFinancials(memberId: number) {
  const { data } = await apiClient.get<MemberFinancialsDTO>(`${BASE_PATH}/${memberId}`);
  return data;
}

export async function updateMemberFinancials(
  memberId: number,
  payload: MemberFinancialsDTO
) {
  const { data } = await apiClient.put<MemberFinancialsDTO>(`${BASE_PATH}/${memberId}`, payload);
  return data;
}
