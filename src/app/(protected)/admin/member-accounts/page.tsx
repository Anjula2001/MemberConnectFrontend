"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, Info, Loader2, Lock, Save, Search } from "lucide-react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";

import { searchMembers, type MemberDTO } from "@/lib/api/member";
import {
  getMemberFinancials,
  updateMemberFinancials,
  type MemberAccountDTO,
  type MemberFinancialsDTO,
  type MemberRemittanceDTO,
} from "@/lib/api/memberFinancials";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { REMITTANCE_MASTER_ROLES, hasRole } from "@/lib/permissions";

/**
 * Manual entry for a member's Remittance & Savings data, pending the Finance
 * Module.
 *
 * Member-scoped rather than a flat table of everyone: entering account numbers is
 * inherently a per-member task. The member profile links straight in here with
 * ?memberId=, so both routes land on the same screen.
 */
export default function MemberAccountsAdminPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const canEdit = hasRole(user?.role, REMITTANCE_MASTER_ROLES);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberDTO[]>([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<MemberDTO | null>(null);
  const [financials, setFinancials] = useState<MemberFinancialsDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadFinancials = useCallback(async (memberId: number) => {
    setLoading(true);
    try {
      setFinancials(await getMemberFinancials(memberId));
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Failed to load member financials",
        "destructive"
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Deep link from the member profile's Remittance & Savings tab.
  useEffect(() => {
    const id = Number(searchParams.get("memberId"));
    if (!Number.isFinite(id) || id <= 0) return;
    searchMembers({ query: undefined })
      .then((all) => {
        const match = all.find((m) => m.id === id);
        if (match) {
          setSelected(match);
          void loadFinancials(id);
        }
      })
      .catch(() => {
        /* fall back to manual search */
      });
  }, [searchParams, loadFinancials]);

  const runSearch = async () => {
    setSearching(true);
    try {
      setResults(await searchMembers({ query: query.trim() || undefined }));
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Search failed",
        "destructive"
      );
    } finally {
      setSearching(false);
    }
  };

  const pick = async (m: MemberDTO) => {
    setSelected(m);
    setResults([]);
    if (m.id) await loadFinancials(m.id);
  };

  const setRemittance = (i: number, patch: Partial<MemberRemittanceDTO>) =>
    setFinancials((f) =>
      f
        ? { ...f, remittances: f.remittances?.map((r, x) => (x === i ? { ...r, ...patch } : r)) }
        : f
    );

  const setAccount = (i: number, patch: Partial<MemberAccountDTO>) =>
    setFinancials((f) =>
      f ? { ...f, accounts: f.accounts?.map((a, x) => (x === i ? { ...a, ...patch } : a)) } : f
    );

  const save = async () => {
    if (!selected?.id || !financials) return;
    setSaving(true);
    try {
      setFinancials(await updateMemberFinancials(selected.id, financials));
      addToast("Remittance and account details saved.");
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Failed to save",
        "destructive"
      );
    } finally {
      setSaving(false);
    }
  };

  if (user && !canEdit) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-800">Access Restricted</h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500">
          Member remittance and account entry is restricted to Accounts and Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4 md:p-6">
      <div className="max-w-5xl space-y-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-[#9f3b07]">
            Member Remittance &amp; Accounts
          </h1>
          <p className="text-sm text-muted-foreground">
            Record a member&apos;s monthly remittance and their operative account details.
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-900">
            Operative account numbers and balances normally come from the Finance
            Module. Until that integration exists they are entered here by hand and
            marked <span className="font-semibold">Manual</span>; a later Finance sync
            will overwrite them and mark them <span className="font-semibold">Synced</span>.
          </p>
        </div>

        {/* Member picker */}
        <Card className="rounded-xl py-0">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-base text-[#953002]">Select Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            <div className="flex items-end gap-2">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="Member name, NIC or Membership ID"
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                onClick={runSearch}
                disabled={searching}
                className="h-9 bg-[#9e3600] text-white hover:bg-[#8b2f00]"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>

            {results.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-md border border-neutral-200">
                {results.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => pick(m)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  >
                    <span className="font-medium text-neutral-800">
                      {m.memberId} — {m.nameWithInitials || m.fullName}
                    </span>
                    <span className="text-xs text-neutral-500">{m.nic}</span>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className="flex items-center gap-2 rounded-md bg-neutral-50 px-3 py-2 text-sm">
                <Building2 className="h-4 w-4 text-neutral-400" />
                <span className="font-semibold text-neutral-800">{selected.memberId}</span>
                <span className="text-neutral-600">
                  {selected.nameWithInitials || selected.fullName}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {loading && (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        )}

        {!loading && financials && (
          <>
            {/* Current Remittance Details */}
            <Card className="rounded-xl py-0">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-base text-[#953002]">
                  Current Remittance Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Monthly Amount</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead>Rule</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financials.remittances?.map((r, i) => (
                      <TableRow key={r.accountCode}>
                        <TableCell className="font-medium">{r.accountName}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={r.amount ?? ""}
                            // A fixed amount is set by the master, so it is not editable here.
                            disabled={r.fixedAmount != null}
                            onChange={(e) =>
                              setRemittance(i, {
                                amount: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                            className="h-8 w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={r.effectiveFrom ?? ""}
                            onChange={(e) =>
                              setRemittance(i, { effectiveFrom: e.target.value || null })
                            }
                            className="h-8 w-40"
                          />
                        </TableCell>
                        <TableCell className="text-xs text-neutral-500">
                          {r.fixedAmount != null
                            ? `Fixed at ${r.fixedAmount}`
                            : r.minimumAmount != null
                              ? `Minimum ${r.minimumAmount}`
                              : "Free entry"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Operative Accounts */}
            <Card className="rounded-xl py-0">
              <CardHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-3">
                <CardTitle className="text-base text-[#953002]">Operative Accounts</CardTitle>
                {financials.awaitingFinanceIntegration && (
                  <Badge className="border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-50">
                    Awaiting Finance Module
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Opened</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financials.accounts?.map((a, i) => (
                      <TableRow key={a.accountCode}>
                        <TableCell className="font-medium">{a.accountName}</TableCell>
                        <TableCell>
                          <Input
                            value={a.accountNumber ?? ""}
                            onChange={(e) =>
                              setAccount(i, { accountNumber: e.target.value || null })
                            }
                            placeholder="Not created"
                            className="h-8 w-44"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={a.balance ?? ""}
                            onChange={(e) =>
                              setAccount(i, {
                                balance: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                            className="h-8 w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={a.openedDate ?? ""}
                            onChange={(e) => setAccount(i, { openedDate: e.target.value || null })}
                            className="h-8 w-40"
                          />
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={save}
                disabled={saving}
                className="bg-[#9e3600] text-white hover:bg-[#8b2f00]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
