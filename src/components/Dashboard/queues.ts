import { apiClient } from "@/lib/api/client"
import { searchMembers } from "@/lib/api/member"
import { searchDeathDonationRequests } from "@/lib/api/deathDonation"
import { searchMemberDeathRecords } from "@/lib/api/memberDeath"
import type { UserRole } from "@/lib/auth-context"

/**
 * What each role is actually waiting to act on.
 *
 * The dashboard used to show four fixed counters plus a "Pending Tasks" card that was
 * mostly totals, and both were gated on REGISTRATION_ROLES. That left five of the nine
 * roles with one card or none at all - DISTRICT_COMMITTEE and PD_COMMITTEE landed on a
 * completely empty page despite both being named actors in the Member Death flow
 * (MMT23 / MMT24). Every queue below is a real work item owned by a real SRS actor.
 *
 * Roles are the SRS actors as this codebase names them:
 *   DISTRICT_OFFICE / HEAD_OFFICE  - "District Office System User" / "Head Office System User"
 *   BOARD_SECRETARY                - the Board Secretariat seat
 *   ACCOUNTS                       - "Head Office - Finance Department"
 *   SCHOLARSHIP_OFFICER            - the University Scholarship Committee (MMS26)
 *   DISTRICT_COMMITTEE / PD_COMMITTEE - the two Member Death approval levels
 *   DEATH_DONATION_OFFICER         - Death Donation (MMD)
 */

/** Everything a queue needs to scope itself to the caller. */
export interface QueueContext {
  /** Set for a District Office user, so their counts cover their own district only. */
  district: string | null
}

export interface QueueDef {
  id: string
  /** The work item, phrased as a thing to do rather than a table name. */
  label: string
  /** Why it is waiting - shown under the count. */
  hint: string
  href: string
  roles: UserRole[]
  load: (ctx: QueueContext) => Promise<number>
}

/** Counts rows from an endpoint that answers with an array. */
async function countFrom(
  path: string,
  params?: Record<string, string | string[]>
): Promise<number> {
  const { data } = await apiClient.get<unknown[]>(path, { params })
  return Array.isArray(data) ? data.length : 0
}

/**
 * Asks a paged listing endpoint for its total, rather than for the rows.
 *
 * These cards used to call /api/applications/search and take the length of the
 * array. Now that the endpoint pages, one row is enough to carry back the total the
 * database counted — and the dashboard stops downloading a whole result set per card
 * to arrive at a single number.
 */
async function countOfPage(
  path: string,
  params?: Record<string, string | string[]>
): Promise<number> {
  const { data } = await apiClient.get<{ totalElements?: number }>(path, {
    params: { ...params, page: "0", size: "1" },
    // Repeat keys for arrays (statuses=A&statuses=B) rather than axios's default
    // "statuses[]=A". Spring binds either form to a List<T> @RequestParam, so this
    // matches the other callers of this endpoint rather than fixing anything.
    paramsSerializer: { indexes: null },
  })
  return typeof data?.totalElements === "number" ? data.totalElements : 0
}

/**
 * Asks an endpoint for a count, rather than for the rows behind it.
 *
 * Replaces the browser-side filter these queues used to run: each one fetched a whole
 * table and counted the matching rows locally, because the listing endpoints took no
 * status parameter. They now expose /count, which answers with a database COUNT.
 */
async function countOf(
  path: string,
  params?: Record<string, string | string[]>
): Promise<number> {
  const { data } = await apiClient.get<{ count?: number }>(path, { params })
  return typeof data?.count === "number" ? data.count : 0
}

/**
 * Death donation requests that are still someone's work.
 *
 * The card counts open requests, so the settled ones are excluded. Passing no statuses
 * at all - which is what this queue used to do - counted approved, rejected and
 * inactive requests too, and reported them as outstanding.
 */
const OPEN_DONATION_STATUSES = [
  "NEW",
  "SUBMITTED_FOR_APPROVAL",
  "DISTRICT_COMMITTEE",
  "PD_COMMITTEE",
  "INCOMPLETE",
]

const REGISTRATION: UserRole[] = ["SUPER_ADMIN", "HEAD_OFFICE", "BOARD_SECRETARY", "DISTRICT_OFFICE"]
const BOARD: UserRole[] = ["SUPER_ADMIN", "HEAD_OFFICE", "BOARD_SECRETARY"]

