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
export const STATUS_BADGE_LAYOUT = "px-2.5 py-0.5 text-xs font-medium border";

/**
 * Every status is a tint: a pale background, its own hue for the text, and a border a
 * shade or two darker than the fill.
 *
 * The system ran solid pills (bg-*-600 with white text) until 2026-08-27. Scholarships
 * had used tints before that and were converted to solid for consistency; the client
 * has since asked for the tinted treatment, so this is that conversion run the other
 * way — and run across all five vocabularies rather than one, because a single visual
 * spec for every screen is the point of this module.
 *
 * The `hover:` half of each entry repeats the resting background on purpose. Badge's
 * default variant carries a hover that would otherwise darken a pill the user cannot
 * click.
 *
 * Every class below is written out in full rather than built from a hue name. Tailwind
 * scans source for complete class strings, so an interpolated `bg-${hue}-100` would
 * never be generated and the pill would render unstyled.
 */

/** Statuses with no colour of their own - a neutral grey, never a guessed one. */
const FALLBACK = "bg-gray-100 hover:bg-gray-100 text-gray-600 border-gray-200";

/**
 * Member lifecycle (MemberStatus, 15 values).
 *
 * Only the settled states are coloured. The in-progress ones - TERMINATION_REQUESTED,
 * MEMBER_DEATH_RECORDED, SELECTED_FOR_DORMANT and the rest - fall back to grey rather
 * than borrowing the colour of an outcome they have not reached yet.
 */
const MEMBER: Record<string, string> = {
  ACTIVE: "bg-green-100 hover:bg-green-100 text-green-600 border-green-200",
  INACTIVE: "bg-gray-100 hover:bg-gray-100 text-gray-600 border-gray-200",
  RESIGNED: "bg-yellow-100 hover:bg-yellow-100 text-yellow-600 border-yellow-200",
  TERMINATED: "bg-rose-100 hover:bg-rose-100 text-rose-600 border-rose-200",
  // Taken from the local map this module replaced: RETIRED is a real MemberStatus and
  // was missing here, so a retired member fell through to the neutral grey fallback.
  RETIRED: "bg-rose-100 hover:bg-rose-100 text-rose-600 border-rose-200",
  DECEASED: "bg-neutral-200 hover:bg-neutral-200 text-neutral-600 border-neutral-300",
};

/**
 * Request lifecycle - member applications (MR01/MR04) and the five profile-change
 * types (MMC), which share one status enum.
 *
 * SUBMITTED_FOR_APPROVAL is amber to match the FileCheck2 icon already marking those
 * rows. ADDED_TO_BOARD_APPROVAL_LIST was blue to match ListChecks and is green as of
 * 2026-08-27 at the client's direction, which does mean a request still waiting for its
 * board meeting now carries the same hue as one already approved.
 */
