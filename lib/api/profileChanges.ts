import { apiClient } from "@/lib/api/client";

/**
 * The unified "All Member Profile Change Requests List"
 * (Requirement 02, MMC02 / MMC06 / MMC15 / MMC19).
 *
 * One endpoint across all four request types, so Type, Status, Location, Received On,
 * Search and Sort apply to the whole list rather than to one type at a time. The list
 * screen previously called each type's "get all" endpoint in turn and filtered what
 * came back in the browser.
 */

export type ProfileChangeType =
  | "BASIC_PROFILE"
  | "NAME"
  | "NOMINEE"
  | "REMITTANCE";

export type ProfileChangeStatus =
  | "NEW"
  | "SUBMITTED_FOR_APPROVAL"
  | "ADDED_TO_BOARD_APPROVAL_LIST"
  | "REJECTED"
  | "APPROVED"
  | "INACTIVE"
  | "PENDING";

export type RequestReceivedOn =
  | "ALL_DAYS"
  | "THIS_MONTH"
  | "THIS_AND_LAST_MONTH"
  | "DATE_PERIOD";

export type ProfileChangeSortBy = "REQUESTED_DATE" | "STATUS" | "MEMBER_ID";

export interface ProfileChangeListItem {
  type: ProfileChangeType;
  typeLabel: string;
  /** Primary key within its own table; used to address the record. */
  requestId: number | null;
  /** The user-facing Request ID, e.g. PCR-2026-001. Null before submit. */
  requestNo: string | null;
  status: ProfileChangeStatus | null;
  requestedDate: string | null;
  submissionLocation: string | null;
  memberId: string | null;
  fullName: string | null;
  nameAsInPayroll: string | null;
  nameWithInitials: string | null;
  nic: string | null;
}

export interface ProfileChangeSearchParams {
  types?: ProfileChangeType[];
  statuses?: ProfileChangeStatus[];
  locations?: string[];
  receivedOn?: RequestReceivedOn;
  from?: string;
  to?: string;
  search?: string;
  sortBy?: ProfileChangeSortBy;
  descending?: boolean;
}

export async function searchProfileChanges(params: ProfileChangeSearchParams) {
  const { data } = await apiClient.get<ProfileChangeListItem[]>("/api/profile-changes", {
    params,
    // Repeat the key for each value (types=NAME&types=NOMINEE) rather than sending the
    // array as one bracketed key, which Spring will not bind to a List.
    paramsSerializer: {
      indexes: null,
    },
  });
  return data;
}

/** The status set the SRS offers for a given type; Name and Nominee add the board step. */
export function statusOptionsFor(type: ProfileChangeType): ProfileChangeStatus[] {
  const base: ProfileChangeStatus[] = ["SUBMITTED_FOR_APPROVAL", "REJECTED", "APPROVED", "INACTIVE"];
  if (type === "NAME" || type === "NOMINEE") {
    return ["SUBMITTED_FOR_APPROVAL", "ADDED_TO_BOARD_APPROVAL_LIST", "REJECTED", "APPROVED", "INACTIVE"];
  }
  return base;
}

/**
 * MMC08 / MMC21: only Name and Nominee requests sitting on "Submitted for Approval" or
 * "Rejected" may be pulled into an approval list. The previous check excluded only
 * already-approved rows, so a request already on a list could be added to a second one.
 */
export function isListable(row: ProfileChangeListItem): boolean {
  if (row.type !== "NAME" && row.type !== "NOMINEE") return false;
  return row.status === "SUBMITTED_FOR_APPROVAL" || row.status === "REJECTED";
}
