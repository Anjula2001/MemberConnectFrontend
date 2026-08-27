import type { UserRole } from "@/lib/auth-context";

/**
 * Single source of truth for who can do what, for the three modules that have been
 * access-controlled so far:
 *
 *   1. Member Registration (MR01–MR18) — expressed as role lists, below.
 *   2. Grade 5 Scholarships (MMS01–MMS20) — expressed as named permissions, further down.
 *   3. Member Retirement (MMT12–MMT17) — named permissions, at the bottom.
 *
 * They use different shapes on purpose. Member Registration shipped with role lists
 * and works; converting it would be a refactor of live code for no behavioural gain.
 * Grade 5 and Retirement need named permissions because their SRS documents keep
 * describing rights held *in addition* to a role ("the user needs Inactive rights",
 * "the authorized user who has the delete privileges", "if the logged in user has the
 * rights to change the status"), which a role list cannot express.
 *
 * Still out of scope and unrestricted: University Scholarships, Death Donation,
 * Termination, Dormant Membership, Profile Changes.
 *
 * Everything here is UX only — it decides what is shown, never what is allowed. The
 * backend enforces the same matrix independently in RolePermissions.java, and that
 * copy is the one that counts. The two must be kept in step.
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

// Raising a Member Transfer request. Member Registration has no named permission for
// this, so it is a role list like the rest of that module.
//
// Head Office is excluded: a transfer is raised by the branch that holds the
// membership, and Head Office receives it rather than creating it. Board Secretary is
// excluded for the same reason, which also keeps this in step with US_REQUEST_CREATE
// — the equivalent right for raising a University Scholarship.
export const MEMBER_TRANSFER_ROLES: UserRole[] = ["SUPER_ADMIN", "DISTRICT_OFFICE"];

// Membership Document Dispatch update (MR18).
export const DISPATCH_ROLES: UserRole[] = ["SUPER_ADMIN", "HEAD_OFFICE", "DISTRICT_OFFICE"];

/**
 * MMD09: "the authorized users at District Office and Head Office can use the Add
 * Documents option to upload documents to a Member Profile." SUPER_ADMIN is added on
 * top of the SRS, as it is throughout the rest of the system.
 *
 * Kept in step with MemberAdHocDocumentController's @PreAuthorize and the service's
 * ALLOWED_ROLES: a role offered the button here but refused there would only produce a
 * 403 on Save. Note the scoping differs from the membership - District Office is
 * narrowed to its own district server-side, Head Office and Super Admin are not.
 */
export const AD_HOC_DOCUMENT_ROLES: UserRole[] = [
  "DISTRICT_OFFICE",
  "HEAD_OFFICE",
  "SUPER_ADMIN",
];

// Testing-only member Activate override (stand-in until the Finance Module exists).
export const TESTING_ACTIVATE_ROLES: UserRole[] = ["SUPER_ADMIN"];

// Remittance Master (contribution amounts) — a finance parameter, owned by Accounts.
export const REMITTANCE_MASTER_ROLES: UserRole[] = ["ACCOUNTS", "SUPER_ADMIN"];

// University Scholarship master data (universities, programmes, durations, amounts).
// Super Admin only. US_MASTER_MANAGE would have been the obvious gate, but that right
// is also held by SCHOLARSHIP_OFFICER and this screen is Super Admin only.
export const UNIVERSITY_MASTER_ROLES: UserRole[] = ["SUPER_ADMIN"];

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

// ─── Member Profile Changes (Requirement 02, MMC01–MMC26) ────────────────────
//
// Distinct from the Member Registration sets above: the actors the SRS names for
// profile changes are not the same, and conflating them is what previously left
// District Office — the primary creator of all four request types — with no access
// to the module at all.

// Raise a Basic Profile / Name / Nominee / Remittance change request from a member's
// profile. MMC01, MMC05, MMC14 and MMC18 all name the District Office System User.
export const PROFILE_CHANGE_CREATE_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "DISTRICT_OFFICE",
];

// View the "All Member Profile Change Requests List". MMC02/06/15/19 name both the
// District Office and Head Office System User.
export const PROFILE_CHANGE_VIEW_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
  "DISTRICT_OFFICE",
];

// Approve or reject a request that is decided directly, with no board step — Basic
// Profile (MMC04) and Remittance (MMC17).
//
// This departs from the SRS on the client's instruction. MMC04 names the District
// Office System User as the approver; here District Office raises the request but
// never decides it, and Board Secretary — which the SRS does not name for this
// function at all — decides every type.
export const PROFILE_CHANGE_DIRECT_APPROVAL_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
];

