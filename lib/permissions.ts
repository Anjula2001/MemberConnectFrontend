import type { UserRole } from "@/lib/auth-context";

/**
 * Single source of truth for who can do what in the Member Registration module
 * (MR01–MR18: applications, board meetings/approvals, membership profiles,
 * documentation printing, dispatch).
 *
 * Nothing in this file governs other modules (Scholarships, Profile Changes) —
 * those are out of scope here and keep whatever access they already have.
 * Member Terminations (MMT01–MMT11) ARE governed here — see the TERMINATION_*
 * constants below, as is Record Member Death (MMT18–MMT25) — see the
 * MEMBER_DEATH_* constants, Death Donations for Members (MMD01–MMD08) — see the
 * DEATH_DONATION_* constants, and Inactivating Dormant Membership Profiles
 * (MMD10–MMD18) — see the DORMANT_* constants.
 *
 * Used by: NavigationSideBar (menu visibility), board-approvals/new-registrations/
 * directory page guards, and button-level gating. Keeping it in one place is what
 * stops a role silently falling into a catch-all "default = full access" branch.
 */

// The four roles the spec actually names as actors for Member Registration.
export const MEMBER_REGISTRATION_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
  "DISTRICT_OFFICE",
];

// Create/edit registrations, membership profile search/view.
export const REGISTRATION_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
  "DISTRICT_OFFICE",
];

// Board Meetings / Board Approval Lists: create, view, approve/reject, print.
export const BOARD_GOVERNANCE_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
];

// Reading the Board Meeting list itself (GET /api/board-meetings/**). Mirrors the
// class-level @PreAuthorize on BoardMeetingController, which excludes District
// Office outright — so a page that fetches meetings without checking this first
// earns a 403 for every district user who opens it, not just a hidden button.
export const BOARD_MEETING_VIEW_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
];

// "Delete privilege" — spec calls this out as a separate right from ordinary
// Head Office access (deleting Board Meetings / Board Approval Lists).
export const DELETE_RIGHTS_ROLES: UserRole[] = ["SUPER_ADMIN", "BOARD_SECRETARY"];

// "Inactive rights" — setting an application (or member) to Inactive.
export const INACTIVE_RIGHTS_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
];

// Print Membership Card / Signature Card / Passbook (MR15–17).
export const CARD_PRINTING_ROLES: UserRole[] = ["SUPER_ADMIN", "HEAD_OFFICE"];

// Membership Document Dispatch update (MR18).
export const DISPATCH_ROLES: UserRole[] = ["SUPER_ADMIN", "HEAD_OFFICE", "DISTRICT_OFFICE"];

// Testing-only member Activate override (stand-in until the Finance Module exists).
export const TESTING_ACTIVATE_ROLES: UserRole[] = ["SUPER_ADMIN"];

// Remittance Master (contribution amounts) — a finance parameter, owned by Accounts.
export const REMITTANCE_MASTER_ROLES: UserRole[] = ["ACCOUNTS", "SUPER_ADMIN"];

// Membership eligibility age limits — a membership-policy setting, deliberately NOT
// delegated to Accounts.
export const ELIGIBILITY_CONFIG_ROLES: UserRole[] = ["SUPER_ADMIN"];

// --- Member Terminations (MMT01-MMT11) ------------------------------------
// Mirrors the Member Registration split above: the District Office raises and
// works a request, Head Office runs the board half. Kept in step with the
// @PreAuthorize annotations on TerminationRequestController and
// TerminationApprovalListController - these constants only decide what the UI
// offers; the server enforces the same lists independently.

// Search and view termination requests.
export const TERMINATION_VIEW_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
  "DISTRICT_OFFICE",
];

// Create, edit, submit and mark incomplete. The SRS names the District Office
// System User as the sole actor for MMT01-MMT04.
export const TERMINATION_ENTRY_ROLES: UserRole[] = ["SUPER_ADMIN", "DISTRICT_OFFICE"];

// Termination Approval Lists: create, view, approve/reject, print (MMT05-MMT10).
export const TERMINATION_BOARD_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
];

// --- Record Member Death (MMT18-MMT25) ------------------------------------
// Kept in step with the @PreAuthorize annotations on MemberDeathRecordController
// and with DEATH_READ_ROLES / DEATH_ENTRY_ROLES in MemberDeathRecordService.
// These constants only decide what the UI offers; the server enforces the same
// lists independently, so getting one wrong here hides a button rather than
// granting access.

