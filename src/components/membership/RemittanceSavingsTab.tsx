"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Info, Loader2, Pencil } from "lucide-react";

import { Badge } from "@/src/components/ui/badge";
import {
  getMemberFinancials,
  type MemberFinancialsDTO,
} from "@/lib/api/memberFinancials";
import { useAuth } from "@/lib/auth-context";
import { REMITTANCE_MASTER_ROLES, hasRole } from "@/lib/permissions";

const money = (v?: number | null) =>
  v === null || v === undefined ? "—" : v.toLocaleString("en-GB", { minimumFractionDigits: 2 });

/**
 * Remittance & Savings tab (spec 4.8): the member's current remittance setup and
 * their operative accounts.
 *
 * Operative account data belongs to the Finance Module, which is outside this
 * project — until it is connected the values shown here are hand-entered, and are
 * labelled as such rather than presented as authoritative balances.
 */
export default function RemittanceSavingsTab({ memberId }: { memberId: number }) {
  const { user } = useAuth();
  const canEdit = hasRole(user?.role, REMITTANCE_MASTER_ROLES);

  const [data, setData] = useState<MemberFinancialsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMemberFinancials(memberId)
      .then((d) => !cancelled && setData(d))
      .catch((e: unknown) =>
        !cancelled && setError(e instanceof Error ? e.message : "Failed to load")
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    );
  }
  if (error || !data) {
    return <p className="py-6 text-center text-sm text-red-600">{error ?? "No data."}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#b2410f]">Current Remittance Details</p>
        {canEdit && (
          <Link
            href={`/admin/member-accounts?memberId=${memberId}`}
            className="flex items-center gap-1 text-xs font-medium text-[#9e3600] hover:underline"
          >
            <Pencil className="h-3 w-3" /> Edit
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-semibold">Account</th>
              <th className="px-4 py-2 font-semibold">Monthly Amount</th>
              <th className="px-4 py-2 font-semibold">Effective From</th>
            </tr>
          </thead>
          <tbody>
            {data.remittances?.map((r) => (
              <tr key={r.accountCode} className="border-t border-neutral-100">
                <td className="px-4 py-2 text-neutral-800">{r.accountName}</td>
                <td className="px-4 py-2 font-medium text-neutral-900">{money(r.amount)}</td>
                <td className="px-4 py-2 text-neutral-600">{r.effectiveFrom ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#b2410f]">Operative Accounts</p>
        {data.awaitingFinanceIntegration && (
          <Badge className="border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-50">
            Awaiting Finance Module
          </Badge>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-semibold">Account</th>
              <th className="px-4 py-2 font-semibold">Account Number</th>
              <th className="px-4 py-2 font-semibold">Balance</th>
              <th className="px-4 py-2 font-semibold">Source</th>
            </tr>
          </thead>
          <tbody>
            {data.accounts?.map((a) => (
              <tr key={a.accountCode} className="border-t border-neutral-100">
                <td className="px-4 py-2 text-neutral-800">{a.accountName}</td>
                <td className="px-4 py-2 text-neutral-900">
                  {a.accountNumber ?? (
                    <span className="text-neutral-400">Not yet created</span>
                  )}
                </td>
                <td className="px-4 py-2 font-medium text-neutral-900">{money(a.balance)}</td>
                <td className="px-4 py-2">
                  {a.source === "FINANCE" ? (
                    <Badge className="border border-green-300 bg-green-100 text-green-700 hover:bg-green-100">
                      Synced
                    </Badge>
                  ) : a.source === "MANUAL" ? (
                    <Badge className="border border-neutral-300 bg-neutral-100 text-neutral-600 hover:bg-neutral-100">
                      Manual
                    </Badge>
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
        <p className="text-xs text-neutral-600">
          Account numbers and balances are owned by the Finance Module. Until that
          integration is in place these are recorded manually and are not live balances.
        </p>
      </div>
    </div>
  );
}
