"use client"

import { useEffect, useState } from "react"
import { Users, GraduationCap, XCircle, HeartHandshake, LucideIcon } from "lucide-react"
import { apiClient } from "@/lib/api/client"
import { getMembers } from "@/lib/api/member"
import { searchDeathDonationRequests } from "@/lib/api/deathDonation"
import { useAuth, type UserRole } from "@/lib/auth-context"
import { REGISTRATION_ROLES, hasPermission, hasRole } from "@/lib/permissions"

/**
 * Dashboard metrics.
 *
 * Every card here counts rows in the table it names. The previous version called only
 * getMembers() and getMemberApplications(), then derived the other three numbers from
 * the applications list with string heuristics — "Death Donations" rendered the member
 * application count outright, and "Pending Scholarships" counted any application whose
 * scholarshipDeathDonationPensionAmount was non-zero, which is a membership
 * contribution amount present on nearly every application. Both reported 1 against a
 * database holding zero scholarship and zero death donation requests.
 *
 * Cards are also filtered by role. The endpoints behind them are permission-gated
 * (Grade 5 needs G5_REQUEST_VIEW), so fetching unconditionally produces guaranteed
 * 403s for roles like DEATH_DONATION_OFFICER — the same failure the New Registrations
 * page hit with board meetings. A role that cannot see a metric does not get the card.
 */

type StatCardProps = {
  title: string
  value: number | string
  subtitle: string
  icon: LucideIcon
}

function StatCard({ title, value, subtitle, icon: Icon }: StatCardProps) {
  return (
    <div style={{
      flex: 1,
      minWidth: '200px',
      borderRadius: '12px',
      padding: '20px 24px',
      border: '1px solid #e5e7eb',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#953002', margin: 0 }}>{title}</p>
        <Icon style={{ width: '16px', height: '16px', color: '#9ca3af', flexShrink: 0 }} />
      </div>
      <p style={{ fontSize: '32px', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{subtitle}</p>
    </div>
  )
}

// Statuses that mean "waiting on a decision", per the request status enums.
const SCHOLARSHIP_PENDING = [
  "SUBMITTED_FOR_NORMAL_APPROVAL",
  "SUBMITTED_FOR_DEVIATION_APPROVAL",
]
const TERMINATION_PENDING = ["SUBMITTED_FOR_APPROVAL"]

// Death Donation is its own module with its own officer role, so it does not follow
// REGISTRATION_ROLES.
const DEATH_DONATION_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "HEAD_OFFICE",
  "BOARD_SECRETARY",
  "DISTRICT_OFFICE",
  "DEATH_DONATION_OFFICER",
]

/** A count that failed to load stays null, so the card shows "—" rather than a wrong 0. */
type Counts = {
  members: number | null
  scholarships: number | null
  terminations: number | null
  deathDonations: number | null
}

export default function StatsCards() {
  const { user } = useAuth()
  const role = user?.role

  const canSeeMembers = hasRole(role, REGISTRATION_ROLES)
  const canSeeScholarships = hasPermission(role, "G5_REQUEST_VIEW")
  const canSeeTerminations = hasRole(role, REGISTRATION_ROLES)
  const canSeeDeathDonations = hasRole(role, DEATH_DONATION_ROLES)

  const [counts, setCounts] = useState<Counts>({
    members: null,
    scholarships: null,
    terminations: null,
    deathDonations: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // allSettled, not all: one failing metric must not blank out the other three.
    async function load() {
      setLoading(true)

      const [members, scholarships, terminations, deathDonations] = await Promise.allSettled([
        canSeeMembers ? getMembers() : Promise.resolve(null),

        canSeeScholarships
          ? apiClient
              .get<unknown[]>("/api/grade5/requests/search", {
                params: { statuses: SCHOLARSHIP_PENDING },
              })
              .then((res) => res.data)
          : Promise.resolve(null),

        canSeeTerminations
          ? apiClient
              .get<unknown[]>("/api/termination-requests", {
                params: { statuses: TERMINATION_PENDING },
              })
              .then((res) => res.data)
          : Promise.resolve(null),

        canSeeDeathDonations ? searchDeathDonationRequests() : Promise.resolve(null),
      ])

      if (!mounted) return

      const count = (result: PromiseSettledResult<unknown[] | null>) => {
        if (result.status !== "fulfilled" || result.value === null) return null
        return Array.isArray(result.value) ? result.value.length : 0
      }

      setCounts({
        members: count(members),
        scholarships: count(scholarships),
        terminations: count(terminations),
        deathDonations: count(deathDonations),
      })
      setLoading(false)
    }

    void load()
    return () => {
      mounted = false
    }
  }, [canSeeMembers, canSeeScholarships, canSeeTerminations, canSeeDeathDonations])

  const show = (value: number | null) => (loading ? "…" : value ?? "—")

  return (
    <div className="flex flex-row gap-4 w-full overflow-x-auto">
      {canSeeMembers && (
        <StatCard
          title="Total Members"
          value={show(counts.members)}
          subtitle={loading ? "Loading" : `${counts.members ?? 0} total`}
          icon={Users}
        />
      )}

      {canSeeScholarships && (
        <StatCard
          title="Pending Scholarships"
          value={show(counts.scholarships)}
          subtitle="Requires Approval"
          icon={GraduationCap}
        />
      )}

      {canSeeTerminations && (
        <StatCard
          title="Pending Terminations"
          value={show(counts.terminations)}
          subtitle="In Review"
          icon={XCircle}
        />
      )}

      {canSeeDeathDonations && (
        <StatCard
          title="Death Donations"
          value={show(counts.deathDonations)}
          subtitle="Total requests"
          icon={HeartHandshake}
        />
      )}
    </div>
  )
}
