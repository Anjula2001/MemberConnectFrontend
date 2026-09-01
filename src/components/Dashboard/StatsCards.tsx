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

/**
 * A queue that never answers must not hold the whole row on "Loading".
 *
 * Every card resolves from one Promise.allSettled, so a single request that never
 * settles freezes all of them — not just its own. Most loaders go through apiClient,
 * which times out after 15s, but searchMemberDeathRecords and searchDeathDonationRequests
 * use fetch directly and have no timeout at all; between them they back three of Super
 * Admin's cards. This bounds every queue regardless of how it fetches, so a slow one
 * degrades to a single "—" instead of stalling the dashboard.
 */
function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Queue count timed out")), ms)
    ),
  ])
}

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
      /*
       * Below sm each card takes a full row (basis-full), so the 220px minimum can no
       * longer force the row wider than a phone screen. `grow` is used instead of
       * `flex-1` because the flex shorthand would reset flex-basis and undo basis-full.
       *
       * The minimum is 160px through the tablet band and 220px from lg up. At 768px the
       * sidebar is still pinned open and leaves this row 352px (measured), which fits two
       * 160px cards but only one at 220px. From lg the 220px floor is restored, so 1024px
       * and the desktop row (four across at 1440px) are exactly what they were.
       */
      className="group flex min-w-0 grow basis-full flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:border-[#953002]/40 hover:bg-[#fff9f6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#953002] sm:min-w-[160px] sm:basis-0 sm:p-5 lg:min-w-[220px] dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-[13px] font-medium text-[#953002]">{queue.label}</p>
        <ArrowRight
          size={14}
          className="shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#953002]"
        />
      </div>

      <p
        className={
          "text-[28px] font-bold leading-none sm:text-[32px] " +
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
      try {
        const results = await Promise.allSettled(
          queues.map((q) => withTimeout(q.load({ district })))
        )

        if (!mounted) return

        const next: Counts = {}
        queues.forEach((queue, index) => {
          const result = results[index]
          next[queue.id] = result.status === "fulfilled" ? result.value : null
        })

        setCounts(next)
      } finally {
        // Cleared here rather than after setCounts, so no unexpected throw can leave
        // the row spinning forever.
        if (mounted) setLoading(false)
      }
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
    <div className="flex flex-wrap gap-3 sm:gap-4">
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
