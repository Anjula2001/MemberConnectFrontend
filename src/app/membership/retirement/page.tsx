"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import RetirementForm, {
  RetirementFormRef,
} from "../../../components/ui/retirement/retirementform";
import DocumentUpload from "../../../components/ui/documentupload";
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
  const [saveError, setSaveError] = useState("");
  const [retirementRequest, setRetirementRequest] = useState<any>(null);

  const [validation, setValidation] = useState<RetirementValidation | null>(null);

  const memberId = "MEM001";

  useEffect(() => {
    fetchMemberBankAccounts();
    fetchMinorSavingsAccounts();
    fetchMember();
    fetchRetirementValidation();
    fetchRetirementRequests();
     fetchRetirementRequestformdata(); 
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

  const fetchRetirementRequests = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/members/${memberId}/retirement-requests`
      );

      if (!res.ok) {
        const errorData = await res.json();
        setSaveError(errorData.message || "Failed to fetch retirement request");
        return;
      }

      const data = await res.json();

      if (data.length > 0) {
        setRetirementRequest(data[0]);
      }
    } catch (error) {
      console.error("Fetch retirement request error:", error);
    }
  };

  const fetchRetirementRequestformdata = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/members/${memberId}/retirement-requests`
      );

      if (!res.ok) return;

      const data = await res.json();

      if (data.length > 0) {
        setRetirementRequest(data[0]); // load existing request
      }
    } catch (error) {
      console.error(error);
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

  const handleConfirm = async (reason: string) => {
    if (!reason.trim()) {
      setSaveError("Incomplete reason is required.");
      return;
    }

    if (!retirementRequest?.id) {
      setSaveError("Please save retirement request before marking incomplete.");
      setOpenModal(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/members/retirement-requests/${retirementRequest.id}/mark-incomplete`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        setSaveError(errorData.message || "Failed to mark incomplete.");
        return;
      }

      const updatedRequest = await res.json();

      setRetirementRequest(updatedRequest);
      setOpenModal(false);
      setSaveError("");
    } catch (error) {
      console.error("Mark incomplete error:", error);
      setSaveError("Failed to mark request as incomplete.");
    }
  };

  const handleSave = async () => {
    const formData = await formRef.current?.validateAndGetData();

    if (!formData) return;

    setSaveError("");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/members/${memberId}/retirement-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        setSaveError(errorData.message || errorData.error || "Failed to save request");
        return;
      }

      const savedRequest = await res.json();
      setRetirementRequest(savedRequest);
      setSaveError("");

    } catch (error) {
      console.error("Save request error:", error);
      setSaveError("Failed to save retirement request.");
    }
  };

  const handleSubmitForm = async () => {
    setSaveError("");

    if (!retirementRequest?.id) {
      setSaveError("Please save retirement request before submitting.");
      return;
    }

    if (validation && !validation.canSubmit) {
      setSaveError("Cannot submit. Member has outstanding loans or loan obligations.");
      return;
    }

    const confirmed = window.confirm(
      "After submitting, this retirement request cannot be edited. Do you want to continue?"
    );

    if (!confirmed) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/members/retirement-requests/${retirementRequest.id}/submit`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        setSaveError(errorData.message || "Cannot submit request.");
        return;
      }

      const submittedRequest = await res.json();

      setRetirementRequest(submittedRequest);
      setSaveError("");
    } catch (error) {
      console.error("Submit request error:", error);
      setSaveError("Failed to submit retirement request.");
    }
  };

  const handleBankSave = (savedAccount: BankAccountRow) => {
    setBankAccounts((prev) => [...prev, savedAccount]);
    setOpenBankModal(false);
  };
  const requestIdDisplay = retirementRequest?.id
  ? retirementRequest.id
  : "NEW";

  const statusDisplay = retirementRequest?.status
  ? retirementRequest.status
  : "NEW";

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-[#953002]">
                Retirement Request
                {retirementRequest?.requestNo && `: ${retirementRequest.requestNo}`}
              </p>

              <div className="flex items-center gap-3 mt-1">
                <div className="inline-block bg-gray-100 px-3 py-1 rounded-md text-sm text-gray-700">
                  Member: {member.fullName} ({member.memberId})
                </div>

                {retirementRequest?.status && (
                  <p className="text-sm font-semibold text-blue-600">
                    • Status: {retirementRequest.status}
                  </p>
                )}
              </div>

              {saveError && (
                <p className="text-red-500 text-sm mt-2">
                  {saveError}
                </p>
              )}

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
                disabled={
                  !retirementRequest?.id ||
                  retirementRequest?.status === "INCOMPLETE" ||
                  retirementRequest?.status === "SUBMITTED_FOR_APPROVAL" ||
                  retirementRequest?.status === "APPROVED" ||
                  retirementRequest?.status === "REJECTED"
                }
                className="bg-[#D4183D] text-white hover:bg-[#b31533] disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Mark Incomplete
              </Button>

              <Button
                onClick={handleSubmitForm}
                disabled={
                  !retirementRequest?.id ||
                  retirementRequest?.status === "INCOMPLETE" ||
                  retirementRequest?.status === "SUBMITTED_FOR_APPROVAL" ||
                  retirementRequest?.status === "APPROVED" ||
                  retirementRequest?.status === "REJECTED" ||
                  (validation ? !validation.canSubmit : true)
                }
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
                <p className="text-xl font-bold text-[#953002] mb-4">
                  Supporting Documents
                </p>

                {!retirementRequest?.id ? (
                  <p className="text-gray-500">
                    Save retirement request before uploading documents.
                  </p>
                ) : (
                  <DocumentUpload
                    requestId={retirementRequest.id}
                    memberId={memberId}
                    requestStatus={retirementRequest.status}
                  />
                )}
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