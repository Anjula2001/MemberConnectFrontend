/**
 * One definition of what a status badge looks like, for every screen that shows one.
 *
 * The system had status pills in four sizes (text-[10px] / [11px] / xs / sm), four
 * paddings, and six per-file colour maps written independently of each other. Board
 * Approvals alone used four different sizes in a single file. Worse, the hand-rolled
 * ones were plain padded <span>s: with no inline-flex the background paints per line
 * box, so a long status like SUBMITTED_FOR_APPROVAL wrapped into two broken half-pills
 * with the text spilling out of them.
 *
 * The fix is not one colour map - the modules genuinely speak different vocabularies,
 * and folding them together would be one map serving five enums. It is one *visual*
 * spec plus a named vocabulary per module, so a status reads the same size and shape
 * everywhere while keeping the colours its own module assigns.
 */

/**
 * The shared visual spec, taken from the Membership Directory - the screen whose rows
 * were already right, and therefore the one nothing had to change to match.
 *
 * Applied on top of shadcn Badge, which supplies inline-flex, rounded-full and
 * whitespace-nowrap. Those three are what stop the wrapping; keep using Badge rather
 * than re-deriving them on a span.
 */
export const STATUS_BADGE_LAYOUT = "px-2.5 py-0.5 text-[11px] font-semibold";

/** Statuses with no colour of their own - a neutral grey, never a guessed one. */
const FALLBACK = "bg-gray-400 hover:bg-gray-400 text-white";

/**
 * Member lifecycle (MemberStatus, 15 values).
 *
 * Only the settled states are coloured. The in-progress ones - TERMINATION_REQUESTED,
 * MEMBER_DEATH_RECORDED, SELECTED_FOR_DORMANT and the rest - fall back to grey rather
 * than borrowing the colour of an outcome they have not reached yet.
 */
const MEMBER: Record<string, string> = {
  ACTIVE: "bg-green-600 hover:bg-green-600 text-white",
  INACTIVE: "bg-gray-500 hover:bg-gray-500 text-white",
  RESIGNED: "bg-yellow-600 hover:bg-yellow-600 text-white",
  TERMINATED: "bg-red-600 hover:bg-red-600 text-white",
  DECEASED: "bg-neutral-700 hover:bg-neutral-700 text-white",
};

/**
 * Request lifecycle - member applications (MR01/MR04) and the five profile-change
 * types (MMC), which share one status enum.
 *
 * ADDED_TO_BOARD_APPROVAL_LIST is blue to match the ListChecks icon already marking
 * those rows, and SUBMITTED_FOR_APPROVAL amber to match FileCheck2. Before this, both
 * fell through a ternary's else branch and came out the same amber, so the badge
 * disagreed with the icon sitting three columns to its left.
 */
const REQUEST: Record<string, string> = {
  NEW: "bg-slate-500 hover:bg-slate-500 text-white",
  SUBMITTED_FOR_APPROVAL: "bg-[#EAB308] hover:bg-[#EAB308] text-white",
  ADDED_TO_BOARD_APPROVAL_LIST: "bg-blue-600 hover:bg-blue-600 text-white",
  APPROVED: "bg-green-600 hover:bg-green-600 text-white",
  REJECTED: "bg-red-600 hover:bg-red-600 text-white",
  INACTIVE: "bg-gray-400 hover:bg-gray-400 text-white",
};

/**
 * Scholarship lifecycle - Grade 5 (ScholarshipRequestStatus), University
 * (UniversityScholarshipRequestStatus) and University fund requests
 * (UniversityScholarshipFundRequestStatus).
 *
 * One map for three enums, because they are one vocabulary spelled three ways: Grade 5
 * says SUBMITTED_FOR_NORMAL_APPROVAL where University says
 * SUBMITTED_FOR_NORMAL_BOARD_APPROVAL for the same stage. Colouring the stage rather
 * than the enum keeps the two scholarship screens legible side by side.
 *
 * These screens used tinted badges (bg-*-100 with dark text and a border) while the
 * membership screens used solid ones. Two badge treatments for the same concept is the
 * inconsistency this module exists to remove, so scholarships adopt the solid style.
 *
 * Normal and deviation routes keep distinct colours: a deviation request is the one a
 * reviewer must not mistake for a normal one, so it never shares a colour with it.
 */
