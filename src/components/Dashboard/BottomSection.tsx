"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/src/components/ui/button"
import { Activity, ClipboardList } from "lucide-react"
import { apiClient } from "@/lib/api/client"
import { getRecentActivity, AuditDTO } from "@/lib/api/audit"
import { getMemberApplications, MemberApplicationDTO } from "@/lib/api/memberApplications"
import { getMembers, MemberDTO } from "@/lib/api/member"
import { useAuth, type UserRole } from "@/lib/auth-context"
import { REGISTRATION_ROLES, hasRole } from "@/lib/permissions"

/**
 * Dashboard lower row: Recent Activity and Pending Tasks.
 *
 * Rebuilt because both cards previously derived everything from one call to
 * getMemberApplications(). "Recent Activity" listed the newest member applications
 * under the subtitle "latest actions across the system", and "Termination Requests"
 * counted applications whose boardDecisionReason contained the substring
 * "termination" — a heuristic the label itself admitted to with "(detected)".
 *
 * Both now read the tables they name: the audit trail for activity, and
 * /api/termination-requests for terminations.
 *
 * Role handling matters here. MemberController, MemberApplicationController and
 * AuditController are all restricted, so the old unconditional fetches meant
 * SCHOLARSHIP_OFFICER and DEATH_DONATION_OFFICER landed on the home page and saw two
 * "You do not have permission" boxes. Each query is now gated on the caller's role and
 * each card is hidden when there is nothing it may show.
 */

const cardStyle: React.CSSProperties = {
  borderRadius: '16px',
  padding: '24px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  alignSelf: 'start',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '520px',
  overflow: 'hidden',
}

// AuditController's own @PreAuthorize list — ACCOUNTS is included there because it can
// edit remittance details and so appears in the trail.
const AUDIT_ROLES: UserRole[] = [
  "DISTRICT_OFFICE",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
  "ACCOUNTS",
  "SUPER_ADMIN",
]

/**
 * "Awaiting approval" means a decision is owed by someone else, which is two states,
 * not one. A request that has been put on a Termination Approval List is still
 * waiting for the board to sit — counting only SUBMITTED_FOR_APPROVAL reported
 * "0 awaiting approval" while a request sat on a list, which is the opposite of what
 * this card exists to say.
 *
 * NEW is deliberately excluded from both lists below: it is a draft the District
 * Office has not submitted yet, so nobody is waiting on it.
 */
const TERMINATION_PENDING = ["SUBMITTED_FOR_APPROVAL", "ADDED_TO_APPROVAL_LIST"]

/** The application-side counterpart, with the same reasoning. */
const APPLICATION_PENDING = ["SUBMITTED_FOR_APPROVAL", "ADDED_TO_BOARD_APPROVAL_LIST"]

/** Null means "not loaded" — rendered as "—" so it is never mistaken for a real zero. */
type Data = {
  activity: AuditDTO[] | null
  applications: MemberApplicationDTO[] | null
  members: MemberDTO[] | null
  pendingTerminations: number | null
}

