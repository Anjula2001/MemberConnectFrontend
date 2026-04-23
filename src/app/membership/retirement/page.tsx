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

const API_BASE_URL = "http://localhost:8080";

export default function RetirementPage() {
  const formRef = useRef<RetirementFormRef>(null);
  const bankFormRef = useRef<AddBankDetailsRef>(null);

  const [openModal, setOpenModal] = useState(false);
  const [openBankModal, setOpenBankModal] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);

  const memberId = "MEM001";

  useEffect(() => {
    fetchMemberBankAccounts();
  }, []);

  const fetchMemberBankAccounts = async () => {
  try {
    const url = `${API_BASE_URL}/api/members/${memberId}/bank-accounts`;
    console.log("Fetching:", url);

    const res = await fetch(url, {
      method: "GET",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    console.log("Bank accounts:", data);
    setBankAccounts(data);
  } catch (error) {
    console.error("Fetch member bank accounts error:", error);
  }
};

  const handleConfirm = (reason: string) => {
    if (!reason.trim()) return;

    setOpenModal(false);
    console.log("Marked as Incomplete:", reason);
  };

  const handleSave = async () => {
    const formData = await formRef.current?.validateAndGetData();

    if (!formData) {
      return;
    }

    console.log("Save data:", formData);
  };

  const handleSubmitForm = async () => {
    const formData = await formRef.current?.validateAndGetData();

    if (!formData) {
      return;
    }

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
            <p className="text-2xl font-bold text-[#953002]">
              Retirement Request
            </p>

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
                className="bg-[#953002] text-white hover:bg-[#672102]"
              >
                Submit
              </Button>
            </div>
          </div>

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
                    className="bg-gray-50 text-black hover:bg-gray-100"
                    onClick={() => setOpenBankModal(true)}
                  >
                    +Account
                  </Button>
                </div>

                <p className="flex gap-2 mb-4">
                  Enter disbursement details for any saving accounts
                </p>

                {bankAccounts.length === 0 ? (
                  <p>No minor saving account added</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left px-4 py-2 border-b">Bank</th>
                          <th className="text-left px-4 py-2 border-b">Branch</th>
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
              </div>
            </div>

            <div className="w-1/4">
              <DocumentUpload />
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
              Add Bank Account
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