// Re-open a submitted request and change its values. Not an SRS function: MMC01 says
// a submitted record cannot be edited. Enabled at the client's direction, for the same
// roles that may decide the request — a District Office user cannot revise what they
// have already sent for approval.
export const PROFILE_CHANGE_EDIT_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
];

// Delete a request outright. Also not an SRS function; the audit row is what keeps it
// traceable. Available to everyone who works with the module, District Office included.
export const PROFILE_CHANGE_DELETE_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
  "DISTRICT_OFFICE",
];

// Build, view and print a Name or Nominee Change Approval List for the board meeting.
// MMC08–MMC11 and MMC21–MMC24 name the Head Office System User throughout.
export const PROFILE_CHANGE_APPROVAL_LIST_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
];

// Record the board's decisions on that list (MMC12 / MMC25). Deliberately narrower
// than the list above: Head Office prepares the board pack but does not decide what
// the board decided. Anything routed through a Board Approval List is settled by the
// Board Secretary.
export const PROFILE_CHANGE_APPROVAL_LIST_PROCESS_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "BOARD_SECRETARY",
];

export function hasRole(role: UserRole | undefined | null, allowed: UserRole[]): boolean {
  return !!role && allowed.includes(role);
}

// ─── Scholarships: Grade 5 (MMS01–MMS20) and University (MMS21–MMS48) ────────
//
// Mirror of backend enums/Permission.java + config/RolePermissions.java. If you
// change a grant here, change it there too — this copy only hides buttons, the
// backend copy is what actually stops the request.
//
// One map covers both modules rather than two parallel ones, because the roles
// overlap heavily and two maps drift. The namespaces stay separate (G5_* / US_*)
// because the modules are not interchangeable: University has a Committee level
// and a Fund Request entity that Grade 5 has no equivalent of.

export type Permission =
  // ---- Grade 5: requests (MMS01–MMS05) ----
  | "G5_REQUEST_VIEW"
  | "G5_REQUEST_CREATE"
  | "G5_REQUEST_EDIT"
  | "G5_REQUEST_SUBMIT"
  | "G5_REQUEST_INCOMPLETE"
  | "G5_REQUEST_SET_INACTIVE"
  | "G5_REQUEST_REOPEN"
  // ---- Grade 5: approval lists (MMS06–MMS19) ----
  | "G5_LIST_VIEW"
  | "G5_LIST_CREATE"
  | "G5_LIST_PRINT"
  | "G5_LIST_PROCESS"
  | "G5_LIST_DELETE"
  // ---- Grade 5: masters + finance ----
  | "G5_EXAM_MASTER_VIEW"
  | "G5_EXAM_MASTER_MANAGE"
  | "G5_FINANCE_DISBURSE"
  // ---- University: requests (MMS21–MMS25) ----
  | "US_REQUEST_VIEW"
  | "US_REQUEST_CREATE"
  | "US_REQUEST_EDIT"
  | "US_REQUEST_SUBMIT"
  | "US_REQUEST_INCOMPLETE"
  | "US_REQUEST_SET_INACTIVE"
  | "US_REQUEST_REOPEN"
  // ---- University: Committee (MMS26) ----
  | "US_COMMITTEE_APPROVE"
  // ---- University: board approval lists (MMS27–MMS40) ----
  | "US_LIST_VIEW"
  | "US_LIST_CREATE"
  | "US_LIST_PRINT"
  | "US_LIST_PROCESS"
  | "US_LIST_DELETE"
  // ---- University: approved record + fund requests (MMS41–MMS47) ----
  | "US_APPROVED_EDIT"
  | "US_FUND_VIEW"
  | "US_FUND_CREATE"
  | "US_FUND_EDIT"
  | "US_FUND_SUBMIT"
  | "US_FUND_INCOMPLETE"
  | "US_FUND_APPROVE"
  | "US_FUND_SET_INACTIVE"
  | "US_FUND_REOPEN"
  // ---- University: masters + finance ----
  | "US_MASTER_VIEW"
  | "US_MASTER_MANAGE"
  | "US_FINANCE_DISBURSE"
  // Member Transfers (MMC27-MMC30). There is no MT_REQUEST_EDIT: a transfer is
  // created already at "Submitted for Approval" and can never be edited.
  | "MT_REQUEST_VIEW"
  | "MT_REQUEST_CREATE"
  | "MT_REQUEST_APPROVE"
  | "MT_REQUEST_SET_INACTIVE";

