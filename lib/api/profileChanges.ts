import { apiClient } from "@/lib/api/client";

/**
 * Client for the MMC28 "All Member Profile Change Requests List".
 *
 * The four Profile Change types are served by the unified backend endpoint
 * GET /api/profile-changes, which already implements every MMC28 filter.
 *
 * Member Transfers are NOT yet part of that endpoint — ProfileChangeType on the
 * backend has four values and no MEMBER_TRANSFER. Until the Member Transfer module
 * owner adds it, this file adapts the existing GET /api/member-transfers response
 * into the same row shape client-side. See MEMBER_TRANSFER_CONTRACT below; when the
 * server-side type lands, delete the adapter and add "MEMBER_TRANSFER" to the types
 * array — nothing in the screen itself needs to change.
 */

// ─── Types mirroring the backend enums ───────────────────────────────────────

/** ProfileChangeType on the backend, plus the not-yet-served MEMBER_TRANSFER. */
export type ProfileChangeType =
  | "BASIC_PROFILE"
  | "NAME"
  | "NOMINEE"
  | "REMITTANCE"
  | "MEMBER_TRANSFER";

/** ProfileChangeSortBy */
export type ProfileChangeSortBy = "REQUESTED_DATE" | "STATUS" | "MEMBER_ID";

/** RequestReceivedOn */
export type RequestReceivedOn =
  | "ALL_DAYS"
  | "THIS_MONTH"
  | "THIS_AND_LAST_MONTH"
  | "DATE_PERIOD";

/** The MMC28 statuses. Member Transfer's own enum maps onto these same four. */
export type ProfileChangeStatus =
  | "SUBMITTED_FOR_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "INACTIVE";

