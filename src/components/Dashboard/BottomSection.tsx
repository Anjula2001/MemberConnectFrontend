"use client"

import { Button } from "@/src/components/ui/button"
import { Activity, ClipboardList } from "lucide-react"

const cardStyle: React.CSSProperties = {
  borderRadius: '16px',
  padding: '24px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
}

export default function BottomSection() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>

      {/* Recent Activity */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-5 w-5 text-[#953002]" />
          <h2 className="text-lg font-semibold text-[#953002]">Recent Activity</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Latest actions across the system</p>

        <div className="space-y-4">
          <div className="flex gap-3 items-start">
            <div className="h-2 w-2 rounded-full bg-blue-500 mt-[5px] flex-shrink-0" />
            <div style={{ minWidth: 0 }}>
              <p className="font-medium text-sm">Application: Second User</p>
              <p className="text-sm text-muted-foreground">Draft Created by District User</p>
              <p className="text-xs text-muted-foreground mt-0.5">2/8/2026 09:30 AM</p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="h-2 w-2 rounded-full bg-green-500 mt-[5px] flex-shrink-0" />
            <div style={{ minWidth: 0 }}>
              <p className="font-medium text-sm">University Scholarship Request</p>
              <p className="text-sm text-muted-foreground">Request for Youth Doe submitted.</p>
              <p className="text-xs text-muted-foreground mt-0.5">2/8/2026 05:30 AM</p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="h-2 w-2 rounded-full bg-blue-500 mt-[5px] flex-shrink-0" />
            <div style={{ minWidth: 0 }}>
              <p className="font-medium text-sm">Profile Change Request</p>
              <p className="text-sm text-muted-foreground">Type: BASIC_PROFILE for Member MB-2023001</p>
              <p className="text-xs text-muted-foreground mt-0.5">2/8/2026 05:30 AM</p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="h-2 w-2 rounded-full bg-blue-500 mt-[5px] flex-shrink-0" />
            <div style={{ minWidth: 0 }}>
              <p className="font-medium text-sm">Profile Change Request</p>
              <p className="text-sm text-muted-foreground">Type: NOMINEE_CHANGE for Member MB-2023001</p>
              <p className="text-xs text-muted-foreground mt-0.5">2/7/2026 05:30 AM</p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="h-2 w-2 rounded-full bg-blue-500 mt-[5px] flex-shrink-0" />
            <div style={{ minWidth: 0 }}>
              <p className="font-medium text-sm">Application: New User One</p>
              <p className="text-sm text-muted-foreground">Submitted for Approval by District User</p>
              <p className="text-xs text-muted-foreground mt-0.5">2/5/2026 10:05 AM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Tasks */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="h-5 w-5 text-[#953002]" />
          <h2 className="text-lg font-semibold text-[#953002]">Pending Tasks</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Action items requiring your attention</p>

        <div className="space-y-3">
          <div className="flex justify-between items-center border rounded-xl p-3 gap-4">
            <div style={{ minWidth: 0 }}>
              <p className="font-medium text-sm">Review New Member Applications</p>
              <p className="text-sm text-muted-foreground">2 application(s) waiting for review.</p>
            </div>
            <Button size="sm" style={{ backgroundColor: '#953002', borderRadius: '8px', flexShrink: 0 }}>View</Button>
          </div>

          <div className="flex justify-between items-center border rounded-xl p-3 gap-4">
            <div style={{ minWidth: 0 }}>
              <p className="font-medium text-sm">Process Scholarship Requests</p>
              <p className="text-sm text-muted-foreground">2 request(s) need attention.</p>
            </div>
            <Button size="sm" style={{ backgroundColor: '#953002', borderRadius: '8px', flexShrink: 0 }}>View</Button>
          </div>

          <div className="flex justify-between items-center border rounded-xl p-3 gap-4">
            <div style={{ minWidth: 0 }}>
              <p className="font-medium text-sm">Review Termination Requests</p>
              <p className="text-sm text-muted-foreground">2 request(s) pending.</p>
            </div>
            <Button size="sm" style={{ backgroundColor: '#953002', borderRadius: '8px', flexShrink: 0 }}>View</Button>
          </div>

          <div className="flex justify-between items-center border rounded-xl p-3 gap-4">
            <div style={{ minWidth: 0 }}>
              <p className="font-medium text-sm">Death Donation Approvals</p>
              <p className="text-sm text-muted-foreground">3 request(s) awaiting approval.</p>
            </div>
            <Button size="sm" style={{ backgroundColor: '#953002', borderRadius: '8px', flexShrink: 0 }}>View</Button>
          </div>

          <div className="flex justify-between items-center border rounded-xl p-3 gap-4">
            <div style={{ minWidth: 0 }}>
              <p className="font-medium text-sm">Profile Change Requests</p>
              <p className="text-sm text-muted-foreground">2 request(s) pending update.</p>
            </div>
            <Button size="sm" style={{ backgroundColor: '#953002', borderRadius: '8px', flexShrink: 0 }}>View</Button>
          </div>
        </div>
      </div>

    </div>
  )
}