const GRADE5_DISTRICT: Permission[] = [
  "G5_REQUEST_VIEW",
  "G5_REQUEST_CREATE",
  "G5_REQUEST_EDIT",
  "G5_REQUEST_SUBMIT",
  "G5_REQUEST_INCOMPLETE",
  "G5_EXAM_MASTER_VIEW",
];

const GRADE5_BOARD: Permission[] = [
  "G5_REQUEST_VIEW",
  "G5_REQUEST_SET_INACTIVE",
  "G5_REQUEST_REOPEN",
  "G5_LIST_VIEW",
  "G5_LIST_CREATE",
  "G5_LIST_PRINT",
  "G5_LIST_PROCESS",
  "G5_LIST_DELETE",
  "G5_EXAM_MASTER_VIEW",
];

// University scholarship requests (MMS21-MMS25) only. Note the absence of
// US_REQUEST_EDIT: editing a NEW/INCOMPLETE request is an authorised officer's right,
// so it lives in UNIVERSITY_DISTRICT_AUTHORITY below and an ordinary clerk in the same
// office can raise and submit a request without being able to reopen and alter one.
//
// No fund request rights at all, not even US_FUND_VIEW — briefly granted on
// 2026-08-19 and revoked on 2026-08-20. Since canAccessFundRequests() keys on
// US_FUND_VIEW, its absence both hides the sidebar item and makes the Fund Requests
// page render AccessRestricted. Mirrors RolePermissions.java — keep the two in step.
const UNIVERSITY_DISTRICT: Permission[] = [
  "US_REQUEST_VIEW",
  "US_REQUEST_CREATE",
  "US_REQUEST_SUBMIT",
  "US_REQUEST_INCOMPLETE",
  "US_MASTER_VIEW",
];

// The University board track, shared by HEAD_OFFICE and BOARD_SECRETARY.
//
// Deliberately WITHOUT US_COMMITTEE_APPROVE — the Committee gate (MMS26) must not be
// cleared by the office that runs the Board. Head Office is the one exception, and it
// holds that right only through UNIVERSITY_HEAD_OFFICE_AUTHORITY below.
//
// Also WITHOUT US_REQUEST_SET_INACTIVE / US_REQUEST_REOPEN / US_LIST_DELETE as of
// 2026-08-27. All three are now authorised-officer rights, which this array cannot
// express because BOARD_SECRETARY shares it and holds none of them.
//
// US_FUND_APPROVE was included from 2026-08-19 by product decision — the office that
// raises fund requests also decides them — and moved to UNIVERSITY_HEAD_OFFICE_AUTHORITY
// on 2026-08-27. It stays with Head Office, but now only with an *authorised* officer
// there, which restores part of the maker/checker split the 2026-08-19 note knowingly
// gave up: the whole office still raises a fund request, one officer decides it.
//
// US_FUND_EDIT / US_FUND_SET_INACTIVE / US_FUND_REOPEN moved for the same reason on the
// same date. US_FUND_CREATE, US_FUND_SUBMIT and US_FUND_INCOMPLETE deliberately did NOT:
// raising and preparing a fund request remains the whole office's work.
//
// Mirrors RolePermissions.java on the backend — keep the two in step.
const UNIVERSITY_BOARD: Permission[] = [
  "US_REQUEST_VIEW",
  "US_LIST_VIEW",
  "US_LIST_CREATE",
  "US_LIST_PRINT",
  "US_LIST_PROCESS",
  "US_APPROVED_EDIT",
  "US_FUND_VIEW",
  "US_FUND_CREATE",
  "US_FUND_SUBMIT",
  "US_FUND_INCOMPLETE",
  "US_MASTER_VIEW",
];

