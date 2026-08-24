"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  createAdminUser,
  fetchAdminUsers,
  resetAdminUserPassword,
  toggleAdminUserStatus,
  updateAdminUser,
  type AdminUserItem,
} from "@/lib/api/adminUsers";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Filter,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";

// ── Sri Lankan Administrative Districts ────────────────────────────────────────
const SRI_LANKAN_DISTRICTS = [
  "Colombo",
  "Gampaha",
  "Kalutara",
  "Kandy",
  "Matale",
  "Nuwara Eliya",
  "Galle",
  "Matara",
  "Hambantota",
  "Jaffna",
  "Kilinochchi",
  "Mannar",
  "Vavuniya",
  "Mullaitivu",
  "Batticaloa",
  "Ampara",
  "Trincomalee",
  "Kurunegala",
  "Puttalam",
  "Anuradhapura",
  "Polonnaruwa",
  "Badulla",
  "Monaragala",
  "Ratnapura",
  "Kegalle",
];

// ── Roles & metadata ──────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    desc: "Unrestricted master access to all system functions and user management",
  },
  DISTRICT_OFFICE: {
    label: "District Office",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    desc: "Creates registrations, uploads docs & manages district-level records",
  },
  DISTRICT_COMMITTEE: {
    label: "District Committee",
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
    desc: "Second-level approval of member death records escalated by the District Office",
  },
  PD_COMMITTEE: {
    label: "P&D Committee",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    desc: "Final approval of member death records escalated to Planning & Development",
  },
  BOARD_SECRETARY: {
    label: "Board Secretary",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    desc: "Manages board meetings, approval lists & final application approvals",
  },
  HEAD_OFFICE: {
    label: "Head Office",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    desc: "Oversees nationwide applications, board approvals & document printing",
  },
  ACCOUNTS: {
    label: "Accounts",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    desc: "Manages financial accounts, ledger remittances & member activation",
  },
  SCHOLARSHIP_OFFICER: {
    label: "Scholarship Officer",
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    desc: "Processes Grade 5 & University scholarships and fund requests",
  },
  DEATH_DONATION_OFFICER: {
    label: "Death Donation Officer",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    desc: "Handles member death records & death donation benefit claims",
  },
};

// Roles that may hold authorising power. Both offices mix clerks who prepare records
// with officers who sign them off, so the role alone cannot tell the two apart —
// everyone else is created unauthorised and the checkbox is not offered.
const AUTHORITY_ROLES = ["DISTRICT_OFFICE", "HEAD_OFFICE"];