export default function BottomSection() {
  const { user } = useAuth()
  const role = user?.role

  const canSeeMemberData = hasRole(role, REGISTRATION_ROLES)
  const canSeeActivity = hasRole(role, AUDIT_ROLES)

  const [data, setData] = useState<Data>({
    activity: null,
    applications: null,
    members: null,
    pendingTerminations: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)

      // allSettled, not all: a single denied or failing endpoint must not blank the
      // whole row, which is what the previous shared `error` state did.
      const [activity, applications, members, terminations] = await Promise.allSettled([
        canSeeActivity ? getRecentActivity(5) : Promise.resolve(null),
        canSeeMemberData ? getMemberApplications() : Promise.resolve(null),
        canSeeMemberData ? getMembers() : Promise.resolve(null),
        canSeeMemberData
          ? apiClient
              .get<unknown[]>("/api/termination-requests", {
                params: { statuses: TERMINATION_PENDING },
              })
              .then((res) => res.data)
          : Promise.resolve(null),
      ])

      if (!mounted) return

      const value = <T,>(result: PromiseSettledResult<T | null>): T | null =>
        result.status === "fulfilled" ? result.value : null

      const terminationRows = value(terminations)

      setData({
        activity: value(activity),
        applications: value(applications),
        members: value(members),
        pendingTerminations: Array.isArray(terminationRows) ? terminationRows.length : null,
      })
      setLoading(false)
    }

    void load()
    return () => {
      mounted = false
    }
  }, [canSeeActivity, canSeeMemberData])

  const applications = data.applications ?? []
  const totalMembers = data.members?.length ?? null
  const totalApplications = data.applications?.length ?? null
  const pendingApplications = data.applications
    ? applications.filter((a) => APPLICATION_PENDING.includes(a.status as string)).length
    : null

  const show = (value: number | null) => (loading ? '…' : value ?? '—')

  // Nothing this role may see — render nothing rather than a row of error boxes.
  if (!canSeeActivity && !canSeeMemberData) {
    return null
  }

  const gridColumns = canSeeActivity && canSeeMemberData ? '1fr 1fr' : '1fr'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: '16px', marginTop: '24px' }}>

      {/* Recent Activity — the audit trail, which is the only record of actions from
          every module rather than member applications alone. */}
      {canSeeActivity && (
        <div style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-5 w-5 text-[#953002]" />
            <h2 className="text-lg font-semibold text-[#953002]">Recent Activity</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Latest actions across the system</p>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : data.activity === null ? (
            <p className="text-sm text-muted-foreground">Activity could not be loaded</p>
          ) : data.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-4" style={{ overflowY: 'auto' }}>
              {data.activity.map((entry, index) => (
                <div key={entry.id ?? index} className="flex gap-3 items-start">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-[5px] flex-shrink-0" />
                  <div style={{ minWidth: 0 }}>
                    <p className="font-medium text-sm">{entry.actionName ?? 'Action'}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.moduleName?.replace(/_/g, ' ') ?? '—'}
                      {entry.actionBy ? ` · ${entry.actionBy}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.actionAt ? new Date(entry.actionAt).toLocaleString() : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending Tasks */}
      {canSeeMemberData && (
        <div style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="h-5 w-5 text-[#953002]" />
            <h2 className="text-lg font-semibold text-[#953002]">Pending Tasks</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Action items requiring your attention</p>

          <div className="space-y-3">
            <div className="flex justify-between items-center border rounded-xl p-3 gap-4">
              <div style={{ minWidth: 0 }}>
                <p className="font-medium text-sm">Total Members</p>
                <p className="text-sm text-muted-foreground">{show(totalMembers)} member(s)</p>
              </div>
              <Button asChild size="sm" style={{ backgroundColor: "#953002", borderRadius: "8px", flexShrink: 0 }}>
                <Link href="/membership/directory">View</Link>
              </Button>
            </div>

            <div className="flex justify-between items-center border rounded-xl p-3 gap-4">
              <div style={{ minWidth: 0 }}>
                <p className="font-medium text-sm">New Member Applications</p>
                <p className="text-sm text-muted-foreground">{show(pendingApplications)} application(s) waiting for review.</p>
              </div>
              <Button asChild size="sm" style={{ backgroundColor: "#953002", borderRadius: "8px", flexShrink: 0 }}>
                <Link href="/membership/new-registrations">View</Link>
              </Button>
            </div>

            <div className="flex justify-between items-center border rounded-xl p-3 gap-4">
              <div style={{ minWidth: 0 }}>
                <p className="font-medium text-sm">Total Applications</p>
                <p className="text-sm text-muted-foreground">{show(totalApplications)} submitted</p>
              </div>
              <Button asChild size="sm" style={{ backgroundColor: "#953002", borderRadius: "8px", flexShrink: 0 }}>
                <Link href="/membership/new-registrations">View</Link>
              </Button>
            </div>

            {/* Counts termination_request rows, not applications whose text happens to
                contain "termination". */}
            <div className="flex justify-between items-center border rounded-xl p-3 gap-4">
              <div style={{ minWidth: 0 }}>
                <p className="font-medium text-sm">Termination Requests</p>
                <p className="text-sm text-muted-foreground">{show(data.pendingTerminations)} awaiting approval</p>
              </div>
              <Button asChild size="sm" style={{ backgroundColor: "#953002", borderRadius: "8px", flexShrink: 0 }}>
                <Link href="/membership/termination">View</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