// --- University: rights carried by the per-account authority flag ------------
//
// Product decision of 2026-08-27. These University actions are held by an *authorised*
// officer rather than by everyone holding the role:
//
//   edit a NEW/INCOMPLETE request .... authorised District Office, authorised Head Office
//   change a request's status ........ authorised District Office, authorised Head Office
//   committee Approve / Reject ....... authorised Head Office (+ SCHOLARSHIP_OFFICER)
//   delete an approval list .......... authorised Head Office
//
// and the same three gates again on the Fund Request side, Head Office only:
//
//   edit a NEW/INCOMPLETE fund request .... authorised Head Office
//   change a fund request's status ........ authorised Head Office
//   fund request Approve / Reject ......... authorised Head Office
//
// Super Admin holds all of them through ALL_PERMISSIONS. BOARD_SECRETARY holds none:
// it cannot carry the authority flag, which UserAdminService forces false for
// every role except DISTRICT_OFFICE and HEAD_OFFICE.
//
// District Office holds no fund request rights at all, authorised or not, so the fund
// gates appear only in UNIVERSITY_HEAD_OFFICE_AUTHORITY.
//
// District Office is deliberately NOT granted US_COMMITTEE_APPROVE. It holds
// US_REQUEST_CREATE, so pairing the two would let one office raise a request and clear
// the committee gate that exists to scrutinise it — the segregation of duties this
// whole file is built around. Confirmed 2026-08-27.
//
// Mirrors AUTHORITY_GRANTS in RolePermissions.java, which is what actually enforces
// this: User.getAuthorities() emits the flag's grants alongside the role's, so the
// existing @PreAuthorize("hasAuthority('US_...')") on each endpoint narrows with it.
const UNIVERSITY_DISTRICT_AUTHORITY: Permission[] = [
  "US_REQUEST_EDIT",
  "US_REQUEST_SET_INACTIVE",
  "US_REQUEST_REOPEN",
];

const UNIVERSITY_HEAD_OFFICE_AUTHORITY: Permission[] = [
  "US_REQUEST_EDIT",
  "US_REQUEST_SET_INACTIVE",
  "US_REQUEST_REOPEN",
  "US_LIST_DELETE",
  "US_COMMITTEE_APPROVE",
  // Fund requests (2026-08-27). Note the absence of US_FUND_CREATE / US_FUND_SUBMIT /
  // US_FUND_INCOMPLETE: raising and preparing a fund request stays with the whole
  // office through UNIVERSITY_BOARD, only deciding and altering one is narrowed here.
  "US_FUND_EDIT",
  "US_FUND_APPROVE",
  "US_FUND_SET_INACTIVE",
  "US_FUND_REOPEN",
];

// --- Member Transfers (MMC27-MMC30) ---------------------------------------
// Kept in step with RolePermissions.java on the server, which enforces the same
// split independently; these arrays only decide what the UI offers.

// The office that raises a transfer: it reads and creates, and decides nothing.
const TRANSFER_DISTRICT: Permission[] = ["MT_REQUEST_VIEW", "MT_REQUEST_CREATE"];

// Head Office reads transfers and nothing more, as of 2026-08-27.
//
// MMC30 names the District Office as the approver. That was previously resolved in
// favour of Head Office on the scholarship modules' reasoning — the office that raises
// a request does not approve it — and the product decision of 2026-08-27 reverses it,
// putting the decision back where the SRS puts it. Head Office keeps no approval right
// at all; it may still take a transfer to Inactive, but only as an authorised officer
// and only through TRANSFER_HEAD_OFFICE_AUTHORITY below.
//
// The maker/checker split this gives up is now carried entirely by the authority flag:
// any District Office clerk raises a transfer, only an authorised District Office
// officer decides one. That control is real only while some District Office accounts
// are left unauthorised.
const TRANSFER_APPROVER: Permission[] = ["MT_REQUEST_VIEW"];

// Board Secretary reads transfers. It lost MT_REQUEST_SET_INACTIVE on 2026-08-27, when
// that became an authorised-officer right — UserAdminService forces the authority flag
// false for this role, so there is no authorised Board Secretary to grant it back to.
const TRANSFER_SECRETARY: Permission[] = ["MT_REQUEST_VIEW"];

// --- Member Transfers: rights carried by the per-account authority flag ------
//
// Product decision of 2026-08-27, and Member Transfers only — the scholarship modules'
// status-change gates are unchanged.
//
//   Approve / Reject a transfer ....... authorised District Office (nobody else)
//   change a transfer's status ........ authorised District Office, authorised Head Office
//
// Note the asymmetry: an authorised Head Office officer may cancel a transfer to
// Inactive but may not decide one. That is deliberate — Head Office holds no
// MT_REQUEST_APPROVE in any form after this change.
const TRANSFER_DISTRICT_AUTHORITY: Permission[] = [
  "MT_REQUEST_APPROVE",
  "MT_REQUEST_SET_INACTIVE",
];

const TRANSFER_HEAD_OFFICE_AUTHORITY: Permission[] = ["MT_REQUEST_SET_INACTIVE"];