const canHoldAuthority = (role: string) => AUTHORITY_ROLES.includes(role);

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Selected user for edit / reset
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);

  // Create Form State
  const [createFullName, setCreateFullName] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("DISTRICT_OFFICE");
  const [createDistrict, setCreateDistrict] = useState("Colombo");
  const [createAuthorized, setCreateAuthorized] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit Form State
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editDistrict, setEditDistrict] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editAuthorized, setEditAuthorized] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Reset Password State
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users", err);
      addToast("Failed to load user accounts", "destructive");
    } finally {
      setLoading(false);
    }
  };

  // Helper: Generate Random Secure Password
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // Handle Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUsername.trim() || !createPassword.trim() || !createFullName.trim()) {
      addToast("Please fill all required fields", "destructive");
      return;
    }

    try {
      setSubmittingCreate(true);
      const newUser = await createAdminUser({
        username: createUsername.trim().toLowerCase(),
        password: createPassword,
        fullName: createFullName.trim(),
        role: createRole,
        assignedDistrict: createRole === "DISTRICT_OFFICE" ? createDistrict : null,
        authorized: canHoldAuthority(createRole) ? createAuthorized : false,
      });

      setUsers((prev) => [newUser, ...prev]);
      addToast(`User '${newUser.username}' created successfully!`);

      // Reset form
      setCreateFullName("");
      setCreateUsername("");
      setCreatePassword("");
      setCreateRole("DISTRICT_OFFICE");
      setCreateDistrict("Colombo");
      setCreateAuthorized(false);
      setShowCreateModal(false);
    } catch (err) {
      console.error("Create user failed", err);
      addToast(err instanceof Error ? err.message : "Failed to create user", "destructive");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Handle Edit User
  const openEditModal = (u: AdminUserItem) => {
    setSelectedUser(u);
    setEditFullName(u.fullName);
    setEditRole(u.role);
    setEditDistrict(u.assignedDistrict || "Colombo");
    setEditIsActive(u.active);
    setEditAuthorized(u.authorized);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setSubmittingEdit(true);
      const updated = await updateAdminUser(selectedUser.id, {
        fullName: editFullName.trim(),
        role: editRole,
        assignedDistrict: editRole === "DISTRICT_OFFICE" ? editDistrict : null,
        isActive: editIsActive,
        authorized: canHoldAuthority(editRole) ? editAuthorized : false,
      });

      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      addToast(`User '${updated.username}' updated successfully!`);
      setShowEditModal(false);
    } catch (err) {
      console.error("Update user failed", err);
      addToast(err instanceof Error ? err.message : "Failed to update user", "destructive");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Handle Reset Password
  const openResetModal = (u: AdminUserItem) => {
    setSelectedUser(u);
    setResetNewPassword("");
    setShowResetPassword(false);
    setShowResetModal(true);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !resetNewPassword || resetNewPassword.length < 6) {
      addToast("Password must be at least 6 characters", "destructive");
      return;
    }

    try {
      setSubmittingReset(true);
      const res = await resetAdminUserPassword(selectedUser.id, resetNewPassword);
      addToast(res.message || "Password reset successfully!");
      setShowResetModal(false);
    } catch (err) {
      console.error("Reset password failed", err);
      addToast(err instanceof Error ? err.message : "Failed to reset password", "destructive");
    } finally {
      setSubmittingReset(false);
    }
  };

  // Handle Toggle Active Status
  const handleToggleStatus = async (u: AdminUserItem) => {
    if (u.username === currentUser?.username) {
      addToast("You cannot deactivate your own account", "destructive");
      return;
    }

    try {
      const updated = await toggleAdminUserStatus(u.id);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      addToast(
        `User '${u.username}' is now ${updated.active ? "Active" : "Inactive"}`
      );
    } catch (err) {
      console.error("Toggle status failed", err);
      addToast("Failed to change user status", "destructive");
    }
  };

  // Filtered list
  const filteredUsers = users.filter((u) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.fullName.toLowerCase().includes(q);
      const matchUsername = u.username.toLowerCase().includes(q);
      const matchDistrict = (u.assignedDistrict || "").toLowerCase().includes(q);
      if (!matchName && !matchUsername && !matchDistrict) return false;
    }

    // Role filter
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;

    // District filter
    if (districtFilter !== "ALL") {
      if (u.assignedDistrict !== districtFilter) return false;
    }

    // Status filter
    if (statusFilter === "ACTIVE" && !u.active) return false;
    if (statusFilter === "INACTIVE" && u.active) return false;

    return true;
  });

  // Statistics
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.active).length;
  const districtCount = users.filter((u) => u.role === "DISTRICT_OFFICE").length;
  const headOfficeCount = users.filter(
    (u) => u.role === "HEAD_OFFICE" || u.role === "BOARD_SECRETARY"
  ).length;

  if (currentUser && currentUser.role !== "SUPER_ADMIN") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-200 shadow-sm mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-800">Super Admin Access Required</h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500">
          User & Role Management is restricted exclusively to the Master Super Administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#9e3600]">User & Role Management</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Create, manage staff accounts, assign administrative roles, and allocate district branches.
          </p>
        </div>

        <button
          id="create-user-btn"
          onClick={() => {
            setCreatePassword(generateRandomPassword());
            setShowCreateModal(true);
          }}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#9e3600] px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#b33f00]"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New Staff User</span>
        </button>
      </div>

      {/* ── Metric Summary Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Total Users</span>
            <Users className="h-4 w-4 text-[#9e3600]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-800">{totalCount}</p>
          <p className="mt-1 text-[11px] text-neutral-400">Registered staff accounts</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Active Accounts</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{activeCount}</p>
          <p className="mt-1 text-[11px] text-neutral-400">Can log in & operate</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">District Officers</span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600">{districtCount}</p>
          <p className="mt-1 text-[11px] text-neutral-400">Regional entry officers</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Head Office & Board</span>
            <Shield className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-purple-600">{headOfficeCount}</p>
          <p className="mt-1 text-[11px] text-neutral-400">Approvals & Governance</p>
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            id="user-search-input"
            type="text"
            placeholder="Search by name, username, or district..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-[#f4f4f5] pl-9 pr-4 text-sm text-neutral-700 outline-none transition-all focus:border-[#9e3600]/50 focus:bg-white"
          />
        </div>

        {/* Role Filter */}
        <div className="w-48">
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-[#f4f4f5] px-3 text-xs font-medium text-neutral-700 outline-none focus:border-[#9e3600]/50"
          >
            <option value="ALL">All Roles</option>
            {Object.keys(ROLE_CONFIG).map((roleKey) => (
              <option key={roleKey} value={roleKey}>
                {ROLE_CONFIG[roleKey].label}
              </option>
            ))}
          </select>
        </div>

        {/* District Filter */}
        <div className="w-44">
          <select
            id="district-filter"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-[#f4f4f5] px-3 text-xs font-medium text-neutral-700 outline-none focus:border-[#9e3600]/50"
          >
            <option value="ALL">All Districts</option>
            {SRI_LANKAN_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-36">
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-[#f4f4f5] px-3 text-xs font-medium text-neutral-700 outline-none focus:border-[#9e3600]/50"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        {(searchQuery || roleFilter !== "ALL" || districtFilter !== "ALL" || statusFilter !== "ALL") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setRoleFilter("ALL");
              setDistrictFilter("ALL");
              setStatusFilter("ALL");
            }}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* ── Users Table ────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#9e3600] border-t-transparent" />
              <p className="text-sm font-medium text-neutral-500">Loading user accounts...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-neutral-700">No users found</p>
            <p className="text-xs text-neutral-400">Try adjusting your search criteria or create a new user.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-[#f4f4f5]/60 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-5 py-3.5">Staff User</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Assigned District</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Created Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredUsers.map((u) => {
                  const roleMeta = ROLE_CONFIG[u.role] || {
                    label: u.role,
                    bg: "bg-neutral-50",
                    text: "text-neutral-700",
                    border: "border-neutral-200",
                    desc: "",
                  };

                  const initials = (u.fullName || u.username)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  const isMe = u.username === currentUser?.username;

                  return (
                    <tr key={u.id} className="transition-colors hover:bg-[#fdf5f2]/40">
                      {/* User details */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#9e3600] text-xs font-bold text-white shadow-xs overflow-hidden">
                            {u.profilePictureUrl ? (
                              <img
                                src={u.profilePictureUrl}
                                alt={u.fullName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-neutral-800">{u.fullName}</span>
                              {isMe && (
                                <span className="rounded-sm bg-neutral-100 px-1.5 py-0.2 text-[10px] font-bold text-neutral-500">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-neutral-400">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${roleMeta.bg} ${roleMeta.text} ${roleMeta.border}`}
                            title={roleMeta.desc}
                          >
                            <Shield className="h-3 w-3 shrink-0" />
                            {roleMeta.label}
                          </span>
                          {u.authorized && (
                            <span
                              className="inline-flex items-center gap-1 rounded-md border border-[#9e3600]/25 bg-[#fdf5f2] px-2 py-1 text-xs font-semibold text-[#9e3600]"
                              title="Holds authorising power, not preparation only"
                            >
                              <ShieldCheck className="h-3 w-3 shrink-0" />
                              Authorized
                            </span>
                          )}
                        </div>
                      </td>

                      {/* District */}
                      <td className="px-5 py-4">
                        {u.assignedDistrict ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700">
                            <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                            {u.assignedDistrict}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">All / Head Office</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {u.active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="px-5 py-4 text-xs text-neutral-500">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:border-[#9e3600]/40 hover:bg-[#fdf5f2] hover:text-[#9e3600]"
                            title="Edit user details"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => openResetModal(u)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
                            title="Reset password"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>

                          {/* Toggle Active Status */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isMe}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                              isMe
                                ? "border-neutral-100 text-neutral-300 cursor-not-allowed"
                                : u.active
                                ? "border-neutral-200 text-neutral-600 hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                                : "border-neutral-200 text-neutral-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
                            }`}
                            title={isMe ? "Cannot deactivate yourself" : u.active ? "Deactivate account" : "Activate account"}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE USER MODAL ──────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#9e3600]/10 text-[#9e3600]">
                  <UserPlus className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-neutral-800">Add New Staff Account</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="create-fullname"
                  type="text"
                  placeholder="e.g. Kasun Jayasinghe"
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 px-3.5 text-sm text-neutral-800 outline-none focus:border-[#9e3600] focus:ring-2 focus:ring-[#9e3600]/10"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  id="create-username"
                  type="text"
                  placeholder="e.g. kasun_colombo"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                  className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 px-3.5 text-sm text-neutral-800 outline-none focus:border-[#9e3600] focus:ring-2 focus:ring-[#9e3600]/10"
                  required
                />
                <p className="mt-1 text-[11px] text-neutral-400">Lowercase letters, numbers, and underscores only</p>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Initial Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreatePassword(generateRandomPassword())}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#9e3600] hover:underline"
                  >
                    <Sparkles className="h-3 w-3" /> Generate Random
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <input
                    id="create-password"
                    type={showCreatePassword ? "text" : "password"}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Enter or generate password"
                    className="h-10 w-full rounded-lg border border-neutral-200 pl-3.5 pr-10 text-sm text-neutral-800 outline-none focus:border-[#9e3600] focus:ring-2 focus:ring-[#9e3600]/10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Role & Permissions <span className="text-red-500">*</span>
                </label>
                <select
                  id="create-role"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-800 outline-none focus:border-[#9e3600]"
                >
                  {Object.keys(ROLE_CONFIG).map((roleKey) => (
                    <option key={roleKey} value={roleKey}>
                      {ROLE_CONFIG[roleKey].label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-neutral-500">
                  {ROLE_CONFIG[createRole]?.desc}
                </p>
              </div>

              {/* Assigned District (Enabled if DISTRICT_OFFICE) */}
              {createRole === "DISTRICT_OFFICE" && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Assigned District Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="create-district"
                    value={createDistrict}
                    onChange={(e) => setCreateDistrict(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-800 outline-none focus:border-[#9e3600]"
                  >
                    {SRI_LANKAN_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d} District
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Authority (District Office & Head Office only) */}
              {canHoldAuthority(createRole) && (
                <div className="rounded-lg border border-neutral-200 bg-[#fdf5f2]/50 p-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      id="create-authorized"
                      type="checkbox"
                      checked={createAuthorized}
                      onChange={(e) => setCreateAuthorized(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-sm border-neutral-300 text-[#9e3600] focus:ring-[#9e3600]"
                    />
                    <div>
                      <label
                        htmlFor="create-authorized"
                        className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-neutral-800"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-[#9e3600]" />
                        Authorized Officer
                      </label>
                      <p className="mt-0.5 text-[11px] text-neutral-500">
                        Grant authorising power in addition to the role. Leave unchecked for staff
                        who only prepare records for someone else to sign off.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-10 rounded-lg border border-neutral-200 px-4 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  id="submit-create-user"
                  type="submit"
                  disabled={submittingCreate}
                  className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#9e3600] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#b33f00] disabled:opacity-60"
                >
                  {submittingCreate ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Creating User...</span>
                    </>
                  ) : (
                    <span>Create User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ────────────────────────────────────────── */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#9e3600]/10 text-[#9e3600]">
                  <Pencil className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-neutral-800">
                  Edit User: @{selectedUser.username}
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 px-3.5 text-sm text-neutral-800 outline-none focus:border-[#9e3600]"
                  required
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-800 outline-none focus:border-[#9e3600]"
                >
                  {Object.keys(ROLE_CONFIG).map((roleKey) => (
                    <option key={roleKey} value={roleKey}>
                      {ROLE_CONFIG[roleKey].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* District */}
              {editRole === "DISTRICT_OFFICE" && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Assigned District
                  </label>
                  <select
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-800 outline-none focus:border-[#9e3600]"
                  >
                    {SRI_LANKAN_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d} District
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Authority (District Office & Head Office only) */}
              {canHoldAuthority(editRole) && (
                <div className="rounded-lg border border-neutral-200 bg-[#fdf5f2]/50 p-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      id="edit-authorized"
                      type="checkbox"
                      checked={editAuthorized}
                      onChange={(e) => setEditAuthorized(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-sm border-neutral-300 text-[#9e3600] focus:ring-[#9e3600]"
                    />
                    <div>
                      <label
                        htmlFor="edit-authorized"
                        className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-neutral-800"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-[#9e3600]" />
                        Authorized Officer
                      </label>
                      <p className="mt-0.5 text-[11px] text-neutral-500">
                        Grant authorising power in addition to the role.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Checkbox */}
              <div className="flex items-center gap-2.5 pt-2">
                <input
                  id="edit-is-active"
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-neutral-300 text-[#9e3600] focus:ring-[#9e3600]"
                />
                <label htmlFor="edit-is-active" className="text-sm font-medium text-neutral-700 cursor-pointer">
                  Account is Active and allowed to sign in
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="h-10 rounded-lg border border-neutral-200 px-4 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#9e3600] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#b33f00] disabled:opacity-60"
                >
                  {submittingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ───────────────────────────────────── */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <KeyRound className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-neutral-800">
                  Reset Password for @{selectedUser.username}
                </h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-700">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetNewPassword(generateRandomPassword())}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#9e3600] hover:underline"
                  >
                    <Sparkles className="h-3 w-3" /> Generate Random
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="h-10 w-full rounded-lg border border-neutral-200 pl-3.5 pr-10 text-sm text-neutral-800 outline-none focus:border-[#9e3600]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="h-10 rounded-lg border border-neutral-200 px-4 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="flex h-10 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-5 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  {submittingReset ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
