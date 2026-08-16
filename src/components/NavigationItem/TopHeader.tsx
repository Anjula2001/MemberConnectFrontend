"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSidebar } from "@/src/components/ui/sidebar";
import {
  Bell,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Shield,
  User,
} from "lucide-react";

// ── Role label map ────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  DISTRICT_OFFICE: "District Office",
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

  const [searchValue, setSearchValue] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
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
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-transparent text-neutral-500 transition-all duration-200 hover:border-neutral-200 hover:bg-[#fdf5f2] hover:text-[#9e3600]"
      >
        {state === "expanded" ? (
          <PanelLeftClose className="h-5 w-5" />
        ) : (
          <PanelLeftOpen className="h-5 w-5" />
        )}
      </button>

      {/* Divider */}
      <div className="h-6 w-px bg-neutral-200 shrink-0" />

      {/* ── Global Search Card (h-10 matching role and profile cards) ── */}
      <div className="relative w-80 max-w-sm">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          id="global-search"
          type="text"
          placeholder="Search global records..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-10 w-full rounded-lg border border-neutral-200 bg-[#f4f4f5] pl-10 pr-4 text-sm text-neutral-700 outline-none transition-all placeholder:text-neutral-400 focus:border-[#9e3600]/40 focus:bg-white focus:ring-2 focus:ring-[#9e3600]/10"
        />
      </div>

      {/* ── Spacer ────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Role Badge Card (h-10 matching search and profile cards) ── */}
      <div className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-[#f4f4f5] px-3.5 shrink-0">
        <Shield className="h-4 w-4 text-[#9e3600]" />
        <span className="text-xs font-medium text-neutral-500">Role :</span>
        <span className="text-xs font-semibold text-[#9e3600]">{roleLabel}</span>
      </div>

      {/* ── Notification Bell Card (h-10 w-10) ────────────────────────── */}
      <div ref={notifRef} className="relative shrink-0">
        <button
          id="notification-bell"
          onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-[#f4f4f5] text-neutral-500 transition-colors hover:border-[#9e3600]/30 hover:bg-[#fdf5f2] hover:text-[#9e3600]"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#9e3600] ring-2 ring-white" />
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-neutral-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <span className="text-sm font-semibold text-neutral-800">Notifications</span>
              <span className="rounded-full bg-[#9e3600]/10 px-2 py-0.5 text-xs font-medium text-[#9e3600]">3 new</span>
            </div>
            <div className="divide-y divide-neutral-50">
              {[
                { title: "New member application", time: "5 min ago", dot: "bg-blue-500" },
                { title: "Board approval pending", time: "1 hr ago", dot: "bg-[#9e3600]" },
                { title: "Scholarship request submitted", time: "2 hr ago", dot: "bg-green-500" },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-[#fdf5f2]/60 cursor-pointer transition-colors">
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.dot}`} />
                  <div>
                    <p className="text-sm font-medium text-neutral-700">{n.title}</p>
                    <p className="text-xs text-neutral-400">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-neutral-100 px-4 py-2.5">
              <button className="text-xs font-medium text-[#9e3600] hover:underline">View all notifications</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Profile / Logout Card (h-10 matching search and role cards) ── */}
      <div ref={profileRef} className="relative shrink-0">
        <button
          id="profile-menu-trigger"
          onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
          className="flex h-10 items-center gap-2.5 rounded-lg border border-neutral-200 bg-[#f4f4f5] px-3 transition-colors hover:border-[#9e3600]/30 hover:bg-[#fdf5f2]"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#9e3600] text-xs font-bold text-white shrink-0 shadow-xs">
            {initials}
          </div>
          <span className="hidden text-xs font-semibold text-neutral-800 sm:block max-w-[130px] truncate">
            {user?.fullName ?? "User"}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-neutral-200 bg-white shadow-lg">
            {/* User info */}
            <div className="border-b border-neutral-100 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#9e3600] text-sm font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-800">{user?.fullName ?? "User"}</p>
                  <p className="text-xs font-medium text-[#9e3600]">{roleLabel}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-1.5">
              <button
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-[#fdf5f2] hover:text-[#9e3600]"
                onClick={() => setProfileOpen(false)}
              >
                <User className="h-4 w-4 shrink-0" />
                Profile
              </button>

              {user?.role === "SUPER_ADMIN" && (
                <button
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-[#fdf5f2] hover:text-[#9e3600]"
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