const ALL_PERMISSIONS: Permission[] = [
  ...GRADE5_DISTRICT,
  ...GRADE5_BOARD,
  "G5_EXAM_MASTER_MANAGE",
  "G5_FINANCE_DISBURSE",
  ...UNIVERSITY_DISTRICT,
  ...UNIVERSITY_BOARD,
  ...UNIVERSITY_HEAD_OFFICE_AUTHORITY,
  "US_COMMITTEE_APPROVE",
  "US_MASTER_MANAGE",
  "US_FINANCE_DISBURSE",
  ...TRANSFER_APPROVER,
  ...TRANSFER_DISTRICT_AUTHORITY,
  "MT_REQUEST_CREATE",
];

/**
 * Segregation of duties: District Office raises requests, Head Office approves them.
 *
 * Both SRS sections name "District Office System User" as the approver in their
 * parent Approve/Reject function (MMS06/MMS13, MMS27/MMS34), while every child
 * function beneath them says Head Office. Those actor cells are copy-paste artefacts
 * and were resolved in favour of Head Office — an office that approves its own
 * requests defeats the Board Meeting control both modules are built around.
 *
 * DEATH_DONATION_OFFICER holds nothing here. It previously reached both modules only
 * by falling through a catch-all branch in the sidebar, which is the failure this map
 * exists to prevent.
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  DISTRICT_OFFICE: [...GRADE5_DISTRICT, ...UNIVERSITY_DISTRICT, ...TRANSFER_DISTRICT],

  // US_FINANCE_DISBURSE is listed here rather than in UNIVERSITY_BOARD because that
  // array is shared with BOARD_SECRETARY, which does not hold the finance hand-over.
  HEAD_OFFICE: [
    ...GRADE5_BOARD,
    ...UNIVERSITY_BOARD,
    "US_FINANCE_DISBURSE",
    ...TRANSFER_APPROVER,
  ],

  // The same approval track as Head Office, plus the Grade 5 delete privilege that
  // DELETE_RIGHTS_ROLES also grants. The University delete privilege is NOT included
  // as of 2026-08-27 — US_LIST_DELETE became an authorised-officer right, and this role
  // cannot carry the authority flag.
  BOARD_SECRETARY: [...GRADE5_BOARD, ...UNIVERSITY_BOARD, ...TRANSFER_SECRETARY],

  // Seat of the University Scholarship Committee (MMS26), and owner of the university
  // master. The Exam Master is NOT its to maintain: exam dates and district cut-off
  // marks decide who qualifies for a scholarship, so that stays with Super Admin - kept
  // in step with RolePermissions.java, which is what actually enforces it.
  //
  // Note the asymmetry between the modules, which is deliberate: on Grade 5 this role
  // may raise requests, because Grade 5 has no committee step for it to then approve.
  // On University it may not, since holding US_REQUEST_CREATE together with
  // US_COMMITTEE_APPROVE would let one person create a request and clear the very
  // gate that exists to scrutinise it.
  SCHOLARSHIP_OFFICER: [
    ...GRADE5_DISTRICT,
    "G5_LIST_VIEW",
    "US_REQUEST_VIEW",
    "US_COMMITTEE_APPROVE",
    "US_LIST_VIEW",
    "US_FUND_VIEW",
    "US_MASTER_VIEW",
    "US_MASTER_MANAGE",
  ],

  // "Head Office – Finance Department": read-only until the Finance integrations
  // (MMS20 / MMS48) exist.
  ACCOUNTS: [
    "G5_REQUEST_VIEW",
    "G5_LIST_VIEW",
    "G5_FINANCE_DISBURSE",
    "US_REQUEST_VIEW",
    "US_LIST_VIEW",
    "US_FUND_VIEW",
    "US_FINANCE_DISBURSE",
  ],

  DEATH_DONATION_OFFICER: [],

  // The two Member Death / Death Donation approval levels (MMT23, MMT24, MMD06,
  // MMD07). Neither is an actor in either scholarship module, so they hold nothing
  // here — they are listed only because Record<UserRole, …> demands every role, and
  // an omission would silently read as "no permissions" for the wrong reason.
  DISTRICT_COMMITTEE: [],
  PD_COMMITTEE: [],
};

export function hasPermission(
  role: UserRole | undefined | null,
  permission: Permission
): boolean {
  return !!role && ROLE_PERMISSIONS[role].includes(permission);
}

/** True when the role may open the Grade 5 module at all — used for page guards. */
export function canAccessGrade5(role: UserRole | undefined | null): boolean {
  return hasPermission(role, "G5_REQUEST_VIEW") || hasPermission(role, "G5_LIST_VIEW");
}

