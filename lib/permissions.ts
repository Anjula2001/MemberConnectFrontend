import type { UserRole } from "@/lib/auth-context";

/**
 * Single source of truth for who can do what, for the modules that have been
 * access-controlled so far:
 *
 *   1. Member Registration (MR01–MR18) — expressed as role lists, below.
 *   2. Grade 5 Scholarships (MMS01–MMS20)   — named permissions, further down.
 *   3. University Scholarships (MMS21–MMS48) — named permissions, same map.
 *
 * The two shapes coexist on purpose. Member Registration shipped with role lists and
 * works; converting it would be a refactor of live code for no behavioural gain. The
 * scholarship modules need named permissions because their SRS keeps describing
 * rights held *in addition* to a role ("the user needs Inactive rights", "the
 * authorized user who has the delete privileges", MMS41's "special authorization"),
 * which a role list cannot express.
 *
 * Still out of scope and unrestricted: Death Donation, Termination/Retirement,
 * Dormant Membership, Profile Changes.
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
  | "US_FINANCE_DISBURSE";

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

// University scholarship requests (MMS21-MMS25) only.
//
// No fund request rights at all, not even US_FUND_VIEW — briefly granted on
// 2026-08-19 and revoked on 2026-08-20. Since canAccessFundRequests() keys on
// US_FUND_VIEW, its absence both hides the sidebar item and makes the Fund Requests
// page render AccessRestricted. Mirrors RolePermissions.java — keep the two in step.
const UNIVERSITY_DISTRICT: Permission[] = [
  "US_REQUEST_VIEW",
  "US_REQUEST_CREATE",
  "US_REQUEST_EDIT",
  "US_REQUEST_SUBMIT",
  "US_REQUEST_INCOMPLETE",
  "US_MASTER_VIEW",
];

// The University board track. Deliberately WITHOUT US_COMMITTEE_APPROVE — the
// Committee gate (MMS26) must not be cleared by the office that runs the Board.
//
// US_FUND_APPROVE is included as of 2026-08-19 by product decision: the office that
// raises fund requests also decides them. It knowingly pairs US_APPROVED_EDIT
// (changing a payee's bank account) with releasing payment into that account.
// Mirrors RolePermissions.java on the backend — keep the two in step.
const UNIVERSITY_BOARD: Permission[] = [
  "US_REQUEST_VIEW",
  "US_REQUEST_SET_INACTIVE",
  "US_REQUEST_REOPEN",
  "US_LIST_VIEW",
  "US_LIST_CREATE",
  "US_LIST_PRINT",
  "US_LIST_PROCESS",
  "US_LIST_DELETE",
  "US_APPROVED_EDIT",
  "US_FUND_VIEW",
  "US_FUND_CREATE",
  "US_FUND_EDIT",
  "US_FUND_SUBMIT",
  "US_FUND_INCOMPLETE",
  "US_FUND_APPROVE",
  // Fund request View Mode status changes (New <-> Inactive). Withheld from District
  // Office, which raises fund requests.
  "US_FUND_SET_INACTIVE",
  "US_FUND_REOPEN",
  "US_MASTER_VIEW",
];

const ALL_PERMISSIONS: Permission[] = [
  ...GRADE5_DISTRICT,
  ...GRADE5_BOARD,
  "G5_EXAM_MASTER_MANAGE",
  "G5_FINANCE_DISBURSE",
  ...UNIVERSITY_DISTRICT,
  ...UNIVERSITY_BOARD,
  "US_COMMITTEE_APPROVE",
  "US_MASTER_MANAGE",
  "US_FINANCE_DISBURSE",
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

  DISTRICT_OFFICE: [...GRADE5_DISTRICT, ...UNIVERSITY_DISTRICT],

  // US_FINANCE_DISBURSE is listed here rather than in UNIVERSITY_BOARD because that
  // array is shared with BOARD_SECRETARY, which does not hold the finance hand-over.
  HEAD_OFFICE: [...GRADE5_BOARD, ...UNIVERSITY_BOARD, "US_FINANCE_DISBURSE"],

  // The same approval track as Head Office, plus the Grade 5 / University delete
  // privileges that DELETE_RIGHTS_ROLES also grants.
  BOARD_SECRETARY: [...GRADE5_BOARD, ...UNIVERSITY_BOARD],

  // Seat of the University Scholarship Committee (MMS26), and owner of the exam /
  // university masters.
  //
  // Note the asymmetry between the modules, which is deliberate: on Grade 5 this role
  // may raise requests, because Grade 5 has no committee step for it to then approve.
  // On University it may not, since holding US_REQUEST_CREATE together with
  // US_COMMITTEE_APPROVE would let one person create a request and clear the very
  // gate that exists to scrutinise it.
  SCHOLARSHIP_OFFICER: [
    ...GRADE5_DISTRICT,
    "G5_LIST_VIEW",
    "G5_EXAM_MASTER_MANAGE",
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

export function canSelectAllLocations(role: UserRole | undefined | null): boolean {
  return hasRole(role, ALL_LOCATION_ROLES);
}
