"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import RetirementForm, {
  RetirementFormRef,
} from "../../../components/ui/retirement/retirementform";
import DocumentUpload from "../../../components/ui/grade5schoolarship/documentupload";
import { MarkIncompleteModal } from "../../../components/ui/grade5schoolarship/MarkIncomplete";
import AddBankDetails, {
  AddBankDetailsRef,
} from "../../../components/ui/retirement/addbankdetails";

interface BankAccountRow {
  id: number;
  memberId: string;
  bankId: string;
  bankName: string;
  branchId: string;
  branchName: string;
  accountNumber: string;
}

interface MinorSavingsAccount {
  minorAccountNo: string;
  memberId: string;
  holderName: string;
  balance: number;
}

interface RetirementValidation {
  hasOutstandingLoans: boolean;
  hasLoanObligations: boolean;
  totalOutstandingLoanBalance: number;
  canSubmit: boolean;
  message: string;
}

const API_BASE_URL = "http://localhost:8080";

export default function RetirementPage() {
  const formRef = useRef<RetirementFormRef>(null);
  const bankFormRef = useRef<AddBankDetailsRef>(null);

  const [openModal, setOpenModal] = useState(false);
  const [openBankModal, setOpenBankModal] = useState(false);

  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [minorSavingsAccounts, setMinorSavingsAccounts] = useState<
    MinorSavingsAccount[]
  >([]);

  const [minorSavingsError, setMinorSavingsError] = useState("");
  const [member, setMember] = useState({
    memberId: "",
    fullName: "",
  });

  const [validation, setValidation] = useState<RetirementValidation | null>(null);

  const memberId = "MEM001";

  useEffect(() => {
    fetchMemberBankAccounts();
    fetchMinorSavingsAccounts();
    fetchMember();
    fetchRetirementValidation();
  }, []);

  const fetchMember = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/members/${memberId}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch member");
      }

      const data = await res.json();
      setMember({
        memberId: data.memberId,
        fullName: data.fullName,
      });
    } catch (error) {
      console.error("Fetch member error:", error);
    }
  };

  const fetchRetirementValidation = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/members/${memberId}/retirement-validation`
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const data = await res.json();
      setValidation(data);
    } catch (error) {
      console.error("Retirement validation error:", error);
    }
  };

  const fetchMinorSavingsAccounts = async () => {
    try {
      const url = `${API_BASE_URL}/api/members/${memberId}/minor-savings-accounts`;

      const res = await fetch(url, {
        method: "GET",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      setMinorSavingsAccounts(data);
    } catch (error) {
      console.error("Fetch minor savings accounts error:", error);
    }
  };

  const fetchMemberBankAccounts = async () => {
    try {
      const url = `${API_BASE_URL}/api/members/${memberId}/bank-accounts`;

      const res = await fetch(url, {
        method: "GET",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      setBankAccounts(data);
    } catch (error) {
      console.error("Fetch member bank accounts error:", error);
    }
  };

  const handleAddAccountClick = () => {
    if (minorSavingsAccounts.length === 0) {
      setMinorSavingsError(
        "No need to add disbursement details because member has no minor saving accounts."
      );
      return;
    }
     if (bankAccounts.length > 0) {
    setMinorSavingsError(
      "Disbursement bank details already added."
    );
    return;
  }

    setMinorSavingsError("");
    setOpenBankModal(true);
  };

  const handleConfirm = (reason: string) => {
    if (!reason.trim()) return;

    setOpenModal(false);
    console.log("Marked as Incomplete:", reason);
  };

  const handleSave = async () => {
    const formData = await formRef.current?.validateAndGetData();

    if (!formData) return;

    console.log("Save data:", formData);
  };

  const handleSubmitForm = async () => {
    const formData = await formRef.current?.validateAndGetData();

    if (!formData) return;

    console.log("Submit data:", formData);
  };

  const handleBankSave = (savedAccount: BankAccountRow) => {
    setBankAccounts((prev) => [...prev, savedAccount]);
    setOpenBankModal(false);
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-[#953002]">
                Retirement Request
              </p>

              <div className="mt-2 inline-block bg-gray-100 px-3 py-1 rounded-md text-sm text-gray-700">
                Member: {member.fullName} ({member.memberId})
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                className="bg-white text-black hover:bg-gray-100"
              >
                Save
              </Button>

              <Button
                onClick={() => setOpenModal(true)}
                className="bg-[#D4183D] text-white hover:bg-[#b31533]"
              >
                Mark Incomplete
              </Button>

              <Button
                onClick={handleSubmitForm}
                disabled={validation ? !validation.canSubmit : true}
                className="bg-[#953002] text-white hover:bg-[#672102] disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Submit for Approval
              </Button>
            </div>
          </div>
          {validation && !validation.canSubmit && (
            <div className="bg-white rounded-lg shadow-sm p-4 mt-4 border border-red-200">
              <p className="text-pink-500 font-semibold">
                Cannot Submit Request
              </p>

              {validation.hasOutstandingLoans && (
                <p className="text-pink-500 text-sm">
                  • Member has outstanding loan balance: LKR{" "}
                  {validation.totalOutstandingLoanBalance}
                </p>
              )}

              {validation.hasLoanObligations && (
                <p className="text-pink-500 text-sm">
                  • Member has indirect loan obligations
                </p>
              )}
            </div>
          )}

          <div className="flex gap-6 mt-6">
            <div className="flex-1 flex flex-col gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <RetirementForm ref={formRef} />
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xl font-bold text-[#953002]">
                    Minor Saving Disbursement
                  </p>

                  <Button
                    className={
                      minorSavingsAccounts.length === 0
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-gray-50 text-black hover:bg-gray-100"
                    }
                    onClick={handleAddAccountClick}
                  >
                    +Account
                  </Button>
                </div>

                {minorSavingsError && (
                  <p className="text-red-500 text-sm mb-3">
                    {minorSavingsError}
                  </p>
                )}

                {minorSavingsAccounts.length === 0 ? (
                  <p className="text-gray-600">
                    Member has no minor saving account
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto mb-6">
                      <p className="font-semibold mb-2">
                        Minor Saving Accounts
                      </p>

                      <table className="w-full border border-gray-200 rounded-lg">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left px-4 py-2 border-b">
                              Minor Account No
                            </th>
                            <th className="text-left px-4 py-2 border-b">
                              Holder Name
                            </th>
                            <th className="text-left px-4 py-2 border-b">
                              Balance
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {minorSavingsAccounts.map((account) => (
                            <tr key={account.minorAccountNo}>
                              <td className="px-4 py-2 border-b">
                                {account.minorAccountNo}
                              </td>
                              <td className="px-4 py-2 border-b">
                                {account.holderName}
                              </td>
                              <td className="px-4 py-2 border-b">
                                {account.balance}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {bankAccounts.length === 0 ? (
                      <p className="text-gray-600">
                        No disbursement bank details added
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <p className="font-semibold mb-2">
                          Disbursement Bank Details
                        </p>

                        <table className="w-full border border-gray-200 rounded-lg">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left px-4 py-2 border-b">
                                Bank
                              </th>
                              <th className="text-left px-4 py-2 border-b">
                                Branch
                              </th>
                              <th className="text-left px-4 py-2 border-b">
                                Account Number
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {bankAccounts.map((account) => (
                              <tr key={account.id}>
                                <td className="px-4 py-2 border-b">
                                  {account.bankName}
                                </td>
                                <td className="px-4 py-2 border-b">
                                  {account.branchName}
                                </td>
                                <td className="px-4 py-2 border-b">
                                  {account.accountNumber}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <DocumentUpload />
              </div>
            </div>
          </div>
        </div>
      </div>

      <MarkIncompleteModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onConfirm={handleConfirm}
      />

      {openBankModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold text-[#953002] mb-4">
              Add Disbursement Bank Details
            </h2>

            <AddBankDetails
              ref={bankFormRef}
              memberId={memberId}
              onSave={handleBankSave}
              onClose={() => setOpenBankModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}