const REQUEST: Record<string, string> = {
  NEW: "bg-blue-100 hover:bg-blue-100 text-blue-600 border-blue-200",
  SUBMITTED_FOR_APPROVAL: "bg-amber-100 hover:bg-amber-100 text-amber-600 border-amber-200",
  ADDED_TO_BOARD_APPROVAL_LIST: "bg-green-100 hover:bg-green-100 text-green-600 border-green-200",
  APPROVED: "bg-green-100 hover:bg-green-100 text-green-600 border-green-200",
  REJECTED: "bg-rose-100 hover:bg-rose-100 text-rose-600 border-rose-200",
  INACTIVE: "bg-gray-100 hover:bg-gray-100 text-gray-600 border-gray-200",
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
 * These screens used tinted badges before 2026-08-27, were converted to solid pills for
 * consistency with membership, and are tinted again now that every vocabulary is — the
 * one visual spec held throughout, only its treatment changed.
 *
 * Normal and deviation routes share their colours as of 2026-08-27, at the client's
 * direction: both board stages are amber and both approval lists are green. They were
 * previously kept apart so a reviewer could not mistake a deviation request for a normal
 * one — that distinction now rests entirely on the label text, which spells out which
 * route a request is on.
 */
const SCHOLARSHIP: Record<string, string> = {
  NEW: "bg-blue-100 hover:bg-blue-100 text-blue-600 border-blue-200",
  INCOMPLETE: "bg-gray-100 hover:bg-gray-100 text-gray-600 border-gray-200",

  // University fund requests stop at a committee; the scholarship requests do not.
  SUBMITTED_FOR_COMMITTEE_APPROVAL:
    "bg-purple-100 hover:bg-purple-100 text-purple-600 border-purple-200",

  // Awaiting a board. Grade 5 omits BOARD from the name, University includes it.
  SUBMITTED_FOR_NORMAL_APPROVAL: "bg-amber-100 hover:bg-amber-100 text-amber-600 border-amber-200",
  SUBMITTED_FOR_NORMAL_BOARD_APPROVAL:
    "bg-amber-100 hover:bg-amber-100 text-amber-600 border-amber-200",
  SUBMITTED_FOR_DEVIATION_APPROVAL:
    "bg-amber-100 hover:bg-amber-100 text-amber-600 border-amber-200",
  SUBMITTED_FOR_DEVIATION_BOARD_APPROVAL:
    "bg-amber-100 hover:bg-amber-100 text-amber-600 border-amber-200",

  // On a list, waiting for the meeting. Both routes green.
  ADDED_TO_SCHOLARSHIP_NORMAL_APPROVAL_LIST:
    "bg-green-100 hover:bg-green-100 text-green-600 border-green-200",
  ADDED_TO_NORMAL_BOARD_APPROVAL_LIST:
    "bg-green-100 hover:bg-green-100 text-green-600 border-green-200",
  ADDED_TO_SCHOLARSHIP_DEVIATION_APPROVAL_LIST:
    "bg-green-100 hover:bg-green-100 text-green-600 border-green-200",
  ADDED_TO_DEVIATION_BOARD_APPROVAL_LIST:
    "bg-green-100 hover:bg-green-100 text-green-600 border-green-200",

  APPROVED: "bg-green-100 hover:bg-green-100 text-green-600 border-green-200",
  REJECTED: "bg-rose-100 hover:bg-rose-100 text-rose-600 border-rose-200",
  INACTIVE: "bg-gray-100 hover:bg-gray-100 text-gray-600 border-gray-200",
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
  NEW: "bg-blue-100 hover:bg-blue-100 text-blue-600 border-blue-200",
  INCOMPLETE: "bg-pink-100 hover:bg-pink-100 text-pink-600 border-pink-200",
  SUBMITTED_FOR_APPROVAL: "bg-amber-100 hover:bg-amber-100 text-amber-600 border-amber-200",
  // Orange and teal rather than amber and blue: the tints are paler than the solids
  // they replace, and amber/blue would have sat too close to SUBMITTED_FOR_APPROVAL and
  // NEW to read as separate desks at a glance.
  DISTRICT_COMMITTEE: "bg-orange-100 hover:bg-orange-100 text-orange-600 border-orange-200",
  PD_COMMITTEE: "bg-teal-100 hover:bg-teal-100 text-teal-600 border-teal-200",
  // Not in DeathDonationRequestStatus, but the screens already guarded for it.
  P_AND_D_COMMITTEE: "bg-teal-100 hover:bg-teal-100 text-teal-600 border-teal-200",
  APPROVED: "bg-green-100 hover:bg-green-100 text-green-600 border-green-200",
  REJECTED: "bg-rose-100 hover:bg-rose-100 text-rose-600 border-rose-200",
  INACTIVE: "bg-gray-100 hover:bg-gray-100 text-gray-600 border-gray-200",
};

/**
 * User account state (admin screens). Not a workflow - just on or off.
 */
const ACCOUNT: Record<string, string> = {
  ACTIVE: "bg-green-100 hover:bg-green-100 text-green-600 border-green-200",
  INACTIVE: "bg-gray-100 hover:bg-gray-100 text-gray-600 border-gray-200",
  LOCKED: "bg-rose-100 hover:bg-rose-100 text-rose-600 border-rose-200",
  DISABLED: "bg-gray-100 hover:bg-gray-100 text-gray-600 border-gray-200",
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

/** Joining words that stay lower case unless they open the label. */
const MINOR_WORDS = new Set(["for", "to", "of", "and", "on", "in", "a", "an", "the"]);

/**
 * Initialisms that stay upper case. Without these, PD_COMMITTEE title-cases to
 * "Pd Committee" - the one way this change could read worse than the upper case it
 * replaces.
 */
const ACRONYMS = new Set(["pd", "p", "d", "nic", "id"]);

/**
 * Underscores out, title case in: SUBMITTED_FOR_APPROVAL reads as
 * "Submitted for Approval".
 *
 * Upper case was deliberate until 2026-08-27, when the client asked for title case
 * along with the tinted pills. Both changes land together and everywhere, so no screen
 * is left with the old treatment.
 */
export function humanStatus(status?: string | null) {
  if (!status) return "—";

  return status
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word, index) => {
      if (ACRONYMS.has(word)) return word.toUpperCase();
      if (index > 0 && MINOR_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
