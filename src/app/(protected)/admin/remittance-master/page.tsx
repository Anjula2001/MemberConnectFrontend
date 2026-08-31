"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, ShieldAlert, Info } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";

import {
  getRemittanceMaster,
  updateRemittanceAccount,
  type RemittanceMasterAccountDTO,
} from "@/lib/api/membershipConfig";
import { useToast } from "@/lib/toast-context";
import { useAuth } from "@/lib/auth-context";
import { REMITTANCE_MASTER_ROLES, hasRole } from "@/lib/permissions";

type Draft = {
  accountName: string;
  fixedAmount: string;
  minimumAmount: string;
  mandatory: boolean;
  active: boolean;
};

const toDraft = (a: RemittanceMasterAccountDTO): Draft => ({
  accountName: a.accountName ?? "",
  fixedAmount: a.fixedAmount != null ? String(a.fixedAmount) : "",
  minimumAmount: a.minimumAmount != null ? String(a.minimumAmount) : "",
  mandatory: a.mandatory ?? true,
  active: a.active ?? true,
});

export default function RemittanceMasterPage() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const canEdit = hasRole(user?.role, REMITTANCE_MASTER_ROLES);

  const [accounts, setAccounts] = useState<RemittanceMasterAccountDTO[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    if (!canEdit) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getRemittanceMaster()
      .then((data) => {
        if (cancelled) return;
        setAccounts(data);
        setDrafts(
          Object.fromEntries(data.filter((a) => a.id != null).map((a) => [a.id!, toDraft(a)]))
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          addToast(
            err instanceof Error ? err.message : "Failed to load the Remittance Master",
            "destructive"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  const setField = (id: number, key: keyof Draft, value: string | boolean) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  const handleSave = async (account: RemittanceMasterAccountDTO) => {
    if (account.id == null) return;
    const draft = drafts[account.id];
    if (!draft) return;

    // A fixed amount locks the field, so a minimum alongside it is contradictory.
    // The backend rejects this too — checked here so the user finds out immediately.
    if (draft.fixedAmount.trim() !== "" && draft.minimumAmount.trim() !== "") {
      addToast(
        "Set either a fixed amount or a minimum amount for an account, not both.",
        "destructive"
      );
      return;
    }

    setSavingId(account.id);
    try {
      const updated = await updateRemittanceAccount(account.id, {
        accountName: draft.accountName,
        fixedAmount: draft.fixedAmount.trim() === "" ? null : Number(draft.fixedAmount),
        minimumAmount:
          draft.minimumAmount.trim() === "" ? null : Number(draft.minimumAmount),
        mandatory: draft.mandatory,
        active: draft.active,
      });
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setDrafts((prev) => ({ ...prev, [updated.id!]: toDraft(updated) }));
      addToast(`${updated.accountName} saved.`);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to save account", "destructive");
    } finally {
      setSavingId(null);
    }
  };

  if (!canEdit) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-800">Access Restricted</h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500">
          The Remittance Master defines member contribution amounts and is maintained by
          the Accounts function.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6 md:pt-0">
      <div>
        <h1 className="text-3xl font-bold text-[#953002]">Remittance Master</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Contribution accounts collected on a New Member Registration.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Set a <strong>fixed amount</strong> to auto-fill and lock the field on the
          registration form, or a <strong>minimum amount</strong> to let the office enter
          any value at or above it. Leave both blank for free entry. An account can have
          one or the other, not both.
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => {
            const draft = drafts[account.id!];
            if (!draft) return null;
            const hasFixed = draft.fixedAmount.trim() !== "";
            const hasMinimum = draft.minimumAmount.trim() !== "";

            return (
              <Card key={account.id} className="rounded-xl shadow-sm">
                <CardHeader className="px-5 pt-5 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-[#953002]">
                    {account.accountName}
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-neutral-500">
                      {account.accountCode}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-600">
                        Display Name
                      </label>
                      <Input
                        value={draft.accountName}
                        onChange={(e) => setField(account.id!, "accountName", e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-600">
                        Fixed Amount
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="—"
                        value={draft.fixedAmount}
                        disabled={hasMinimum}
                        onChange={(e) => setField(account.id!, "fixedAmount", e.target.value)}
                      />
                      <span className="text-[11px] text-neutral-400">
                        {hasMinimum ? "Clear the minimum to use a fixed amount" : "Locks the field on the form"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-600">
                        Minimum Amount
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="—"
                        value={draft.minimumAmount}
                        disabled={hasFixed}
                        onChange={(e) =>
                          setField(account.id!, "minimumAmount", e.target.value)
                        }
                      />
                      <span className="text-[11px] text-neutral-400">
                        {hasFixed ? "Clear the fixed amount to use a minimum" : "Entered value must be at least this"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                        <Checkbox
                          checked={draft.mandatory}
                          onCheckedChange={(v) =>
                            setField(account.id!, "mandatory", v === true)
                          }
                          className="h-4 w-4 border-[#c6581f] data-[state=checked]:border-[#953002] data-[state=checked]:bg-[#953002]"
                        />
                        Mandatory on submit
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                        <Checkbox
                          checked={draft.active}
                          onCheckedChange={(v) => setField(account.id!, "active", v === true)}
                          className="h-4 w-4 border-[#c6581f] data-[state=checked]:border-[#953002] data-[state=checked]:bg-[#953002]"
                        />
                        Shown on registration form
                      </label>
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleSave(account)}
                      disabled={savingId === account.id}
                      className="bg-[#953002] text-white hover:bg-[#7a2700]"
                    >
                      {savingId === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
