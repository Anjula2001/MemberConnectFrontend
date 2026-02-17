"use client"

import { Users, GraduationCap, XCircle, HeartHandshake, LucideIcon } from "lucide-react"

type StatCardProps = {
  title: string
  value: number
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
      {/* Title row: label on left, icon on right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#953002', margin: 0 }}>{title}</p>
        <Icon style={{ width: '16px', height: '16px', color: '#9ca3af', flexShrink: 0 }} />
      </div>
      {/* Value */}
      <p style={{ fontSize: '32px', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.1 }}>{value}</p>
      {/* Subtitle */}
      <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{subtitle}</p>
    </div>
  )
}

export default function StatsCards() {
  return (
    <div className="flex flex-row gap-4 w-full overflow-x-auto">
      <StatCard
        title="Total Members"
        value={5}
        subtitle="2 Active"
        icon={Users}
      />
      <StatCard
        title="Pending Scholarships"
        value={2}
        subtitle="Requires Approval"
        icon={GraduationCap}
      />
      <StatCard
        title="Pending Terminations"
        value={2}
        subtitle="In Review"
        icon={XCircle}
      />
      <StatCard
        title="Death Donations"
        value={3}
        subtitle="Processing"
        icon={HeartHandshake}
      />
    </div>
  )
}