const SCHOLARSHIP: Record<string, string> = {
  NEW: "bg-slate-500 hover:bg-slate-500 text-white",
  INCOMPLETE: "bg-orange-600 hover:bg-orange-600 text-white",

  // University fund requests stop at a committee; the scholarship requests do not.
  SUBMITTED_FOR_COMMITTEE_APPROVAL: "bg-purple-600 hover:bg-purple-600 text-white",

  // Awaiting a board. Grade 5 omits BOARD from the name, University includes it.
  SUBMITTED_FOR_NORMAL_APPROVAL: "bg-[#EAB308] hover:bg-[#EAB308] text-white",
  SUBMITTED_FOR_NORMAL_BOARD_APPROVAL: "bg-[#EAB308] hover:bg-[#EAB308] text-white",
  SUBMITTED_FOR_DEVIATION_APPROVAL: "bg-violet-600 hover:bg-violet-600 text-white",
  SUBMITTED_FOR_DEVIATION_BOARD_APPROVAL: "bg-violet-600 hover:bg-violet-600 text-white",

  // On a list, waiting for the meeting.
  ADDED_TO_SCHOLARSHIP_NORMAL_APPROVAL_LIST: "bg-blue-600 hover:bg-blue-600 text-white",
  ADDED_TO_NORMAL_BOARD_APPROVAL_LIST: "bg-blue-600 hover:bg-blue-600 text-white",
  ADDED_TO_SCHOLARSHIP_DEVIATION_APPROVAL_LIST: "bg-indigo-600 hover:bg-indigo-600 text-white",
  ADDED_TO_DEVIATION_BOARD_APPROVAL_LIST: "bg-indigo-600 hover:bg-indigo-600 text-white",

  APPROVED: "bg-green-600 hover:bg-green-600 text-white",
  REJECTED: "bg-red-600 hover:bg-red-600 text-white",
  INACTIVE: "bg-gray-400 hover:bg-gray-400 text-white",
};

/**
 * Death donation lifecycle (MMD).
 *
 * The committee stages are the point of this vocabulary: a request sitting at
 * DISTRICT_COMMITTEE and one at PD_COMMITTEE are at different desks, so they do not
 * share a colour. P_AND_D_COMMITTEE is the same stage as PD_COMMITTEE under a second
 * spelling the API also returns.
 */
const DONATION: Record<string, string> = {
  NEW: "bg-slate-500 hover:bg-slate-500 text-white",
  INCOMPLETE: "bg-orange-600 hover:bg-orange-600 text-white",
  SUBMITTED_FOR_APPROVAL: "bg-[#EAB308] hover:bg-[#EAB308] text-white",
  DISTRICT_COMMITTEE: "bg-amber-600 hover:bg-amber-600 text-white",
  PD_COMMITTEE: "bg-blue-600 hover:bg-blue-600 text-white",
  // Not in DeathDonationRequestStatus, but the screens already guarded for it.
  P_AND_D_COMMITTEE: "bg-blue-600 hover:bg-blue-600 text-white",
  APPROVED: "bg-green-600 hover:bg-green-600 text-white",
  REJECTED: "bg-red-600 hover:bg-red-600 text-white",
  INACTIVE: "bg-gray-400 hover:bg-gray-400 text-white",
};

/**
 * User account state (admin screens). Not a workflow - just on or off.
 */
const ACCOUNT: Record<string, string> = {
  ACTIVE: "bg-green-600 hover:bg-green-600 text-white",
  INACTIVE: "bg-gray-500 hover:bg-gray-500 text-white",
  LOCKED: "bg-red-600 hover:bg-red-600 text-white",
  DISABLED: "bg-gray-500 hover:bg-gray-500 text-white",
};

const VOCABULARIES = {
  member: MEMBER,
  request: REQUEST,
  scholarship: SCHOLARSHIP,
  donation: DONATION,
  account: ACCOUNT,
} as const;

export type StatusVocabulary = keyof typeof VOCABULARIES;

/**
 * Underscores, spaces and case removed, so a map entry matches whichever spelling the
 * API happens to return.
 *
 * The backend enums are consistently underscored, so this is defensive rather than
 * required - but every scholarship screen had independently written its own
 * `.toLowerCase().replace(/[\s_]+/g, "")` before comparing, and dropping that guard
 * silently on their behalf is not worth the two lines it saves. Normalising both sides
 * here lets the maps stay in readable enum form.
 */
const canonical = (status?: string | null) =>
  (status ?? "").toUpperCase().replace(/[\s_]+/g, "");

const NORMALISED: Record<StatusVocabulary, Record<string, string>> = Object.fromEntries(
  Object.entries(VOCABULARIES).map(([name, map]) => [
    name,
    Object.fromEntries(Object.entries(map).map(([status, cls]) => [canonical(status), cls])),
  ]),
) as Record<StatusVocabulary, Record<string, string>>;

/** Colour classes for `status` as spoken by `vocabulary`. */
export function statusBadgeClass(vocabulary: StatusVocabulary, status?: string | null) {
  return NORMALISED[vocabulary][canonical(status)] ?? FALLBACK;
}

/**
 * Underscores out, case left alone: SUBMITTED_FOR_APPROVAL reads as
 * SUBMITTED FOR APPROVAL.
 *
 * Case is deliberately untouched. Every screen already renders these upper case, so
 * title-casing here would restyle the screens this change is meant to leave alone.
 */
export function humanStatus(status?: string | null) {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}