// Search and view Member Death records (MMT19 / MMT20). The District Office
// raises them, the three decision levels read them before deciding, and Head
// Office oversees. Accounts, Scholarship and Death Donation officers are not
// actors anywhere in SRS section 4.
export const MEMBER_DEATH_VIEW_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
  "DISTRICT_OFFICE",
  "DISTRICT_COMMITTEE",
  "PD_COMMITTEE",
];

// Initiate, edit, submit, mark incomplete, and add or remove supporting files
// (MMT18 / MMT21). The SRS names the District Office System User as the sole
// actor for both.
export const MEMBER_DEATH_ENTRY_ROLES: UserRole[] = ["SUPER_ADMIN", "DISTRICT_OFFICE"];

// The three approval levels, in escalation order (MMT22 -> MMT23 -> MMT24). A
// decision belongs to the role that owns the level the record is sitting at, so
// this maps status to role rather than listing roles flatly.
export const MEMBER_DEATH_DECISION_ROLE_BY_STATUS: Record<string, UserRole> = {
  SUBMITTED_FOR_APPROVAL: "DISTRICT_OFFICE",
  DISTRICT_COMMITTEE: "DISTRICT_COMMITTEE",
  PD_COMMITTEE: "PD_COMMITTEE",
};

// Roles whose only business in the Termination / Retirement / Member Death list
// is Member Deaths. They are approval levels for death records and nothing else,
// so the request-type filter is pinned for them — otherwise "All" would fire
// termination and retirement calls their role is rightly refused.
export const MEMBER_DEATH_ONLY_ROLES: UserRole[] = ["DISTRICT_COMMITTEE", "PD_COMMITTEE"];

/**
 * True when this user owns the decision at the level a record is sitting at.
 *
 * Two conditions, and SUPER_ADMIN only bypasses one of them. The record must
 * actually be at a decision level — a NEW or already-decided record is nobody's
 * to approve, super admin included. Bypassing both put Approve and Reject on a
 * NEW record and earned a 409 from the server, which enforces the same pair in
 * that order (assertDecidableLevel, then assertMayDecideAtCurrentLevel).
 */
export function canDecideMemberDeathAt(
  role: UserRole | undefined | null,
  status: string | undefined | null
): boolean {
  if (!role) return false;

  const levelOwner = status ? MEMBER_DEATH_DECISION_ROLE_BY_STATUS[status] : undefined;
  if (!levelOwner) return false;

  if (role === "SUPER_ADMIN") return true;
  return levelOwner === role;
}

// --- Death Donations for Members (MMD01-MMD08) -----------------------------
// Kept in step with the @PreAuthorize annotations on
// DeathDonationRequestController and with READ_ROLES / ENTRY_ROLES /
// DECISION_ROLE in DeathDonationService. These constants only decide what the UI
// offers; the server enforces the same lists independently, so getting one wrong
// here hides a button rather than granting access.
//
// Note this is the DONATION a member claims when a relative dies (Requirement
// 05), not Record Member Death (Requirement 04) above. The two have the same
// three-level ladder and it is easy to reach for the wrong constant.

// Search and view Death Donation Requests (MMD02 / MMD03). The District Office
// raises them, the three decision levels read them before deciding, and Head
// Office oversees. Accounts, Scholarship and Death Donation officers are not
// actors anywhere in SRS section 2 — the last of those despite its name.
export const DEATH_DONATION_VIEW_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
  "DISTRICT_OFFICE",
  "DISTRICT_COMMITTEE",
  "PD_COMMITTEE",
];

// Create, edit, submit, mark incomplete, and add or remove supporting files
// (MMD01 / MMD04). The SRS names the District Office System User as the sole
// actor for both.
export const DEATH_DONATION_ENTRY_ROLES: UserRole[] = ["SUPER_ADMIN", "DISTRICT_OFFICE"];

// The three approval levels, in escalation order (MMD05 -> MMD06 -> MMD07). A
// decision belongs to the role that owns the level the request is sitting at, so
// this maps status to role rather than listing roles flatly.
export const DEATH_DONATION_DECISION_ROLE_BY_STATUS: Record<string, UserRole> = {
  SUBMITTED_FOR_APPROVAL: "DISTRICT_OFFICE",
  DISTRICT_COMMITTEE: "DISTRICT_COMMITTEE",
  PD_COMMITTEE: "PD_COMMITTEE",
};

// Where a request goes when it is escalated rather than decided. Drives the
// label on the Forward button, so it cannot drift from the status it produces.
export const DEATH_DONATION_NEXT_LEVEL: Record<string, { status: string; label: string }> = {
  SUBMITTED_FOR_APPROVAL: { status: "DISTRICT_COMMITTEE", label: "District Committee" },
  DISTRICT_COMMITTEE: { status: "PD_COMMITTEE", label: "P&D Committee" },
};

