"use client";

import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Shown in place of a page the current role may not open.
 *
 * Extracted so the Grade 5 pages do not each carry their own copy of this markup —
 * the Member Registration module inlines it per page, which is why its wording has
 * already drifted between screens.
 *
 * This is a courtesy, not a control: the page is merely not rendered. Every action
 * behind it is independently refused by the backend, which is what actually enforces
 * the matrix.
 */
export default function AccessRestricted({
  message,
  fallbackHref = "/",
  fallbackLabel = "Back to Dashboard",
}: {
  message: string;
  fallbackHref?: string;
  fallbackLabel?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 shadow-sm">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-neutral-800">Access Restricted</h2>
      <p className="mt-2 max-w-md text-sm text-neutral-500">{message}</p>
      <button
        onClick={() => router.push(fallbackHref)}
        className="mt-6 flex items-center gap-2 rounded-lg bg-[#953002] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#b33f00]"
      >
        {fallbackLabel}
      </button>
    </div>
  );
}
