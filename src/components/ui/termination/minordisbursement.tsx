"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

const API_BASE_URL = "http://localhost:8080";

export interface MinorDisbursementData {
  minorAccountNo: string;
  disbursementBankId: string;
  disbursementBranchId: string;
  disbursementAccountNo: string;
}

export interface MinorDisbursementSectionRef {
  getData: () => MinorDisbursementData[];
}

export interface MinorSavingsAccountInfo {
  minorAccountNo: string;
  holderName: string;
}

// Shape returned by the backend for a previously-saved termination request.
// Bank/branch are stored as resolved names only (no id), so the id has to be
// re-derived on the client by matching against the loaded bank/branch lists.
export interface SavedMinorDisbursement {
  minorAccountNo: string;
  disbursementBankName?: string | null;
  disbursementBranchName?: string | null;
  disbursementAccountNo?: string | null;
}

interface Bank {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface RawMasterDataItem {
  id: string | number;
  name: string;
}

interface Props {
  accounts: MinorSavingsAccountInfo[];
  initialData?: SavedMinorDisbursement[];
  readOnly?: boolean;
}

const emptyRow = (minorAccountNo: string): MinorDisbursementData => ({
  minorAccountNo,
  disbursementBankId: "",
  disbursementBranchId: "",
  disbursementAccountNo: "",
});

const MinorDisbursementSection = forwardRef<MinorDisbursementSectionRef, Props>(
  ({ accounts, initialData, readOnly = false }, ref) => {
    const [banks, setBanks] = useState<Bank[]>([]);
    const [rows, setRows] = useState<Record<string, MinorDisbursementData>>({});
    const [branchesByAccount, setBranchesByAccount] = useState<Record<string, Branch[]>>({});

    // Load the bank list once.
    useEffect(() => {
      const fetchBanks = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/banks`);
          if (!response.ok) return;

          const rawBanks: RawMasterDataItem[] = await response.json();
          setBanks(rawBanks.map((b) => ({ id: String(b.id), name: b.name })));
        } catch (error) {
          console.error("Failed to fetch banks:", error);
        }
      };

      fetchBanks();
    }, []);

    const fetchBranches = async (minorAccountNo: string, bankId: string) => {
      if (!bankId) {
        setBranchesByAccount((prev) => ({ ...prev, [minorAccountNo]: [] }));
        return [] as Branch[];
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/branches/${bankId}`);
        if (!response.ok) return [] as Branch[];

        const rawBranches: RawMasterDataItem[] = await response.json();
        const branchList: Branch[] = rawBranches.map((b) => ({
          id: String(b.id),
          name: b.name,
        }));

        setBranchesByAccount((prev) => ({ ...prev, [minorAccountNo]: branchList }));
        return branchList;
      } catch (error) {
        console.error("Failed to fetch branches:", error);
        return [] as Branch[];
      }
    };

    // Rebuild the row state whenever the minor-account list, saved data, or the
    // bank list changes. Saved bank/branch names are reconciled back to ids by
    // matching against the loaded master-data lists, since only names are stored.
    useEffect(() => {
      let cancelled = false;

      const buildRows = async () => {
        const nextRows: Record<string, MinorDisbursementData> = {};

        for (const account of accounts) {
          const saved = initialData?.find(
            (item) => item.minorAccountNo === account.minorAccountNo
          );

          if (!saved) {
            nextRows[account.minorAccountNo] = emptyRow(account.minorAccountNo);
            continue;
          }

          const matchedBank = saved.disbursementBankName
            ? banks.find((bank) => bank.name === saved.disbursementBankName)
            : undefined;

          let matchedBranchId = "";

          if (matchedBank && saved.disbursementBranchName) {
            const branchList = await fetchBranches(account.minorAccountNo, matchedBank.id);
            const matchedBranch = branchList.find(
              (branch) => branch.name === saved.disbursementBranchName
            );
            matchedBranchId = matchedBranch?.id || "";
          }

          nextRows[account.minorAccountNo] = {
            minorAccountNo: account.minorAccountNo,
            disbursementBankId: matchedBank?.id || "",
            disbursementBranchId: matchedBranchId,
            disbursementAccountNo: saved.disbursementAccountNo || "",
          };
        }

        if (!cancelled) {
          setRows(nextRows);
        }
      };

      buildRows();

      return () => {
        cancelled = true;
      };
    }, [accounts, initialData, banks]);

    useImperativeHandle(ref, () => ({
      getData: () => Object.values(rows),
    }));

    const updateRow = (minorAccountNo: string, patch: Partial<MinorDisbursementData>) => {
      setRows((prev) => ({
        ...prev,
        [minorAccountNo]: {
          ...(prev[minorAccountNo] || emptyRow(minorAccountNo)),
          ...patch,
        },
      }));
    };

    if (accounts.length === 0) {
      return <p className="text-gray-600">Member has no minor saving account</p>;
    }

    return (
      <div className="space-y-4">
        {accounts.map((account) => {
          const row = rows[account.minorAccountNo] || emptyRow(account.minorAccountNo);
          const branches = branchesByAccount[account.minorAccountNo] || [];

          return (
            <div
              key={account.minorAccountNo}
              className="rounded-lg border border-gray-200 p-4"
            >
              <p className="mb-3 font-semibold">
                Minor Account {account.minorAccountNo}
                <span className="ml-2 font-normal text-gray-600">
                  — {account.holderName}
                </span>
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Disbursement Bank
                  </label>

                  <select
                    value={row.disbursementBankId}
                    disabled={readOnly}
                    onChange={async (e) => {
                      const bankId = e.target.value;
                      updateRow(account.minorAccountNo, {
                        disbursementBankId: bankId,
                        disbursementBranchId: "",
                      });
                      await fetchBranches(account.minorAccountNo, bankId);
                    }}
                    className="w-full rounded-md border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    <option value="">Select bank</option>
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Branch</label>

                  <select
                    value={row.disbursementBranchId}
                    disabled={readOnly || !row.disbursementBankId}
                    onChange={(e) =>
                      updateRow(account.minorAccountNo, {
                        disbursementBranchId: e.target.value,
                      })
                    }
                    className="w-full rounded-md border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    <option value="">
                      {row.disbursementBankId ? "Select branch" : "Select bank first"}
                    </option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Disbursement Account Number
                  </label>

                  <input
                    type="text"
                    value={row.disbursementAccountNo}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateRow(account.minorAccountNo, {
                        disbursementAccountNo: e.target.value,
                      })
                    }
                    className="w-full rounded-md border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);

MinorDisbursementSection.displayName = "MinorDisbursementSection";

export default MinorDisbursementSection;
