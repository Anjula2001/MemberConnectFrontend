"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { SidebarProvider, SidebarTrigger } from "@/src/components/ui/sidebar";
import NavigationSideBar from "@/src/components/NavigationItem/NavigationSideBar";

// Patch global fetch to auto-inject JWT on every raw fetch() call
// This fixes all pages that use fetch() directly instead of apiClient
function patchGlobalFetch() {
  if (typeof window === "undefined") return;
  if ((window as Window & { __fetchPatched?: boolean }).__fetchPatched) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = localStorage.getItem("auth_token");

    if (token) {
      const headers = new Headers(init?.headers);
      // Only inject if not already set
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      init = { ...init, headers };
    }

    const response = await originalFetch(input, init);

    // Auto-logout on 401
    if (response.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/login";
    }

    return response;
  };

  (window as Window & { __fetchPatched?: boolean }).__fetchPatched = true;
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Patch fetch as soon as protected layout mounts
    patchGlobalFetch();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#9e3600] border-t-transparent" />
          <p className="text-sm text-[#9e3600] font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SidebarProvider>
      <NavigationSideBar />
      <main className="flex-1">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}
