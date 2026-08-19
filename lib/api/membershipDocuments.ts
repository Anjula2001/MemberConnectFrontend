import { apiClient } from "@/lib/api/client";
import type { MemberDTO } from "@/lib/api/member";

const BASE_PATH = "/api/membership-documents";

/** The three documents printed for a new member (MR15-17). */
export type MembershipDocumentType =
  | "MEMBERSHIP_CARD"
  | "SIGNATURE_CARD"
  | "PASSBOOK";

export interface MemberDocumentDispatchDTO {
  id?: number;
  dispatchNo?: string;
  dispatchDate?: string;
  dispatchedBy?: string;
  createdAt?: string;
  memberCount?: number;
  /** Only populated when a single dispatch is fetched (backs the Dispatch Report). */
  members?: MemberDTO[];
}

/**
 * Records that a document was printed for the given members.
 *
 * `reprint` is limited to a single member by the backend — reprinting is a
 * deliberate one-at-a-time action, so a bulk Select All can never reissue cards.
 */
export async function markDocumentPrinted(
  type: MembershipDocumentType,
  memberIds: number[],
  reprint = false
) {
  const { data } = await apiClient.post<MemberDTO[]>(
    `${BASE_PATH}/${type}/print`,
    { memberIds, reprint }
  );
  return data;
}

/** Members eligible for dispatch. Honours the all-documents-printed setting. */
export async function getDispatchCandidates(onlyNonDispatched = true) {
  const { data } = await apiClient.get<MemberDTO[]>(
    `${BASE_PATH}/dispatch/candidates`,
    { params: { onlyNonDispatched } }
  );
  return data;
}

export async function createDispatch(memberIds: number[]) {
  const { data } = await apiClient.post<MemberDocumentDispatchDTO>(
    `${BASE_PATH}/dispatch`,
    { memberIds }
  );
  return data;
}

export async function getDispatches() {
  const { data } = await apiClient.get<MemberDocumentDispatchDTO[]>(
    `${BASE_PATH}/dispatch`
  );
  return data;
}

export async function getDispatch(dispatchNo: string) {
  const { data } = await apiClient.get<MemberDocumentDispatchDTO>(
    `${BASE_PATH}/dispatch/${encodeURIComponent(dispatchNo)}`
  );
  return data;
}
