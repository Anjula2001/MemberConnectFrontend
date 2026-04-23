"use client";

import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
} from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";

export interface AddBankDetailsRef {
  submitBankForm: () => void;
}

interface Bank {
  bankId: string;
  name: string;
}

interface Branch {
  branchId: string;
  name: string;
}

interface SavedBankAccount {
  id: number;
  memberId: string;
  bankId: string;
  bankName: string;
  branchId: string;
  branchName: string;
  accountNumber: string;
}

interface AddBankDetailsProps {
  memberId: string;
  onSave: (savedAccount: SavedBankAccount) => void;
  onClose: () => void;
}

const AddBankDetails = forwardRef<AddBankDetailsRef, AddBankDetailsProps>(
  ({ memberId, onSave, onClose }, ref) => {
    /**
     * Local UI state
     */
    const [banks, setBanks] = useState<Bank[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBank, setSelectedBank] = useState("");
    const [selectedBranch, setSelectedBranch] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [loadingBanks, setLoadingBanks] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [saving, setSaving] = useState(false);

    const [bankError, setBankError] = useState("");
    const [branchError, setBranchError] = useState("");
    const [accountNumberError, setAccountNumberError] = useState("");
    const [generalError, setGeneralError] = useState("");

    /**
     * Fetch all banks from backend
     */
    useEffect(() => {
      const fetchBanks = async () => {
        try {
          setLoadingBanks(true);
          setGeneralError("");

          const res = await fetch("http://localhost:8080/api/banks");

          if (!res.ok) {
            throw new Error("Failed to load banks");
          }

          const data = await res.json();
          setBanks(data);
        } catch (error) {
          console.error("Error fetching banks:", error);
          setGeneralError("Unable to load banks");
        } finally {
          setLoadingBanks(false);
        }
      };

      fetchBanks();
    }, []);

    /**
     * Fetch branches when bank changes
     */
    useEffect(() => {
      if (!selectedBank) {
        setBranches([]);
        setSelectedBranch("");
        return;
      }

      const fetchBranches = async () => {
        try {
          setLoadingBranches(true);
          setGeneralError("");
          setSelectedBranch("");

          const res = await fetch(
            `http://localhost:8080/api/banks/${selectedBank}/branches`
          );

          if (!res.ok) {
            throw new Error("Failed to load branches");
          }

          const data = await res.json();
          setBranches(data);
        } catch (error) {
          console.error("Error fetching branches:", error);
          setBranches([]);
          setGeneralError("Unable to load branches");
        } finally {
          setLoadingBranches(false);
        }
      };

      fetchBranches();
    }, [selectedBank]);

    /**
     * Simple frontend validation
     */
    const validateForm = () => {
      let isValid = true;

      setBankError("");
      setBranchError("");
      setAccountNumberError("");
      setGeneralError("");

      if (!selectedBank) {
        setBankError("Bank is required");
        isValid = false;
      }

      if (!selectedBranch) {
        setBranchError("Branch is required");
        isValid = false;
      }

      if (!accountNumber.trim()) {
        setAccountNumberError("Account number is required");
        isValid = false;
      }

      return isValid;
    };

    /**
     * Save bank account
     */
    const submitBankForm = async () => {
      const isValid = validateForm();
      if (!isValid) return;

      try {
        setSaving(true);
        setGeneralError("");

        const res = await fetch(
          `http://localhost:8080/api/members/${memberId}/bank-accounts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              bankId: selectedBank,
              branchId: selectedBranch,
              accountNumber: accountNumber,
            }),
          }
        );

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to save bank account");
        }

        const savedData: SavedBankAccount = await res.json();
        onSave(savedData);
      } catch (error) {
        console.error("Save error:", error);
        setGeneralError("Failed to save bank account");
      } finally {
        setSaving(false);
      }
    };

    /**
     * Expose submit function to parent component
     */
    useImperativeHandle(ref, () => ({
      submitBankForm,
    }));

    return (
      <form className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {/* Bank */}
          <div>
            <label className="block font-medium mb-1">Bank</label>
            <select
              value={selectedBank}
              onChange={(e) => {
                setSelectedBank(e.target.value);
                setBankError("");
                setBranchError("");
              }}
              className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
              disabled={loadingBanks}
            >
              <option value="">
                {loadingBanks ? "Loading banks..." : "Select bank"}
              </option>
              {banks.map((bank) => (
                <option key={bank.bankId} value={bank.bankId}>
                  {bank.name}
                </option>
              ))}
            </select>
            {bankError && (
              <p className="text-red-500 text-sm mt-1">{bankError}</p>
            )}
          </div>

          {/* Branch */}
          <div>
            <label className="block font-medium mb-1">Branch</label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setBranchError("");
              }}
              className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
              disabled={!selectedBank || loadingBranches}
            >
              <option value="">
                {!selectedBank
                  ? "Select bank first"
                  : loadingBranches
                  ? "Loading branches..."
                  : "Select branch"}
              </option>
              {branches.map((branch) => (
                <option key={branch.branchId} value={branch.branchId}>
                  {branch.name}
                </option>
              ))}
            </select>
            {branchError && (
              <p className="text-red-500 text-sm mt-1">{branchError}</p>
            )}
          </div>

          {/* Account Number */}
          <div>
            <label className="block font-medium mb-1">Account Number</label>
            <Input
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value);
                setAccountNumberError("");
              }}
              placeholder="Enter account number"
            />
            {accountNumberError && (
              <p className="text-red-500 text-sm mt-1">
                {accountNumberError}
              </p>
            )}
          </div>

          {/* General Error */}
          {generalError && (
            <p className="text-red-500 text-sm">{generalError}</p>
          )}

          {/* Buttons */}
          <div className="flex justify-center gap-8 pt-4">
            <Button
              type="button"
              onClick={submitBankForm}
              className="bg-[#953002] text-white hover:bg-[#672102] min-w-[120px]"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>

            <Button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-black hover:bg-gray-300 min-w-[120px]"
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    );
  }
);

AddBankDetails.displayName = "AddBankDetails";

export default AddBankDetails;