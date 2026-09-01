"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Activity, BarChart3 } from "lucide-react"
import { getRecentActivity, AuditDTO } from "@/lib/api/audit"
import { apiClient } from "@/lib/api/client"
import { useAuth, type UserRole } from "@/lib/auth-context"
import { REGISTRATION_ROLES, hasRole } from "@/lib/permissions"

/**
 * Dashboard lower row: Recent Activity and At a glance.
 *
 * "Pending Tasks" used to live here and was mostly not tasks - Total Members and Total
 * Applications are metrics, and Total Members was already a stat card directly above.
 * The actionable items moved up into the queue row (StatsCards + queues.ts); what is
 * left here is the reference totals, stated once.
 */

// AuditController's own @PreAuthorize list - ACCOUNTS is included there because it can
// edit remittance details and so appears in the trail.
const AUDIT_ROLES: UserRole[] = [
  "DISTRICT_OFFICE",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
  "ACCOUNTS",
  "SUPER_ADMIN",
]

/**
 * Totals come from a COUNT endpoint, not from measuring a downloaded table.
 *
 * These two cards used to call getMembers() and getMemberApplications(), each of which
 * returns every row with no parameters - a 37-field DTO per member - so that .length
 * could produce a single integer.
 */
async function countOf(path: string, locations: string[] | null): Promise<number | null> {
  try {
    const { data } = await apiClient.get<{ count?: number }>(path, {
      params: locations && locations.length > 0 ? { locations } : undefined,
    })
    return typeof data?.count === "number" ? data.count : null
  } catch {
    return null
  }
}

const cardClass =
  "flex min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-neutral-950"

type Data = {
  activity: AuditDTO[] | null
  totalMembers: number | null
  totalApplications: number | null
}

export default function BottomSection() {
  const { user } = useAuth()
  const role = user?.role

  const canSeeMemberData = hasRole(role, REGISTRATION_ROLES)
  const canSeeActivity = hasRole(role, AUDIT_ROLES)

  // Scoped the same way as the queue row above: a District Office user's totals cover
  // their own district. Previously these two cards were the one place on the dashboard
  // that still reported national figures to a district clerk.
  const district = role === "DISTRICT_OFFICE" ? (user?.assignedDistrict ?? null) : null
  const locations = district ? [district] : null

  const [data, setData] = useState<Data>({
    activity: null,
    totalMembers: null,
    totalApplications: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)

      const [activity, members, applications] = await Promise.allSettled([
        canSeeActivity ? getRecentActivity(5) : Promise.resolve(null),
        canSeeMemberData ? countOf("/api/members/count", locations) : Promise.resolve(null),
        canSeeMemberData ? countOf("/api/applications/count", locations) : Promise.resolve(null),
      ])

      if (!mounted) return

      const value = <T,>(result: PromiseSettledResult<T | null>): T | null =>
        result.status === "fulfilled" ? result.value : null

      setData({
        activity: value(activity),
        totalMembers: value(members),
        totalApplications: value(applications),
      })
      setLoading(false)
    }

    void load()
    return () => {
      mounted = false
    }
  }, [canSeeActivity, canSeeMemberData, district])

  const show = (value: number | null) => (loading ? "…" : (value ?? "—"))

  // Nothing this role may see - render nothing rather than a row of error boxes.
  if (!canSeeActivity && !canSeeMemberData) {
    return null
  }

  return (
    <div
      className={
        "mt-4 grid gap-3 sm:mt-6 sm:gap-4 " +
        (canSeeActivity && canSeeMemberData ? "lg:grid-cols-2" : "grid-cols-1")
      }
    >
      {/* Recent Activity - the audit trail, the only record that spans every module. */}
      {canSeeActivity && (
        <div className={cardClass}>
          <div className="mb-1 flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#953002]" />
            <h2 className="text-lg font-semibold text-[#953002]">Recent Activity</h2>
          </div>
          <p className="mb-4 text-sm text-neutral-500">Latest actions across the system</p>

          {loading ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : data.activity === null ? (
            <p className="text-sm text-neutral-500">Activity could not be loaded</p>
          ) : data.activity.length === 0 ? (
            <p className="text-sm text-neutral-500">No recent activity</p>
          ) : (
            <ul className="max-h-[380px] space-y-4 overflow-y-auto">
              {data.activity.map((entry, index) => (
                <li key={entry.id ?? index} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-[6px] h-2 w-2 shrink-0 rounded-full bg-[#953002]"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {entry.actionName ?? "Action"}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {entry.moduleName?.replace(/_/g, " ") ?? "—"}
                      {entry.actionBy ? ` · ${entry.actionBy}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {entry.actionAt ? new Date(entry.actionAt).toLocaleString() : "—"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* At a glance - reference totals, not work items. */}
      {canSeeMemberData && (
        <div className={cardClass}>
          <div className="mb-1 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#953002]" />
            <h2 className="text-lg font-semibold text-[#953002]">At a glance</h2>
          </div>
          <p className="mb-4 text-sm text-neutral-500">
            {district ? `Totals for ${district}, for reference` : "Totals across the institute, for reference"}
          </p>

          <dl className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3 sm:gap-4 dark:border-neutral-800">
              <div className="min-w-0">
                <dt className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Members
                </dt>
                <dd className="text-sm text-neutral-500">{show(data.totalMembers)} on record</dd>
              </div>
              <Link
                href="/membership/directory"
                className="shrink-0 rounded-lg bg-[#953002] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#7a2700]"
              >
                View
              </Link>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3 sm:gap-4 dark:border-neutral-800">
              <div className="min-w-0">
                <dt className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Registrations
                </dt>
                <dd className="text-sm text-neutral-500">
                  {show(data.totalApplications)} submitted to date
                </dd>
              </div>
              <Link
                href="/membership/new-registrations"
                className="shrink-0 rounded-lg bg-[#953002] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#7a2700]"
              >
                View
              </Link>
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}
