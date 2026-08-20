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
 * backend enforces the same Grade 5 matrix independently in RolePermissions.java, and
 * that copy is the one that counts. The two must be kept in step.
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

export function hasRole(role: UserRole | undefined | null, allowed: UserRole[]): boolean {
  return !!role && allowed.includes(role);
}

// ─── Grade 5 Scholarships (MMS01–MMS20) ──────────────────────────────────────
//
// Mirror of backend enums/Permission.java + config/RolePermissions.java. If you
// change a grant here, change it there too — this copy only hides buttons, the
// backend copy is what actually stops the request.

export type G5Permission =
  // Requests (MMS01–MMS05) — District Office territory
  | "G5_REQUEST_VIEW"
  | "G5_REQUEST_CREATE"
  | "G5_REQUEST_EDIT"
  | "G5_REQUEST_SUBMIT"
  | "G5_REQUEST_INCOMPLETE"
  | "G5_REQUEST_SET_INACTIVE"
  | "G5_REQUEST_REOPEN"
  // Approval lists (MMS06–MMS19) — Head Office territory
  | "G5_LIST_VIEW"
  | "G5_LIST_CREATE"
  | "G5_LIST_PRINT"
  | "G5_LIST_PROCESS"
  | "G5_LIST_DELETE"
  // Masters
  | "G5_EXAM_MASTER_VIEW"
  | "G5_EXAM_MASTER_MANAGE"
  // MMS20 — no endpoint behind this yet
  | "G5_FINANCE_DISBURSE";

const ALL_G5_PERMISSIONS: G5Permission[] = [
  "G5_REQUEST_VIEW",
  "G5_REQUEST_CREATE",
  "G5_REQUEST_EDIT",
  "G5_REQUEST_SUBMIT",
  "G5_REQUEST_INCOMPLETE",
  "G5_REQUEST_SET_INACTIVE",
  "G5_REQUEST_REOPEN",
  "G5_LIST_VIEW",
  "G5_LIST_CREATE",
  "G5_LIST_PRINT",
  "G5_LIST_PROCESS",
  "G5_LIST_DELETE",
  "G5_EXAM_MASTER_VIEW",
  "G5_EXAM_MASTER_MANAGE",
  "G5_FINANCE_DISBURSE",
];

/**
 * Segregation of duties: District Office raises requests, Head Office approves them.
 *
 * The SRS actor tables for MMS06/MMS13 name "District Office System User" as the
 * approver, but every child function beneath them (MMS07–MMS12, MMS14–MMS19) and the
 * §2.2.1 process narrative put approval at Head Office. Resolved in favour of Head
 * Office — an office that approves its own requests defeats the Board Meeting control
 * the whole module is built around.
 *
 * DEATH_DONATION_OFFICER is absent deliberately: it previously reached Grade 5 only by
 * falling through a catch-all branch in the sidebar, which is exactly the failure this
 * map exists to prevent.
 */
const G5_ROLE_PERMISSIONS: Record<UserRole, G5Permission[]> = {
  SUPER_ADMIN: ALL_G5_PERMISSIONS,

  DISTRICT_OFFICE: [
    "G5_REQUEST_VIEW",
    "G5_REQUEST_CREATE",
    "G5_REQUEST_EDIT",
    "G5_REQUEST_SUBMIT",
    "G5_REQUEST_INCOMPLETE",
    "G5_EXAM_MASTER_VIEW",
  ],

  HEAD_OFFICE: [
    "G5_REQUEST_VIEW",
    "G5_REQUEST_SET_INACTIVE",
    "G5_REQUEST_REOPEN",
    "G5_LIST_VIEW",
    "G5_LIST_CREATE",
    "G5_LIST_PRINT",
    "G5_LIST_PROCESS",
    "G5_LIST_DELETE",
    "G5_EXAM_MASTER_VIEW",
  ],

  BOARD_SECRETARY: [
    "G5_REQUEST_VIEW",
    "G5_REQUEST_SET_INACTIVE",
    "G5_REQUEST_REOPEN",
    "G5_LIST_VIEW",
    "G5_LIST_CREATE",
    "G5_LIST_PRINT",
    "G5_LIST_PROCESS",
    "G5_LIST_DELETE",
    "G5_EXAM_MASTER_VIEW",
  ],

  // Not an actor named in the SRS, but the only role whose name fits ownership of the
  // Exam Master (exam dates + district cut-off marks).
  SCHOLARSHIP_OFFICER: [
    "G5_REQUEST_VIEW",
    "G5_REQUEST_CREATE",
    "G5_REQUEST_EDIT",
    "G5_REQUEST_SUBMIT",
    "G5_REQUEST_INCOMPLETE",
    "G5_LIST_VIEW",
    "G5_EXAM_MASTER_VIEW",
    "G5_EXAM_MASTER_MANAGE",
  ],

  // "Head Office – Finance Department" in §2.2.1: read-only until MMS20 exists.
  ACCOUNTS: ["G5_REQUEST_VIEW", "G5_LIST_VIEW", "G5_FINANCE_DISBURSE"],

  DEATH_DONATION_OFFICER: [],
};

export function hasG5Permission(
  role: UserRole | undefined | null,
  permission: G5Permission
): boolean {
  return !!role && G5_ROLE_PERMISSIONS[role].includes(permission);
}

/** True when the role may reach the Grade 5 module at all — used for page guards. */
export function canAccessGrade5(role: UserRole | undefined | null): boolean {
  return (
    hasG5Permission(role, "G5_REQUEST_VIEW") || hasG5Permission(role, "G5_LIST_VIEW")
  );
}

/**
 * Roles whose remit is national rather than a single District Office.
 *
 * Mirrors ALL_LOCATION_ROLES in the backend's CurrentUserService. Anyone not listed
 * is pinned to their assignedDistrict, and the backend re-pins them regardless of
 * what the UI sends — this is only here so the Location filter renders correctly.
 */
export const G5_ALL_LOCATION_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
  "ACCOUNTS",
  "SCHOLARSHIP_OFFICER",
];

export function canSelectAllG5Locations(role: UserRole | undefined | null): boolean {
  return hasRole(role, G5_ALL_LOCATION_ROLES);
}

/**
 * The same question, asked without the Grade 5 framing.
 *
 * The national/district split is a property of the role, not of a module, so the
 * Termination & Retirement list asks it too. It deliberately reads the same array
 * rather than declaring a second one — two copies would drift.
 */
export function canSelectAllLocations(role: UserRole | undefined | null): boolean {
  return hasRole(role, G5_ALL_LOCATION_ROLES);
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
 * Segregation of duties: District Office raises retirement requests, Head Office
 * approves them.
 *
 * MMT16's actor table names "District Office System User" as the approver, but §3.1.1
 * says "the Authorized User from the District Office". Resolved in favour of Head
 * Office, the same way and for the same reason as the Grade 5 matrix above: the clerk
 * who raises a request must not be able to approve it.
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

  DISTRICT_OFFICE: [
    "RET_REQUEST_VIEW",
    "RET_REQUEST_CREATE",
    "RET_REQUEST_EDIT",
    "RET_REQUEST_SUBMIT",
    "RET_REQUEST_INCOMPLETE",
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
