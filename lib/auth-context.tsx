"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "./api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole =
  | "SUPER_ADMIN"
  | "DISTRICT_OFFICE"
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

  // Load from localStorage on first render
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Attach token to all future requests
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await apiClient.post("/api/auth/login", { username, password });
    const { token: newToken, username: uname, fullName, role, profilePictureUrl } = response.data;

    const authUser: AuthUser = { username: uname, fullName, role, profilePictureUrl };

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
