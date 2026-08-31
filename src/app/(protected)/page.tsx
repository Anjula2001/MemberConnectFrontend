"use client"

import StatsCards from "@/src/components/Dashboard/StatsCards"
import BottomSection from "@/src/components/Dashboard/BottomSection"
import { useAuth } from "@/lib/auth-context"

/** "Head Office" reads better than HEAD_OFFICE above someone's own work queue. */
function roleLabel(role?: string) {
  if (!role) return ""
  return role
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ")
    .replace("Pd Committee", "P&D Committee")
}

export default function Home() {
  const { user, isLoading } = useAuth()

  // District Office queues are scoped to the user's own district, so the header says
  // which one - otherwise the numbers are ambiguous between "my district" and "all".
  const scope =
    user?.role === "DISTRICT_OFFICE" && user?.assignedDistrict
      ? `${roleLabel(user.role)} · ${user.assignedDistrict}`
      : roleLabel(user?.role)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4">
        <div className="w-full p-6">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-[#953002]">
              {user?.fullName ? `Welcome back, ${user.fullName}` : "Dashboard"}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {isLoading ? "Loading your work…" : scope ? `${scope} — here is what is waiting on you.` : "Here is what is waiting on you."}
            </p>
          </header>

          <StatsCards />
          <BottomSection />
        </div>
      </div>
    </div>
  )
}