/** True when the role may open the University Scholarship module at all. */
export function canAccessUniversityScholarships(
  role: UserRole | undefined | null
): boolean {
  return hasPermission(role, "US_REQUEST_VIEW") || hasPermission(role, "US_LIST_VIEW");
}

/** True when the role may open the University Scholarship Fund Request screens. */
export function canAccessFundRequests(role: UserRole | undefined | null): boolean {
  return hasPermission(role, "US_FUND_VIEW");
}

/**
 * Roles whose remit is national rather than a single District Office.
 *
 * Mirrors ALL_LOCATION_ROLES in the backend's CurrentUserService. Anyone not listed
 * is pinned to their assignedDistrict, and the backend re-pins them regardless of
 * what the UI sends — this is only here so the Location filter renders correctly.
 */
export const ALL_LOCATION_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
  "ACCOUNTS",
  "SCHOLARSHIP_OFFICER",
];

/**
 * True when the role may pick any District Office in a Location filter.
 *
 * The national/district split is a property of the role, not of a module, so every
 * module asks this same question — Grade 5, University Scholarships, Termination &
 * Retirement. One function reading one array, because two copies would drift.
 */
export function canSelectAllLocations(role: UserRole | undefined | null): boolean {
  return hasRole(role, ALL_LOCATION_ROLES);
}

/** True when the role sees only its own District Office's records (SRS 3.2.2). */
export function isLocationRestricted(role: UserRole | undefined | null): boolean {
  return !!role && !canSelectAllLocations(role);
}

// ─── Member Retirement (MMT12–MMT17) ─────────────────────────────────────────
//
// Mirror of backend enums/Permission.java + config/RolePermissions.java. If you change
// a grant here, change it there too — this copy only hides buttons, the backend copy is
// what actually stops the request.

export type RetPermission =
  | "RET_REQUEST_VIEW"
  | "RET_REQUEST_CREATE"
  | "RET_REQUEST_EDIT"
  | "RET_REQUEST_SUBMIT"
  | "RET_REQUEST_INCOMPLETE"
  | "RET_REQUEST_SET_INACTIVE"
  | "RET_REQUEST_RETURN_TO_NEW"
  | "RET_REQUEST_APPROVE";

/**
 * The District Office owns a retirement request end to end — it raises, submits and
 * approves. Unlike the Grade 5 matrix above, retirement is not split across two
 * offices: MMT16's actor table and §3.1.1 both place the approver at the District
 * Office ("District Office System User" / "the Authorized User from the District
 * Office"). HEAD_OFFICE keeps approval too, so requests can still be handled centrally.
 *
 * BOARD_SECRETARY gets the housekeeping rights it already holds elsewhere via
 * INACTIVE_RIGHTS_ROLES, but not approval — MMT16 runs no Board Meeting.
 * SCHOLARSHIP_OFFICER and DEATH_DONATION_OFFICER are not actors in MMT12–MMT17 at all.
 */
const RET_ROLE_PERMISSIONS: Record<UserRole, RetPermission[]> = {
  SUPER_ADMIN: [
    "RET_REQUEST_VIEW",
    "RET_REQUEST_CREATE",
    "RET_REQUEST_EDIT",
    "RET_REQUEST_SUBMIT",
    "RET_REQUEST_INCOMPLETE",
    "RET_REQUEST_SET_INACTIVE",
    "RET_REQUEST_RETURN_TO_NEW",
    "RET_REQUEST_APPROVE",
  ],

  // MMT16 names "District Office System User" as the approver, so the District Office
  // owns a retirement request end to end — raise, submit, approve or reject, pull back
  // to New, deactivate. Mirrors RolePermissions.java, which is the copy that counts.
  DISTRICT_OFFICE: [
    "RET_REQUEST_VIEW",
    "RET_REQUEST_CREATE",
    "RET_REQUEST_EDIT",
    "RET_REQUEST_SUBMIT",
    "RET_REQUEST_INCOMPLETE",
    "RET_REQUEST_APPROVE",
    "RET_REQUEST_RETURN_TO_NEW",
    "RET_REQUEST_SET_INACTIVE",
  ],

  HEAD_OFFICE: [
    "RET_REQUEST_VIEW",
    "RET_REQUEST_APPROVE",
    "RET_REQUEST_SET_INACTIVE",
    "RET_REQUEST_RETURN_TO_NEW",
  ],

  BOARD_SECRETARY: [
    "RET_REQUEST_VIEW",
    "RET_REQUEST_SET_INACTIVE",
    "RET_REQUEST_RETURN_TO_NEW",
  ],

  // "Head Office – Finance Department" in §3.1.1. Read-only: MMT17 hands approved
  // retirements to the Finance Module over an API that does not exist yet.
  ACCOUNTS: ["RET_REQUEST_VIEW"],

  SCHOLARSHIP_OFFICER: [],
  DEATH_DONATION_OFFICER: [],

  // Committee roles decide Member Deaths (MMT23/MMT24), not retirements. Listed only
  // because Record<UserRole, …> demands every role.
  DISTRICT_COMMITTEE: [],
  PD_COMMITTEE: [],
};