/** One normalised row — mirrors backend ProfileChangeListItemDTO. */
export interface ProfileChangeRow {
  type: ProfileChangeType;
  typeLabel: string;
  requestId: number | null;
  requestNo: string | null;
  status: string | null;
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

export const TYPE_LABELS: Record<ProfileChangeType, string> = {
  BASIC_PROFILE: "Basic Profile Changes",
  NAME: "Name Changes",
  NOMINEE: "Nominee Changes",
  REMITTANCE: "Remittance Amount Changes",
  MEMBER_TRANSFER: "Member Transfers",
};

export const STATUS_LABELS: Record<string, string> = {
  SUBMITTED_FOR_APPROVAL: "Submitted for Approval",
  SUBMITTEDFORAPPROVAL: "Submitted for Approval",
  SUBMITTED_TO_APPROVAL: "Submitted for Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  INACTIVE: "Inactive",
  NEW: "New",
  PENDING: "Pending",
};

/** Backend types only — MEMBER_TRANSFER is filtered out before the request goes out. */
const SERVER_TYPES: ProfileChangeType[] = ["BASIC_PROFILE", "NAME", "NOMINEE", "REMITTANCE"];

// ─── The four unified types ──────────────────────────────────────────────────

async function searchServerTypes(
  params: ProfileChangeSearchParams,
  types: ProfileChangeType[]
): Promise<ProfileChangeRow[]> {
  const query = new URLSearchParams();
  types.forEach((t) => query.append("types", t));
  params.statuses?.forEach((s) => query.append("statuses", s));
  params.locations?.forEach((l) => query.append("locations", l));
  if (params.receivedOn) query.append("receivedOn", params.receivedOn);
  if (params.from) query.append("from", params.from);
  if (params.to) query.append("to", params.to);
  if (params.search?.trim()) query.append("search", params.search.trim());
  if (params.sortBy) query.append("sortBy", params.sortBy);
  if (params.descending) query.append("descending", "true");

  const { data } = await apiClient.get<ProfileChangeRow[]>(
    `/api/profile-changes?${query.toString()}`
  );
  return data ?? [];
}

// ─── Member Transfers: interim client-side adapter ───────────────────────────

/**
 * MEMBER_TRANSFER_CONTRACT
 *
 * What the unified list needs from the Member Transfer module, so it can be served
 * by GET /api/profile-changes alongside the other four:
 *
 *   1. Add MEMBER_TRANSFER("MTR", "MEMBER_TRANSFER", "Member Transfers")
 *      to enums/ProfileChangeType.
 *   2. In ProfileChangeSearchService, add a fan-out branch over
 *      MemberTransferRepository producing ProfileChangeListItemDTO with:
 *
 *        type               = MEMBER_TRANSFER
 *        requestId          = MemberTransferRequest.id
 *        requestNo          = MemberTransferRequest.requestId          (e.g. MTR-001)
 *        status             = mapped from MemberTransferStatus:
 *                               SUBMITTEDFORAPPROVAL -> SUBMITTED_FOR_APPROVAL
 *                               APPROVED -> APPROVED
 *                               REJECTED -> REJECTED
 *                               INACTIVE -> INACTIVE
 *        requestedDate      = MemberTransferRequest.requestedDate
 *        submissionLocation = the district the request was raised in
 *        memberId/names/nic = resolved from Member, as the other four already do
 *
 * No change to Member Transfer's save/approve/reject logic is required — this is a
 * read/projection concern only.
 *
 * Until then, the rows are fetched from the existing GET /api/member-transfers and
 * filtered here. Interim only: filtering client-side means the whole table is pulled
 * on every retrieve, which is exactly what the server-side contract above removes.
 */
interface RawTransfer {
  id?: number;
  requestId?: string;
  status?: string;
  requestedDate?: string;
  member?: {
    memberId?: string;
    fullName?: string;
    nameAsInPayroll?: string;
    nameWithInitials?: string;
    nic?: string;
    educationalDistrict?: string;
  };
}

/** MemberTransferStatus -> the MMC28 status vocabulary used by the other four types. */
function normaliseTransferStatus(status?: string): string | null {
  if (!status) return null;
  const upper = status.toUpperCase().replace(/[\s_]/g, "");
  if (upper.startsWith("SUBMITTED")) return "SUBMITTED_FOR_APPROVAL";
  if (upper === "APPROVED") return "APPROVED";
  if (upper === "REJECTED") return "REJECTED";
  if (upper === "INACTIVE") return "INACTIVE";
  return status;
}

function withinReceivedOn(
  requestedDate: string | null,
  receivedOn: RequestReceivedOn | undefined,
  from?: string,
  to?: string
): boolean {
  if (!receivedOn || receivedOn === "ALL_DAYS") return true;
  if (!requestedDate) return true;

  const date = new Date(requestedDate);
  if (Number.isNaN(date.getTime())) return true;
  const today = new Date();

  if (receivedOn === "THIS_MONTH") {
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  }
  if (receivedOn === "THIS_AND_LAST_MONTH") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return date >= start;
  }
  // DATE_PERIOD
  if (from && date < new Date(from)) return false;
  if (to && date > new Date(to)) return false;
  return true;
}

async function searchMemberTransfers(
  params: ProfileChangeSearchParams
): Promise<ProfileChangeRow[]> {
  const { data } = await apiClient.get<RawTransfer[]>("/api/member-transfers");

  const rows: ProfileChangeRow[] = (data ?? []).map((t) => ({
    type: "MEMBER_TRANSFER" as const,
    typeLabel: TYPE_LABELS.MEMBER_TRANSFER,
    requestId: t.id ?? null,
    requestNo: t.requestId ?? null,
    status: normaliseTransferStatus(t.status),
    requestedDate: t.requestedDate ?? null,
    submissionLocation: t.member?.educationalDistrict ?? null,
    memberId: t.member?.memberId ?? null,
    fullName: t.member?.fullName ?? null,
    nameAsInPayroll: t.member?.nameAsInPayroll ?? null,
    nameWithInitials: t.member?.nameWithInitials ?? null,
    nic: t.member?.nic ?? null,
  }));

  const key = params.search?.trim().toLowerCase();

  return rows.filter((row) => {
    if (params.statuses?.length && !params.statuses.includes(row.status as ProfileChangeStatus)) {
      return false;
    }
    if (
      params.locations?.length &&
      row.submissionLocation &&
      !params.locations.some((l) => l.toLowerCase() === row.submissionLocation!.toLowerCase())
    ) {
      return false;
    }
    if (!withinReceivedOn(row.requestedDate, params.receivedOn, params.from, params.to)) {
      return false;
    }
    if (key) {
      // Same fields MMC28 specifies: Full Name, Name as in Payroll, Name with
      // Initials, Member Number and NIC.
      const haystack = [row.fullName, row.nameAsInPayroll, row.nameWithInitials, row.memberId, row.nic]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(key)) return false;
    }
    return true;
  });
}

