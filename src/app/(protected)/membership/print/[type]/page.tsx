"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";

import { getMemberById, type MemberDTO } from "@/lib/api/member";
import { useAuth } from "@/lib/auth-context";
import { CARD_PRINTING_ROLES, hasRole } from "@/lib/permissions";
import MembershipCardTemplate from "@/src/components/membership/print-templates/MembershipCardTemplate";
import SignatureCardTemplate from "@/src/components/membership/print-templates/SignatureCardTemplate";
import PassbookTemplate, {
  DEFAULT_PASSBOOK_OFFSET,
  type PassbookOffset,
} from "@/src/components/membership/print-templates/PassbookTemplate";

type PrintType = "membership-card" | "signature-card" | "passbook";

const TITLES: Record<PrintType, string> = {
  "membership-card": "Membership Cards",
  "signature-card": "Signature Cards",
  passbook: "Passbooks",
};

/** Persisted so the alignment only has to be dialled in once per installation. */
const OFFSET_KEY = "ffi.passbook.offset";

/**
 * Batch print sheet for the membership documentation (MR15-17).
 *
 * Renders one template per selected member at true physical size, then hands off
 * to the browser's print dialog — consistent with the spec's assumption that
 * printing is a template view rather than a device integration.
 */
export default function MembershipDocumentPrintPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = use(params);
  const printType = type as PrintType;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const ids = useMemo(
    () =>
      (searchParams.get("ids") ?? "")
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0),
    [searchParams]
  );

  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [offset, setOffset] = useState<PassbookOffset>(DEFAULT_PASSBOOK_OFFSET);
  const [showStockGuide, setShowStockGuide] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(OFFSET_KEY);
      if (stored) setOffset(JSON.parse(stored));
    } catch {
      /* keep defaults */
    }
  }, []);

  const updateOffset = (next: PassbookOffset) => {
    setOffset(next);
    try {
      localStorage.setItem(OFFSET_KEY, JSON.stringify(next));
    } catch {
      /* non-fatal */
    }
  };

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all(ids.map((id) => getMemberById(id)))
      .then((data) => !cancelled && setMembers(data))
      .catch((e: unknown) =>
        !cancelled && setError(e instanceof Error ? e.message : "Failed to load members")
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (user && !hasRole(user.role, CARD_PRINTING_ROLES)) {
    return (
      <div className="p-10 text-center text-sm text-neutral-500">
        You do not have permission to print membership documentation.
      </div>
    );
  }

  if (!TITLES[printType]) {
    return <div className="p-10 text-center text-sm text-red-600">Unknown document type.</div>;
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error) {
    return <div className="p-10 text-center text-sm text-red-600">{error}</div>;
  }

  if (members.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-neutral-500">
        No members selected for printing.
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 8mm; }
          body { background: #fff !important; }
          .no-print, nav, aside, header, [data-sidebar] { display: none !important; }
          /* The stock ghost is an on-screen alignment aid; it must never print. */
          .stock-guide { display: none !important; }
          .print-item { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; outline: none !important; }
          .print-sheet { gap: 6mm !important; padding: 0 !important; }
        }
      `}</style>

      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 px-4 pt-4 md:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-neutral-600 hover:text-[#9d3602]"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {printType === "passbook" && (
            <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-1.5">
              <span className="text-xs font-medium text-neutral-600">Alignment (mm)</span>
              {(["x", "y"] as const).map((axis) => (
                <label key={axis} className="flex items-center gap-1 text-xs text-neutral-600">
                  {axis.toUpperCase()}
                  <input
                    type="number"
                    step="0.5"
                    value={offset[axis]}
                    onChange={(e) =>
                      updateOffset({ ...offset, [axis]: Number(e.target.value) || 0 })
                    }
                    className="h-7 w-16 rounded border border-neutral-300 px-1.5 text-xs"
                  />
                </label>
              ))}
              <label className="flex items-center gap-1 text-xs text-neutral-600">
                <input
                  type="checkbox"
                  checked={showStockGuide}
                  onChange={(e) => setShowStockGuide(e.target.checked)}
                />
                Show stock
              </label>
            </div>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-[#9e3600] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8b2f00]"
          >
            <Printer className="h-4 w-4" /> Print {members.length}{" "}
            {TITLES[printType].toLowerCase()}
          </button>
        </div>
      </div>

      {printType === "passbook" && (
        <p className="no-print mx-4 mb-3 max-w-3xl text-xs text-neutral-500 md:mx-6">
          Only the dark text is printed — the greyed-out institute name and labels are
          already on the pre-printed stock and are hidden when printing. Run one test
          page, then nudge X/Y until the values sit on the stock&apos;s lines; the setting is
          remembered.
        </p>
      )}

      <div className="print-sheet flex flex-col items-center gap-6 px-4 pb-10 md:px-6">
        {members.map((m) => (
          <div key={m.id} className="print-item outline outline-1 outline-neutral-200">
            {printType === "membership-card" && <MembershipCardTemplate member={m} />}
            {printType === "signature-card" && <SignatureCardTemplate member={m} />}
            {printType === "passbook" && (
              <PassbookTemplate member={m} offset={offset} showStockGuide={showStockGuide} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}