export function hasRetPermission(
  role: UserRole | undefined | null,
  permission: RetPermission
): boolean {
  return !!role && RET_ROLE_PERMISSIONS[role].includes(permission);
}

/** True when the role may reach the Retirement module at all — used for page guards. */
export function canAccessRetirement(role: UserRole | undefined | null): boolean {
  return hasRetPermission(role, "RET_REQUEST_VIEW");
}

// ─── Authorising power (the per-account "authority" flag) ────────────────────
//
// A right held *in addition* to a role, set per account by the Super Admin and
// stored on Users.authority. The SRS keeps describing the status-change actor as
// "the Authorized User from the District Office" (MMT16 / §3.1.1) rather than as the
// District Office generally: an office holds both clerks who prepare a request and
// officers who sign it off, and the role alone cannot tell the two apart.
//
// Only DISTRICT_OFFICE and HEAD_OFFICE accounts can carry it — UserAdminService
// forces it false for every other role, so this file never has to special-case them.

/** True when this account carries authorising power on top of its role. */
export function isAuthorizedOfficer(
  user: { role?: UserRole | null; authorized?: boolean } | null | undefined
): boolean {
  return !!user?.authorized;
}

/**
 * Rights the authority flag adds on top of the role, mirroring AUTHORITY_GRANTS in
 * RolePermissions.java. Only the roles that can carry the flag appear here.
 *
 * Grade 5 is deliberately absent even though the backend map grants
 * G5_REQUEST_SET_INACTIVE / G5_REQUEST_REOPEN to an authorised District Office. This
 * copy under-grants there rather than over-grants, and correcting it would change
 * Grade 5 behaviour, which is not what the 2026-08-27 decision covered. Left as-is on
 * purpose; worth closing separately.
 */
const AUTHORITY_GRANTS: Partial<Record<UserRole, Permission[]>> = {
  DISTRICT_OFFICE: [...UNIVERSITY_DISTRICT_AUTHORITY, ...TRANSFER_DISTRICT_AUTHORITY],
  HEAD_OFFICE: [...UNIVERSITY_HEAD_OFFICE_AUTHORITY, ...TRANSFER_HEAD_OFFICE_AUTHORITY],
};

/**
 * hasPermission, plus anything this particular account's authority flag adds.
 *
 * Takes the user rather than the role because the flag is per account: two Head Office
 * logins can legitimately disagree about whether they may delete an approval list.
 */
export function hasUserPermission(
  user: { role?: UserRole | null; authorized?: boolean } | null | undefined,
  permission: Permission
): boolean {
  if (hasPermission(user?.role, permission)) return true;
  if (!user?.role || !isAuthorizedOfficer(user)) return false;
  return (AUTHORITY_GRANTS[user.role] ?? []).includes(permission);
}

// ─── University Scholarships: the four authorised-officer gates ──────────────
//
// Each is the single source of truth for one button. They exist as named functions
// rather than inline hasUserPermission calls so that the screens cannot drift from
// each other — the list page's pencil and the detail page's Edit button must agree.

/** Edit a NEW / INCOMPLETE University Scholarship request (MMS23). */
export function canEditUniversityRequest(
  user: { role?: UserRole | null; authorized?: boolean } | null | undefined
): boolean {
  return hasUserPermission(user, "US_REQUEST_EDIT");
}

/** Show the view-mode "Change Status" button on a University request (MMS25). */
export function canChangeUniversityRequestStatus(
  user: { role?: UserRole | null; authorized?: boolean } | null | undefined
): boolean {
  return (
    hasUserPermission(user, "US_REQUEST_REOPEN")
    || hasUserPermission(user, "US_REQUEST_SET_INACTIVE")
  );
}

