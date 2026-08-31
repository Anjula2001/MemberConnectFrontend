"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "./api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole =
  | "SUPER_ADMIN"
  | "DISTRICT_OFFICE"
  // The second and third Member Death approval levels (MMT23, MMT24).
  | "DISTRICT_COMMITTEE"
  | "PD_COMMITTEE"
  | "BOARD_SECRETARY"
  | "HEAD_OFFICE"
  | "ACCOUNTS"
  | "SCHOLARSHIP_OFFICER"
  | "DEATH_DONATION_OFFICER";

export interface AuthUser {
  username: string;
  fullName: string;
  role: UserRole;
  profilePictureUrl?: string | null;
  assignedDistrict?: string | null;
  /**
   * Authorising power held on top of the role, set per-account by the Super Admin.
   *
   * Only District Office and Head Office accounts can carry it — the backend forces it
   * false for every other role. Sessions stored before this field existed read back as
   * undefined, which the permission helpers treat as "not authorised".
   */
  authorized?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateCurrentUser: (updated: Partial<AuthUser>) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  /**
   * Re-read the signed-in user from /api/profile and merge it over the stored copy.
   *
   * Deliberately silent on failure: an offline tab or a flaky request must leave the
   * session exactly as it was, not sign anyone out. A genuinely dead token is already
   * handled by the 401 interceptor in api/client.ts.
   */
  const refreshCurrentUser = async () => {
    try {
      const { data } = await apiClient.get("/api/profile");
      setUser((prev) => {
        if (!prev) return prev;
        const next: AuthUser = {
          ...prev,
          fullName: data.fullName ?? prev.fullName,
          role: data.role ?? prev.role,
          profilePictureUrl: data.profilePictureUrl ?? prev.profilePictureUrl,
          assignedDistrict: data.assignedDistrict ?? prev.assignedDistrict,
          authorized: !!data.authorized,
        };
        localStorage.setItem("auth_user", JSON.stringify(next));
        return next;
      });
    } catch {
      // Keep the stored session as-is.
    }
  };

  // Load from localStorage on first render
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Attach token to all future requests
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
      // …then bring it up to date from the server. The stored copy is a snapshot taken
      // at login, so a Super Admin granting authority — or changing a role or district —
      // would otherwise not reach the user until they next signed out and in. The
      // backend already resolves authorities per request for exactly this reason; this
      // keeps the values the UI hides buttons on from lagging behind it.
      void refreshCurrentUser();
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await apiClient.post("/api/auth/login", { username, password });
    const {
      token: newToken,
      username: uname,
      fullName,
      role,
      profilePictureUrl,
      assignedDistrict,
      authorized,
    } = response.data;

    const authUser: AuthUser = {
      username: uname,
      fullName,
      role,
      profilePictureUrl,
      assignedDistrict,
      authorized: !!authorized,
    };

    // Persist
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("auth_user", JSON.stringify(authUser));

    // Attach to axios for all subsequent calls
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

    setToken(newToken);
    setUser(authUser);
  };

  const updateCurrentUser = (updated: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      localStorage.setItem("auth_user", JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    delete apiClient.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