// Human-readable name of the level a request is waiting on, for the "waiting on"
// note shown to everyone who is not that level.
export const DEATH_DONATION_LEVEL_LABEL: Record<string, string> = {
  SUBMITTED_FOR_APPROVAL: "the District Office",
  DISTRICT_COMMITTEE: "the District Committee",
  PD_COMMITTEE: "the Planning & Development Committee",
};

// SRS p.22: "Some of these values can be edited (in view mode) if the logged in
// user has the authority to change the Death Donation values." That authority
// sits with the three decision levels.
export const DEATH_DONATION_AMOUNT_EDIT_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "DISTRICT_OFFICE",
  "DISTRICT_COMMITTEE",
  "PD_COMMITTEE",
];

/**
 * True when this user owns the decision at the level a request is sitting at.
 *
 * Two conditions, and SUPER_ADMIN only bypasses one of them. The request must
 * actually be at a decision level — a NEW or already-decided request is nobody's
 * to approve, super admin included. Bypassing both is what put Approve and
 * Reject on a NEW request and earned a 409 from the server, which enforces the
 * same pair in that order (assertDecidableLevel, then assertMayDecideAtCurrentLevel).
 */
export function canDecideDeathDonationAt(
  role: UserRole | undefined | null,
  status: string | undefined | null
): boolean {
  if (!role) return false;

  const levelOwner = status ? DEATH_DONATION_DECISION_ROLE_BY_STATUS[status] : undefined;
  if (!levelOwner) return false;

  if (role === "SUPER_ADMIN") return true;
  return levelOwner === role;
}

/**
 * True when this user may forward from the level a request is sitting at.
 *
 * Deliberately the same rule as deciding: MMD05 and MMD06 both let the level
 * that could approve escalate instead, and there is nowhere to escalate to from
 * the P&D Committee.
 */
export function canForwardDeathDonationAt(
  role: UserRole | undefined | null,
  status: string | undefined | null
): boolean {
  if (!status || !DEATH_DONATION_NEXT_LEVEL[status]) return false;
  return canDecideDeathDonationAt(role, status);
}

// --- Inactivating Dormant Membership Profiles (MMD10-MMD18) ----------------
// Kept in step with the @PreAuthorize constants on DormantMembershipController
// and with the Set<Role> twins in DormantMembershipService. These constants only
// decide what the UI offers; the server enforces the same lists independently,
// so getting one wrong here hides a button rather than granting access.

// Search and view the dormant population (MMD12). The SRS names the Head Office
// System User as the actor, but 4.2.3 also describes a Location filter that is
// "un-editable" for a user with access to only their own district — which is
// what admits the District Office, read-only and server-scoped to their own
// submissionLocation. Accounts, the two committees and the officer roles are
// actors nowhere in SRS section 4.
export const DORMANT_VIEW_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
  "DISTRICT_OFFICE",
];

// Create, view, print, approve/reject and inactivate (MMD13/14/16/17/18). Same
// list as TERMINATION_BOARD_ROLES, for the same reason: this is the board half.
export const DORMANT_BOARD_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
];

// Running the identification process off-schedule (MMD11). The SRS says
// "Authorized Head Office System User" — narrower than the board list, since the
// Board Secretariat records decisions rather than running batch processes.
export const DORMANT_IDENTIFICATION_ROLES: UserRole[] = ["SUPER_ADMIN", "HEAD_OFFICE"];

// The dormancy period and schedule. Mirrors ELIGIBILITY_CONFIG_ROLES rather than
// the board list: this setting decides who gets inactivated in the first place,
// which makes it membership policy rather than an operational control.
export const DORMANT_CONFIG_ROLES: UserRole[] = ["SUPER_ADMIN"];

// MMD15 deletion reuses DELETE_RIGHTS_ROLES above — the SRS calls it a privilege
// separate from ordinary Head Office access, which is the same concept that
// constant already names. A DORMANT_DELETE_ROLES with an identical value would
// be two things to keep in step instead of one.

/**
 * True when this user may look at the dormant population but not act on it.
 *
 * Drives the pinned Location filter and the absent checkboxes on MMD12. The
 * server pins the district regardless; this is what stops a district user being
 * shown controls that would 403.
 */
export function isDormantReadOnly(role: UserRole | undefined | null): boolean {
  return role === "DISTRICT_OFFICE";
}

export function hasRole(role: UserRole | undefined | null, allowed: UserRole[]): boolean {
  return !!role && allowed.includes(role);
}