/** Approve / Reject a request sitting at Submitted for Committee Approval (MMS26). */
export function canReviewUniversityCommittee(
  user: { role?: UserRole | null; authorized?: boolean } | null | undefined
): boolean {
  return hasUserPermission(user, "US_COMMITTEE_APPROVE");
}

/** Delete a University Normal or Deviation approval list (MMS31 / MMS38). */
export function canDeleteUniversityList(
  user: { role?: UserRole | null; authorized?: boolean } | null | undefined
): boolean {
  return hasUserPermission(user, "US_LIST_DELETE");
}

// ─── University Fund Requests: the three authorised-officer gates ────────────
//
// Head Office only — District Office holds no fund request rights at all. Each is the
// single source of truth for one button, for the same reason as the request gates
// above: the list page's pencil and the form's Edit mode must not drift apart.

/** Edit a NEW / INCOMPLETE fund request (MMS44). Not the same as raising a new one. */
export function canEditFundRequest(
  user: { role?: UserRole | null; authorized?: boolean } | null | undefined
): boolean {
  return hasUserPermission(user, "US_FUND_EDIT");
}

/** Show the view-mode "Change Status" button on a fund request (MMS46 / MMS47). */
export function canChangeFundRequestStatus(
  user: { role?: UserRole | null; authorized?: boolean } | null | undefined
): boolean {
  return (
    hasUserPermission(user, "US_FUND_REOPEN")
    || hasUserPermission(user, "US_FUND_SET_INACTIVE")
  );
}

/** Approve / Reject a fund request awaiting a decision (MMS45). */
export function canReviewFundRequest(
  user: { role?: UserRole | null; authorized?: boolean } | null | undefined
): boolean {
  return hasUserPermission(user, "US_FUND_APPROVE");
}

// ─── Member Transfers: the two authorised-officer gates ──────────────────────

/**
 * Approve / Reject a member transfer (MMC30).
 *
 * Authorised District Office and Super Admin only. Head Office holds no approval
 * right on transfers in any form as of 2026-08-27.
 */
export function canApproveTransfer(
  user: { role?: UserRole | null; authorized?: boolean } | null | undefined
): boolean {
  return hasUserPermission(user, "MT_REQUEST_APPROVE");
}

/** Show the view-mode "Change Status" button on a transfer (MMC29). */
export function canChangeTransferStatus(
  user: { role?: UserRole | null; authorized?: boolean } | null | undefined
): boolean {
  return hasUserPermission(user, "MT_REQUEST_SET_INACTIVE");
}

/**
 * Gate for the view-mode "Change status" dropdown.
 *
 * District Office is the only role split by the authority flag: an unauthorised
 * District Office account may still raise, edit and submit a request, but may not
 * move its status, so the dropdown is hidden from it entirely. Every other role keeps
 * whatever its permission matrix already grants — this narrows District Office, it
 * does not widen anyone.
 *
 * UX only, and — unlike the permission matrices above — it has NO backend twin yet:
 * RetirementRequestController still authorises status changes on the role alone, so an
 * unauthorised District Office account can still make the change by calling the
 * endpoint directly. Closing that gap means checking the flag in
 * requiredPermissionForStatusChange() as well.
 */
/**
 * Gate for the Grade 5 "Delete List" button (MMS09 / MMS16).
 *
 * The SRS calls delete out as a separate "delete privilege" rather than as something
 * the whole office holds, so at Head Office it belongs to the authorised officer and
 * not to every account with a Head Office login. Head Office is the only role narrowed
 * here - SUPER_ADMIN and BOARD_SECRETARY keep the right through the role matrix, and a
 * role without G5_LIST_DELETE gains nothing from being authorised.
 *
 * UI only. Grade5ScholarshipApprovalListController still authorises delete on
 * @PreAuthorize("hasAuthority('G5_LIST_DELETE')"), which the authority flag does not
 * narrow, so an unauthorised Head Office account could still call the endpoint directly.
 */
export function canDeleteGrade5List(
  user: { role?: UserRole | null; authorized?: boolean } | null | undefined
): boolean {
  if (!hasPermission(user?.role, "G5_LIST_DELETE")) return false;
  if (user?.role === "HEAD_OFFICE") return isAuthorizedOfficer(user);
  return true;
}

export function canChangeRequestStatus(
  user: { role?: UserRole | null; authorized?: boolean } | null | undefined
): boolean {
  if (!user?.role) return false;
  if (user.role === "DISTRICT_OFFICE") return isAuthorizedOfficer(user);
  return true;
}
