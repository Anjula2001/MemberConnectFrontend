import type { UserRole } from "@/lib/auth-context";

/**
 * Single source of truth for who can do what in the Member Registration module
 * (MR01–MR18: applications, board meetings/approvals, membership profiles,
 * documentation printing, dispatch).
 *
 * Nothing in this file governs Scholarships, Death Donation, Termination/Retirement
 * or Dormant Membership — those are out of scope here and keep whatever access they
 * already have.
 *
 * Member Profile Changes (Requirement 02) ARE governed here, at the end of the file.
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

// Approve or reject directly, with no board step. MMC04 (Basic Profile) and MMC17
// (Remittance) are decided by an authorised District Office user.
export const PROFILE_CHANGE_DIRECT_APPROVAL_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "DISTRICT_OFFICE",
];

// Build, print and process a Name or Nominee Change Approval List. MMC08–MMC13 and
// MMC21–MMC26 name the Head Office System User throughout.
export const PROFILE_CHANGE_APPROVAL_LIST_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
];

export function hasRole(role: UserRole | undefined | null, allowed: UserRole[]): boolean {
  return !!role && allowed.includes(role);
}
