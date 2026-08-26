"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSidebar } from "@/src/components/ui/sidebar";
import {
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  User,
} from "lucide-react";

// ── Role label map ────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  DISTRICT_OFFICE: "District Office",
  DISTRICT_COMMITTEE: "District Committee",
  PD_COMMITTEE: "P&D Committee",
  BOARD_SECRETARY: "Board Secretary",
  HEAD_OFFICE: "Head Office",
  ACCOUNTS: "Accounts",
  SCHOLARSHIP_OFFICER: "Scholarship Officer",
  DEATH_DONATION_OFFICER: "Death Donation Officer",
};

export default function TopHeader() {
  const { user, logout } = useAuth();
  const { toggleSidebar, state } = useSidebar();
  const router = useRouter();

  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  // Close the profile menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
  };

  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : "";
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <header className="flex h-16 shrink-0 items-center gap-3.5 border-b border-neutral-200 bg-white px-5 shadow-xs">

      {/* ── Sidebar Toggle Button ─────────────────────────────────────── */}
      <button
        id="sidebar-toggle"
        onClick={toggleSidebar}
        title={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-transparent text-neutral-500 transition-all duration-200 hover:border-neutral-200 hover:bg-[#fdf5f2] hover:text-[#953002]"
      >
        {state === "expanded" ? (
          <PanelLeftClose className="h-5 w-5" />
        ) : (
          <PanelLeftOpen className="h-5 w-5" />
        )}
      </button>

      {/* Divider */}
      <div className="h-6 w-px bg-neutral-200 shrink-0" />

      {/* ── Institute Title ───────────────────────────────────────────
           Matches the name printed on the Membership Card, Signature Card and
           Passbook templates, so the screen and the printed documents agree.
           Truncates rather than pushing the role and profile cards off a narrow
           screen — those are functional, this is identification. */}
      <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight text-[#953002]">
        Future Finance Institute
      </h1>

      {/* ── Spacer ────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Role Badge Card (h-10, matching the profile card) ── */}
      <div className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-[#f4f4f5] px-3.5 shrink-0">
        <Shield className="h-4 w-4 text-[#953002]" />
        <span className="text-xs font-medium text-neutral-500">Role :</span>
        <span className="text-xs font-semibold text-[#953002]">{roleLabel}</span>
      </div>

      {/* ── Profile / Logout Card (h-10, matching the role card) ── */}
      <div ref={profileRef} className="relative shrink-0">
        <button
          id="profile-menu-trigger"
          onClick={() => setProfileOpen((v) => !v)}
          className="flex h-10 items-center gap-2.5 rounded-lg border border-neutral-200 bg-[#f4f4f5] px-3 transition-colors hover:border-[#953002]/30 hover:bg-[#fdf5f2]"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#953002] text-xs font-bold text-white shrink-0 shadow-xs overflow-hidden">
            {user?.profilePictureUrl ? (
              <img src={user.profilePictureUrl} alt={user.fullName} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <span className="hidden text-xs font-semibold text-neutral-800 sm:block max-w-[130px] truncate">
            {user?.fullName ?? "User"}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-neutral-200 bg-white shadow-lg">
            {/* User info */}
            <div className="border-b border-neutral-100 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#953002] text-sm font-bold text-white overflow-hidden">
                  {user?.profilePictureUrl ? (
                    <img src={user.profilePictureUrl} alt={user.fullName} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-800">{user?.fullName ?? "User"}</p>
                  <p className="text-xs font-medium text-[#953002]">{roleLabel}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-1.5">
              <button
                id="profile-menu-link"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-[#fdf5f2] hover:text-[#953002]"
                onClick={() => {
                  setProfileOpen(false);
                  router.push("/profile");
                }}
              >
                <User className="h-4 w-4 shrink-0" />
                Profile
              </button>

              {user?.role === "SUPER_ADMIN" && (
                <button
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-[#fdf5f2] hover:text-[#953002]"
                  onClick={() => { setProfileOpen(false); router.push("/admin/users"); }}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  User Management
                </button>
              )}
            </div>

            {/* Logout */}
            <div className="border-t border-neutral-100 p-1.5">
              <button
                id="logout-button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
