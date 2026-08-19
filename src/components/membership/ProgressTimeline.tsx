"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { getApplicationHistory, getMemberHistory, type AuditDTO } from "@/lib/api/audit";

/**
 * Progress tab (spec 4.2 / 4.8): the history of everything that has happened to an
 * application or a membership, newest last, each entry showing what changed, when,
 * and who did it.
 */
export default function ProgressTimeline({
  memberId,
  applicationId,
}: {
  memberId?: number;
  applicationId?: number;
}) {
  const [entries, setEntries] = useState<AuditDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = memberId
      ? getMemberHistory(memberId)
      : applicationId
        ? getApplicationHistory(applicationId)
        : Promise.resolve([] as AuditDTO[]);

    load
      .then((d) => !cancelled && setEntries(d))
      .catch((e: unknown) =>
        !cancelled && setError(e instanceof Error ? e.message : "Failed to load history")
      )
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [memberId, applicationId]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error) {
    return <p className="py-6 text-center text-sm text-red-600">{error}</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
        <p className="text-sm text-neutral-500">
          No history recorded yet for this record.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <ol className="relative border-l border-neutral-200 pl-5">
        {entries.map((e) => {
          const when = e.actionAt
            ? new Date(e.actionAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—";
          // Only show a transition when both sides are known; a bare "-> X" is noise.
          const transition =
            e.oldValue && e.newValue
              ? `${e.oldValue.replace(/_/g, " ")} → ${e.newValue.replace(/_/g, " ")}`
              : e.newValue?.replace(/_/g, " ") ?? null;

          return (
            <li key={e.id} className="mb-5 last:mb-0">
              <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-[#9e3600]" />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-800">{e.actionName}</p>
                <p className="text-xs text-neutral-500">{when}</p>
              </div>
              {transition && (
                <p className="mt-0.5 text-sm text-neutral-600">{transition}</p>
              )}
              {e.remarks && <p className="mt-0.5 text-sm text-neutral-500">{e.remarks}</p>}
              <p className="mt-0.5 text-xs text-neutral-400">
                by {e.actionBy ?? "System"}
                {e.moduleName === "MEMBER_APPLICATION" ? " · application" : ""}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