// ─── Public entry point ──────────────────────────────────────────────────────

/**
 * Runs the MMC28 search. Fans out to the unified endpoint and, while Member
 * Transfers remain outside it, to the transfer endpoint — then merges and sorts so
 * the screen sees one list regardless of where a row came from.
 */
export async function searchProfileChanges(
  params: ProfileChangeSearchParams
): Promise<ProfileChangeRow[]> {
  const requested = params.types?.length ? params.types : (Object.keys(TYPE_LABELS) as ProfileChangeType[]);
  const serverTypes = requested.filter((t) => SERVER_TYPES.includes(t));
  const wantsTransfers = requested.includes("MEMBER_TRANSFER");

  // allSettled so one failing source does not blank the whole list.
  const [unified, transfers] = await Promise.allSettled([
    serverTypes.length ? searchServerTypes(params, serverTypes) : Promise.resolve([]),
    wantsTransfers ? searchMemberTransfers(params) : Promise.resolve([]),
  ]);

  const rows: ProfileChangeRow[] = [
    ...(unified.status === "fulfilled" ? unified.value : []),
    ...(transfers.status === "fulfilled" ? transfers.value : []),
  ];

  if (unified.status === "rejected" && transfers.status === "rejected") {
    throw unified.reason instanceof Error ? unified.reason : new Error("Failed to retrieve requests");
  }

  return sortRows(rows, params.sortBy ?? "REQUESTED_DATE", params.descending ?? false);
}

/**
 * Re-sorts the merged list. The unified endpoint sorts its own rows, but transfer
 * rows arrive separately, so the combined list has to be ordered here.
 */
function sortRows(
  rows: ProfileChangeRow[],
  sortBy: ProfileChangeSortBy,
  descending: boolean
): ProfileChangeRow[] {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "REQUESTED_DATE") {
      cmp = (a.requestedDate ?? "").localeCompare(b.requestedDate ?? "");
    } else if (sortBy === "STATUS") {
      cmp = (a.status ?? "").localeCompare(b.status ?? "");
    } else {
      cmp = (a.memberId ?? "").localeCompare(b.memberId ?? "");
    }
    return cmp;
  });
  return descending ? sorted.reverse() : sorted;
}

/**
 * Where a row opens. Every target is an EXISTING detail screen owned by another
 * module — this list only routes into them, it never replaces them.
 */
export function detailRouteFor(row: ProfileChangeRow): string | null {
  const id = row.requestId;
  switch (row.type) {
    case "NAME":
      return id ? `/membership/name-changes/${id}` : null;
    case "NOMINEE":
      return id ? `/membership/nommine-changes/${id}` : null;
    case "REMITTANCE":
      return id ? `/membership/directory/change-remittance?editId=${id}` : null;
    case "BASIC_PROFILE":
      return id ? `/membership/profile-changes/${id}` : null;
    case "MEMBER_TRANSFER":
      return row.requestNo
        ? `/membership/directory/change-memberTransfer?requestId=${encodeURIComponent(row.requestNo)}` +
            `&memberId=${encodeURIComponent(row.memberId ?? "")}&mode=view`
        : null;
    default:
      return null;
  }
}
