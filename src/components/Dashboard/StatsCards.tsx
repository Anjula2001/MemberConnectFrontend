"use client"

import { useEffect, useState } from "react"
import { Users, GraduationCap, XCircle, HeartHandshake, LucideIcon } from "lucide-react"
import { getMemberApplications } from "@/lib/api/memberApplications"
import { getMembers } from "@/lib/api/member"

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

export default function StatsCards() {
  const [membersCount, setMembersCount] = useState<number | null>(null)
  const [applicationsCount, setApplicationsCount] = useState<number | null>(null)
  const [pendingScholarships, setPendingScholarships] = useState<number | null>(null)
  const [terminationRequests, setTerminationRequests] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const [members, applications] = await Promise.all([getMembers(), getMemberApplications()])
        if (!mounted) return
        setMembersCount(members?.length ?? 0)
        setApplicationsCount(applications?.length ?? 0)

        // Heuristic: identify scholarship requests by presence of scholarship-related field or keywords
        const scholarshipMatches = (applications ?? []).filter(a => {
          const title = (a.title ?? '').toString().toLowerCase()
          const full = (a.fullName ?? '').toString().toLowerCase()
          const hasScholarField = !!a.scholarshipDeathDonationPensionAmount
          return hasScholarField || title.includes('scholar') || full.includes('scholar')
        }).length
        setPendingScholarships(scholarshipMatches)

        // Heuristic: termination requests when boardDecisionReason or title contains 'terminat'
        const termMatches = (applications ?? []).filter(a => {
          const reason = (a.boardDecisionReason ?? '').toString().toLowerCase()
          const title = (a.title ?? '').toString().toLowerCase()
          return reason.includes('terminat') || title.includes('terminat')
        }).length
        setTerminationRequests(termMatches)
      } catch (err: any) {
        setError(err?.message ?? String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="flex flex-row gap-4 w-full overflow-x-auto">
      <StatCard
        title="Total Members"
        value={loading ? '…' : membersCount ?? '—'}
        subtitle={loading ? 'Loading' : `${membersCount ?? 0} total`}
        icon={Users}
      />

      <StatCard
        title="Pending Scholarships"
        value={loading ? '…' : pendingScholarships ?? 0}
        subtitle={loading ? 'Loading' : 'Requires Approval'}
        icon={GraduationCap}
      />

      <StatCard
        title="Pending Terminations"
        value={loading ? '…' : terminationRequests ?? 0}
        subtitle={loading ? 'Loading' : 'In Review'}
        icon={XCircle}
      />

      <StatCard
        title="Death Donations"
        value={loading ? '…' : applicationsCount ?? 0}
        subtitle={loading ? 'Loading' : 'Total requests'}
        icon={HeartHandshake}
      />
    </div>
  )
}
