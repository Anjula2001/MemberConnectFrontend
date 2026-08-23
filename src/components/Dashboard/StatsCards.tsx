"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { queuesForRole, type QueueDef } from "./queues"

/**
 * The top row: what this role has waiting on it.
 *
 * Replaces four fixed counters (Members / Scholarships / Terminations / Death
 * Donations) that were gated on REGISTRATION_ROLES and so rendered one card or none
 * for five of the nine roles. Every card here is a queue the signed-in role owns and
 * links to the screen that clears it - see queues.ts for the role mapping.
 *
 * Counts that fail to load render as an em dash rather than 0: a real zero means
 * "nothing waiting", and showing that when the request 403'd or timed out is worse
 * than admitting the number is unknown.
 */

type Counts = Record<string, number | null>

function QueueCard({
  queue,
  value,
  loading,
}: {
  queue: QueueDef
  value: number | null
  loading: boolean
}) {
  const isClear = value === 0

  return (
    <Link
      href={queue.href}
      className="group flex min-w-[220px] flex-1 flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors hover:border-[#953002]/40 hover:bg-[#fff9f6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#953002] dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-[#953002]">{queue.label}</p>
        <ArrowRight
          size={14}
          className="shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#953002]"
        />
      </div>

      <p
        className={
          "text-[32px] font-bold leading-none " +
          (loading
            ? "text-neutral-300"
            : isClear
              ? "text-neutral-400"
              : "text-neutral-900 dark:text-neutral-50")
        }
      >
        {loading ? "…" : (value ?? "—")}
      </p>

      <p className="text-[13px] text-neutral-500">
        {loading ? "Loading" : isClear ? "Nothing waiting" : queue.hint}
      </p>
    </Link>
  )
}

export default function StatsCards() {
  const { user } = useAuth()
  const role = user?.role

  // District Office sees its own district; every other role sees the institute.
  // getMembers()/getMemberApplications() had no scoping at all, so a Colombo clerk's
  // dashboard reported national totals - the opposite of MR02/MR13, where a District
  // Location defaults to its own location.
  const district = role === "DISTRICT_OFFICE" ? (user?.assignedDistrict ?? null) : null

  const queues = queuesForRole(role)
  const [counts, setCounts] = useState<Counts>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)

      // allSettled, not all: one denied or slow queue must not blank the whole row.
      const results = await Promise.allSettled(queues.map((q) => q.load({ district })))

      if (!mounted) return

      const next: Counts = {}
      queues.forEach((queue, index) => {
        const result = results[index]
        next[queue.id] = result.status === "fulfilled" ? result.value : null
      })

      setCounts(next)
      setLoading(false)
    }

    if (queues.length === 0) {
      setLoading(false)
      return
    }

    void load()
    return () => {
      mounted = false
    }
    // queues is derived from role, so role is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, district])

  if (queues.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-4">
      {queues.map((queue) => (
        <QueueCard
          key={queue.id}
          queue={queue}
          value={counts[queue.id] ?? null}
          loading={loading}
        />
      ))}
    </div>
  )
}
