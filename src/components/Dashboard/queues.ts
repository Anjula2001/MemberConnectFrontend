import { apiClient } from "@/lib/api/client"
import { searchMembers } from "@/lib/api/member"
import { searchDeathDonationRequests } from "@/lib/api/deathDonation"
import { searchMemberDeathRecords } from "@/lib/api/memberDeath"
import { getDormantApprovalLists } from "@/lib/api/dormant"
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
 * Counts rows the caller has to filter in the browser.
 *
 * Used only where the endpoint takes no status parameter. It is a stop-gap: every one
 * of these downloads a whole table to count part of it, which is the pattern this
 * codebase has already removed from the registration and member screens. The proper
 * fix is a count endpoint per module.
 */
async function countWhere(
  path: string,
  statuses: string[]
): Promise<number> {
  const { data } = await apiClient.get<{ status?: string }[]>(path)
  if (!Array.isArray(data)) return 0
  return data.filter((row) => row.status && statuses.includes(row.status)).length
}

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
      countFrom("/api/applications/search", {
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
      countFrom("/api/applications/search", {
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
      countFrom("/api/applications/search", {
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
        countWhere("/api/board-approval-lists/getAllBoardApprovalLists", ["CREATED"]),
        countWhere("/api/termination-approval-lists", ["CREATED"]),
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
    load: () => countWhere("/api/grade5/approval-lists/all", ["CREATED"]),
  },
  {
    id: "dormant-lists-to-process",
    label: "Dormant lists to process",
    hint: "Dormancy approval lists awaiting a board decision",
    href: "/membership/dormant/approval-lists",
    // DORMANT_BOARD_ROLES - the board half of MMD13-MMD18.
    roles: BOARD,
    load: async () =>
      (await getDormantApprovalLists()).filter((list) => list.status === "CREATED").length,
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
    load: async () => (await searchDeathDonationRequests()).length,
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
    hint: "MMS26 - the Committee gate before board approval",
    href: "/scholarships/university",
    roles: ["SUPER_ADMIN", "SCHOLARSHIP_OFFICER"],
    load: () =>
      countWhere("/api/university-scholarships", ["SUBMITTED_FOR_COMMITTEE_APPROVAL"]),
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