export const QUEUES: QueueDef[] = [
  // ── District Office ───────────────────────────────────────────────────────
  {
    id: "draft-applications",
    label: "Draft registrations",
    hint: "Saved but not yet submitted for approval",
    href: "/membership/new-registrations",
    roles: ["SUPER_ADMIN", "DISTRICT_OFFICE"],
    load: (ctx) =>
      countOfPage("/api/applications/search", {
        statuses: ["NEW"],
        ...(ctx.district ? { locations: [ctx.district] } : {}),
      }),
  },
  {
    id: "rejected-applications",
    label: "Rejected registrations",
    hint: "Returned by the board - need rework or re-listing",
    href: "/membership/new-registrations",
    roles: REGISTRATION,
    load: (ctx) =>
      countOfPage("/api/applications/search", {
        statuses: ["REJECTED"],
        ...(ctx.district ? { locations: [ctx.district] } : {}),
      }),
  },

  // ── Head Office / Board ───────────────────────────────────────────────────
  {
    id: "awaiting-board-list",
    label: "Awaiting a board approval list",
    hint: "Submitted registrations not yet attached to a meeting",
    href: "/membership/board-approvals",
    roles: BOARD,
    load: () =>
      countOfPage("/api/applications/search", {
        statuses: ["SUBMITTED_FOR_APPROVAL"],
      }),
  },
  {
    id: "lists-to-process",
    label: "Board lists to process",
    hint: "Created for a meeting, decision not yet recorded",
    href: "/membership/board-approvals",
    roles: BOARD,
    // TWO tables, not one. board_approval_list holds membership, name-change and
    // nominee-change lists; termination lists are a separate entity with its own
    // controller. The Board Approvals screen merges both into combinedApprovalLists,
    // so a count that reads only the first undercounts exactly what that screen shows
    // - two unprocessed lists rendering as "1" on the dashboard.
    //
    // Grade 5 and dormant lists are deliberately NOT added in: they live on their own
    // screens, and folding them in here would make this card overcount relative to the
    // screen it links to. They have their own cards below.
    load: async () => {
      const [membership, termination] = await Promise.all([
        countOf("/api/board-approval-lists/count", { statuses: ["CREATED"] }),
        countOf("/api/termination-approval-lists/count", { statuses: ["CREATED"] }),
      ])
      return membership + termination
    },
  },
  {
    id: "g5-lists-to-process",
    label: "Grade 5 lists to process",
    hint: "Scholarship approval lists awaiting a board decision",
    href: "/scholarships/grade-5/approval-lists",
    // Mirrors who holds G5_LIST_VIEW.
    roles: ["SUPER_ADMIN", "HEAD_OFFICE", "BOARD_SECRETARY", "SCHOLARSHIP_OFFICER", "ACCOUNTS"],
    load: () => countOf("/api/grade5/approval-lists/count", { statuses: ["CREATED"] }),
  },
  {
    id: "dormant-lists-to-process",
    label: "Dormant lists to process",
    hint: "Dormancy approval lists awaiting a board decision",
    href: "/membership/dormant/approval-lists",
    // DORMANT_BOARD_ROLES - the board half of MMD13-MMD18.
    roles: BOARD,
    load: () =>
      countOf("/api/dormant-members/approval-lists/count", { statuses: ["CREATED"] }),
  },

  // ── Terminations ──────────────────────────────────────────────────────────
  {
    id: "terminations",
    label: "Termination requests",
    hint: "Submitted or sitting on an approval list",
    href: "/membership/termination",
    roles: REGISTRATION,
    load: () =>
      countFrom("/api/termination-requests", {
        statuses: ["SUBMITTED_FOR_APPROVAL", "ADDED_TO_APPROVAL_LIST"],
      }),
  },

  // ── Member Death: the two committee levels (MMT23 / MMT24) ────────────────
  {
    id: "death-district-committee",
    label: "Member deaths at District Committee",
    hint: "Escalated from the District Office, waiting on your decision",
    href: "/membership/directory",
    roles: ["SUPER_ADMIN", "DISTRICT_COMMITTEE"],
    load: async () =>
      (await searchMemberDeathRecords({ statuses: ["DISTRICT_COMMITTEE"] })).length,
  },
  {
    id: "death-pd-committee",
    label: "Member deaths at P&D Committee",
    hint: "Escalated from the District Committee, waiting on your decision",
    href: "/membership/directory",
    roles: ["SUPER_ADMIN", "PD_COMMITTEE"],
    load: async () =>
      (await searchMemberDeathRecords({ statuses: ["PD_COMMITTEE"] })).length,
  },

  // ── Death Donation ────────────────────────────────────────────────────────
  {
    id: "death-donations",
    label: "Death donation requests",
    hint: "Open requests across the death donation flow",
    href: "/death-donation",
    roles: ["SUPER_ADMIN", "HEAD_OFFICE", "BOARD_SECRETARY", "DISTRICT_OFFICE", "DEATH_DONATION_OFFICER"],
    load: async () =>
      (await searchDeathDonationRequests({ statuses: OPEN_DONATION_STATUSES })).length,
  },

  // ── Scholarships ──────────────────────────────────────────────────────────
  {
    id: "g5-pending",
    label: "Grade 5 requests awaiting the board",
    hint: "Submitted for normal or deviation approval",
    href: "/scholarships/grade-5",
    roles: ["SUPER_ADMIN", "HEAD_OFFICE", "BOARD_SECRETARY", "DISTRICT_OFFICE", "SCHOLARSHIP_OFFICER", "ACCOUNTS"],
    load: () =>
      countFrom("/api/grade5/requests/search", {
        statuses: ["SUBMITTED_FOR_NORMAL_APPROVAL", "SUBMITTED_FOR_DEVIATION_APPROVAL"],
      }),
  },
  {
    id: "us-committee",
    label: "University requests awaiting Committee",
    hint: "The Committee gate before board approval",
    href: "/scholarships/university",
    roles: ["SUPER_ADMIN", "SCHOLARSHIP_OFFICER"],
    // /university-scholarships/search already filters by status server-side; the
    // unfiltered listing this used to read returned every request to count a few.
    load: () =>
      countFrom("/api/university-scholarships/search", {
        statuses: ["SUBMITTED_FOR_COMMITTEE_APPROVAL"],
      }),
  },

  // ── Finance ───────────────────────────────────────────────────────────────
  {
    id: "awaiting-activation",
    label: "Members awaiting activation",
    hint: "Board-approved, waiting on Finance to open their accounts (MR12)",
    href: "/membership/directory",
    roles: ["SUPER_ADMIN", "ACCOUNTS", "HEAD_OFFICE"],
    load: async () => (await searchMembers({ statuses: ["INACTIVE"] })).length,
  },
]

/** The queues this role owns, in the order declared above. */
export function queuesForRole(role: UserRole | undefined | null): QueueDef[] {
  if (!role) return []
  return QUEUES.filter((queue) => queue.roles.includes(role))
}
