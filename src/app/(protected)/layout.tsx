"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { SidebarProvider } from "@/src/components/ui/sidebar";
import NavigationSideBar from "@/src/components/NavigationItem/NavigationSideBar";
import TopHeader from "@/src/components/NavigationItem/TopHeader";

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

    // 403 is deliberately NOT a logout: the session is valid, the action simply is not
    // permitted. Pages that call fetch() directly read response.ok themselves, so the
    // response is passed through untouched and only logged here — logging out on 403
    // would bounce a legitimately signed-in user to /login for clicking one button.
    if (response.status === 403) {
      console.warn(
        `[permissions] 403 Forbidden for ${typeof input === "string" ? input : String(input)}`
      );
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

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#953002] border-t-transparent" />
          <p className="text-sm text-[#953002] font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    /*
     * h-svh, not the provider's own min-h-svh.
     *
     * SidebarProvider's wrapper is "flex min-h-svh w-full", so a page taller than the
     * viewport grows the flex row instead of being clipped by it, and the DOCUMENT
     * scrolls. The overflow-hidden and overflow-auto below then do nothing — they have
     * no bounded parent height to clip against — and the two h-16 bars scroll away with
     * everything else, taking the sidebar brand and the top header off the top of the
     * screen. Fixing the row to the viewport height puts the scrolling back inside
     * <main>, where it was meant to be.
     */
    <SidebarProvider className="h-svh overflow-hidden">
      {/* Left: Sidebar */}
      <NavigationSideBar />

      {/*
       * Right: Header + Page Content
       *
       * min-w-0 matters here. A flex item defaults to min-width:auto, so without it this
       * column refuses to shrink below its content's intrinsic width and overflows to the
       * right of the viewport — taking the header with it. The overflow-hidden then clips
       * whatever crossed the edge, which is what cut the profile dropdown in half: the
       * menu is absolutely positioned inside this column, so it is clipped by it.
       *
       * The overflow-hidden itself stays: it is what gives <main> a bounded height to
       * scroll inside (the vertical half of the same min-size rule).
       */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top header bar: search, role badge, notifications, profile */}
        <TopHeader />

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

