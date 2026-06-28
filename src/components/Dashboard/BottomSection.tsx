"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/src/components/ui/button"
import { Activity, ClipboardList } from "lucide-react"
import { getMemberApplications, MemberApplicationDTO } from "@/lib/api/memberApplications"
import { getMembers, MemberDTO } from "@/lib/api/member"

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

export default function BottomSection() {
  const [applications, setApplications] = useState<MemberApplicationDTO[]>([])
  const [members, setMembers] = useState<MemberDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const [apps, mems] = await Promise.all([getMemberApplications(), getMembers()])
        if (!mounted) return
        setApplications(apps ?? [])
        setMembers(mems ?? [])
      } catch (err: any) {
        setError(err?.message ?? String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const totalMembers = members.length
  const totalApplications = applications.length
  const pendingApplications = applications.filter(a => a.status === 'NEW' || a.status === 'SUBMITTED_FOR_APPROVAL').length
  const terminationRequests = applications.filter(a => a.boardDecisionReason?.toLowerCase()?.includes('termination')).length

  const recentActivities = [...applications]
    .sort((a, b) => (b.applicationDate ?? '').localeCompare(a.applicationDate ?? ''))
    .slice(0, 5)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>

      {/* Recent Activity */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-5 w-5 text-[#953002]" />
          <h2 className="text-lg font-semibold text-[#953002]">Recent Activity</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Latest actions across the system</p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Error: {error}</p>
        ) : (
          <div className="space-y-4">
            {recentActivities.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}

            {recentActivities.map((app) => (
              <div key={app.id ?? app.applicationID} className="flex gap-3 items-start">
                <div className="h-2 w-2 rounded-full bg-blue-500 mt-[5px] flex-shrink-0" />
                <div style={{ minWidth: 0 }}>
                  <p className="font-medium text-sm">{app.fullName ?? app.applicationID ?? 'Application'}</p>
                  <p className="text-sm text-muted-foreground">Status: {app.status ?? '—'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{app.applicationDate ? new Date(app.applicationDate).toLocaleString() : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Tasks */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="h-5 w-5 text-[#953002]" />
          <h2 className="text-lg font-semibold text-[#953002]">Pending Tasks</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Action items requiring your attention</p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Error: {error}</p>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center border rounded-xl p-3 gap-4">
              <div style={{ minWidth: 0 }}>
                <p className="font-medium text-sm">Total Members</p>
                <p className="text-sm text-muted-foreground">{totalMembers} member(s)</p>
              </div>
              <Button asChild size="sm" style={{ backgroundColor: "#953002", borderRadius: "8px", flexShrink: 0 }}>
                <Link href="/membership/directory">View</Link>
              </Button>
            </div>

            <div className="flex justify-between items-center border rounded-xl p-3 gap-4">
              <div style={{ minWidth: 0 }}>
                <p className="font-medium text-sm">New Member Applications</p>
                <p className="text-sm text-muted-foreground">{pendingApplications} application(s) waiting for review.</p>
              </div>
              <Button asChild size="sm" style={{ backgroundColor: "#953002", borderRadius: "8px", flexShrink: 0 }}>
                <Link href="/membership/new-registrations">View</Link>
              </Button>
            </div>

            <div className="flex justify-between items-center border rounded-xl p-3 gap-4">
              <div style={{ minWidth: 0 }}>
                <p className="font-medium text-sm">Total Applications</p>
                <p className="text-sm text-muted-foreground">{totalApplications} submitted</p>
              </div>
              <Button asChild size="sm" style={{ backgroundColor: "#953002", borderRadius: "8px", flexShrink: 0 }}>
                <Link href="/membership/new-registrations">View</Link>
              </Button>
            </div>

            <div className="flex justify-between items-center border rounded-xl p-3 gap-4">
              <div style={{ minWidth: 0 }}>
                <p className="font-medium text-sm">Termination Requests (detected)</p>
                <p className="text-sm text-muted-foreground">{terminationRequests} request(s) detected</p>
              </div>
              <Button asChild size="sm" style={{ backgroundColor: "#953002", borderRadius: "8px", flexShrink: 0 }}>
                <Link href="/membership/termination">View</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
