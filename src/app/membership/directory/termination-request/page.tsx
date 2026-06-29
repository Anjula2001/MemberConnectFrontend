"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import TerminationForm, {
  type TerminationFormRef,
  type TerminationReason,
} from "@/src/components/ui/termination/terminationform";
import DocumentUpload from "@/src/components/ui/documentupload";
import { MarkIncompleteModal } from "@/src/components/ui/grade5schoolarship/MarkIncomplete";
import {
  SubmitConfirmationModal,
  SubmitSuccessModal,
} from "@/src/components/ui/termination/SubmitConfirmationModal";
import AddBankDetails, { AddBankDetailsRef } from "@/src/components/ui/retirement/addbankdetails";

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

interface TerminationValidation {
  hasOutstandingLoans: boolean;
  hasLoanObligations: boolean;
  totalOutstandingLoanBalance: number;
  canSubmit: boolean;
  message: string;
}

interface TerminationRequest {
  id: number;
  requestNo?: string;
  terminationReasonId?: string;
  terminationReason?: string;
  requestedDate: string;
  effectiveDate: string;
  comment?: string;
  status: string;
  incompleteReason?: string;
}

interface MemberDetails {
  memberId: string;
  fullName: string;
  nameWithInitials: string;
  nic: string;
  status?: string;
}

const API_BASE_URL = "http://localhost:8080";

const LOCKED_STATUSES = ["SUBMITTED_FOR_APPROVAL", "APPROVED", "REJECTED", "ADDED_TO_APPROVAL_LIST"];

const DEFAULT_TERMINATION_REASONS: TerminationReason[] = [
  { id: "1", name: "Resignation from Post" },
  { id: "2", name: "Disciplinary Action" },
  { id: "3", name: "Transfer to Another Organization" },
  { id: "4", name: "Other" },
];

export default function TerminationRequestPage() {
  const searchParams = useSearchParams();
  const formRef = useRef<TerminationFormRef>(null);
  const bankFormRef = useRef<AddBankDetailsRef>(null);
  const pageMode = searchParams.get("mode") || "";

  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(pageMode === "edit");
  const [openModal, setOpenModal] = useState(false);
  const [openSubmitConfirm, setOpenSubmitConfirm] = useState(false);
  const [openSubmitSuccess, setOpenSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openBankModal, setOpenBankModal] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccountRow | null>(null);
  const [minorSavingsAccounts, setMinorSavingsAccounts] = useState<MinorSavingsAccount[]>([]);
  const [minorSavingsError, setMinorSavingsError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [member, setMember] = useState<MemberDetails>({
    memberId: "",
    fullName: "",
    nameWithInitials: "",
    nic: "",
  });
  const [terminationRequest, setTerminationRequest] = useState<TerminationRequest | null>(null);
  const [validation, setValidation] = useState<TerminationValidation | null>(null);
  const [terminationReasons, setTerminationReasons] = useState<TerminationReason[]>(
    DEFAULT_TERMINATION_REASONS
  );
  const [loading, setLoading] = useState(true);

  const isRequestLocked = terminationRequest?.status
    ? LOCKED_STATUSES.includes(terminationRequest.status)
    : false;
  const isEditMode = isEditing && !isRequestLocked;
  const isIncompleteStatus = terminationRequest?.status === "INCOMPLETE";
  const isViewRequestMode = pageMode === "view";
  const hasSavedRequest = !!terminationRequest?.id;
  const canModifyMember =
    !member.status ||
    member.status === "ACTIVE" ||
    member.status === "TERMINATION_REQUESTED";
  const showSaveButton = !isViewRequestMode || isEditMode;
  const showWorkflowActions = hasSavedRequest && !isRequestLocked;
  const isWorkflowBlockedByEdit = isEditMode;
  const isSubmitBlockedByLoans = validation ? !validation.canSubmit : true;

  useEffect(() => {
    let memberIdParam = searchParams.get("memberId");
    if (memberIdParam) {
      if (memberIdParam.includes("?")) {
        memberIdParam = memberIdParam.split("?")[0];
      }
      setSelectedMemberId(memberIdParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTerminationReasons();
  }, []);

  useEffect(() => {
    setIsEditing(pageMode === "edit");

    if (!selectedMemberId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMember(),
        fetchTerminationValidation(),
        fetchMinorSavingsAccounts(),
        fetchMemberBankAccounts(),
        fetchTerminationRequests(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [pageMode, selectedMemberId]);

  const fetchTerminationReasons = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/masters/termination-reasons`);
      if (!response.ok) return;

      const reasons = (await response.json()) as Array<{ id: string | number; name: string }>;
      if (reasons.length > 0) {
        setTerminationReasons(
          reasons.map((reason) => ({
            id: String(reason.id),
            name: reason.name,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch termination reasons:", error);
    }
  };

  const fetchMember = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/members/${selectedMemberId}`);
      if (!response.ok) throw new Error("Failed to fetch member");

      const memberData = await response.json();
      setMember({
        memberId: memberData.memberId,
        fullName: memberData.fullName,
        nameWithInitials: memberData.nameWithInitials,
        nic: memberData.nic,
        status: memberData.status,
      });
    } catch (error) {
      console.error("Fetch member error:", error);
    }
  };

  const fetchTerminationValidation = async () => {
    try {
      let response = await fetch(
        `${API_BASE_URL}/api/members/${selectedMemberId}/termination-validation`
      );

      if (!response.ok) {
        response = await fetch(
          `${API_BASE_URL}/api/members/${selectedMemberId}/retirement-validation`
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const validationData = await response.json();
      setValidation(validationData);
    } catch (error) {
      console.error("Termination validation error:", error);
    }
  };

  const fetchMinorSavingsAccounts = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/members/${selectedMemberId}/minor-savings-accounts`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const accounts = await response.json();
      setMinorSavingsAccounts(accounts);
    } catch (error) {
      console.error("Fetch minor savings accounts error:", error);
    }
  };

  const fetchMemberBankAccounts = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/members/${selectedMemberId}/bank-accounts`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const accounts = await response.json();
      setBankAccounts(accounts);
    } catch (error) {
      console.error("Fetch member bank accounts error:", error);
    }
  };

  const fetchTerminationRequests = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/termination-requests/member/${selectedMemberId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setTerminationRequest(null);
          return;
        }

        const errorData = await response.json().catch(() => null);
        setSaveError(errorData?.message || "Failed to fetch termination request");
        return;
      }

      const requests: TerminationRequest[] = await response.json();

      if (requests.length > 0) {
        const activeRequest =
          requests.find((request) => request.status !== "INACTIVE") || requests[0];
        setTerminationRequest(activeRequest);
      } else {
        setTerminationRequest(null);
      }
    } catch (error) {
      console.error("Fetch termination request error:", error);
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
      setMinorSavingsError("Only one disbursement bank account is allowed.");
      return;
    }

    setEditingBankAccount(null);
    setMinorSavingsError("");
    setOpenBankModal(true);
  };

  const handleConfirmIncomplete = async (reason: string) => {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setSaveError("Incomplete reason is required.");
      return;
    }

    if (!terminationRequest?.id) {
      setSaveError("Please save termination request before marking incomplete.");
      setOpenModal(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/termination-requests/${terminationRequest.requestNo}/mark-incomplete`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: trimmedReason }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setSaveError(errorData?.message || "Failed to mark incomplete.");
        return;
      }

      const updatedRequest: TerminationRequest = await response.json();
      setTerminationRequest(updatedRequest);
      setOpenModal(false);
      setSaveError("");
    } catch (error) {
      console.error("Mark incomplete error:", error);
      setSaveError("Failed to mark request as incomplete.");
    }
  };

  const handleSave = async () => {
    if (!canModifyMember) {
      setSaveError("Termination is only available for members with Active status.");
      return;
    }

    const formData = await formRef.current?.validateAndGetData();
    if (!formData) return;

    setSaveError("");

    try {
      const isUpdate = !!terminationRequest?.id && isEditMode;

      const response = await fetch(
        isUpdate
          ? `${API_BASE_URL}/api/termination-requests/${terminationRequest.requestNo}`
          : `${API_BASE_URL}/api/termination-requests/${selectedMemberId}`,
        {
          method: isUpdate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        try {
          const errorData = JSON.parse(errorText);
          setSaveError(errorData.message || errorData.error || "Failed to save request");
        } catch {
          setSaveError(errorText || "Failed to save request");
        }

        return;
      }

      const savedRequest: TerminationRequest = await response.json();
      setTerminationRequest(savedRequest);
      setIsEditing(false);
      setSaveError("");
      await fetchMember();
    } catch (error) {
      console.error("Save request error:", error);
      setSaveError("Failed to save termination request.");
    }
  };

  const handleSubmitForm = () => {
    setSaveError("");

    if (!terminationRequest?.id) {
      setSaveError("Please save termination request before submitting.");
      return;
    }

    if (minorSavingsAccounts.length > 0 && bankAccounts.length === 0) {
      setSaveError("Please add disbursement bank details before submitting.");
      return;
    }

    if (validation && !validation.canSubmit) {
      setSaveError("Cannot submit. Member has outstanding loans or loan obligations.");
      return;
    }

    setOpenSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if (!terminationRequest?.requestNo) {
      setSaveError("Please save termination request before submitting.");
      setOpenSubmitConfirm(false);
      return;
    }

    try {
      setIsSubmitting(true);
      setSaveError("");

      const response = await fetch(
        `${API_BASE_URL}/api/termination-requests/${terminationRequest.requestNo}/submit`,
        { method: "POST" }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setSaveError(errorData?.message || "Cannot submit request.");
        setOpenSubmitConfirm(false);
        return;
      }

      const submittedRequest: TerminationRequest = await response.json();
      setTerminationRequest(submittedRequest);
      setIsEditing(false);
      setOpenSubmitConfirm(false);
      setOpenSubmitSuccess(true);
    } catch (error) {
      console.error("Submit request error:", error);
      setSaveError("Failed to submit termination request.");
      setOpenSubmitConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBankSave = (savedAccount: BankAccountRow) => {
    setBankAccounts([savedAccount]);
    setEditingBankAccount(null);
    setMinorSavingsError("");
    setSaveError("");
    setOpenBankModal(false);
  };

  const requestDisplayId = terminationRequest?.requestNo || "NEW";
  const requestStatus = terminationRequest?.status || "NEW";

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-neutral-500">
        Loading termination request...
      </div>
    );
  }

  if (!selectedMemberId) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-10 py-10 pt-0">
        <p className="text-red-500">No member selected. Open this page from a member profile.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 px-10 py-10 pt-0">
        <Link
          href={`/membership/directory/${selectedMemberId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-[#9d3602]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Member Profile
        </Link>

        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-6 px-14 py-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-[#953002]">
                Member Termination Request Entry
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="inline-block rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  Member: {member.fullName} ({member.memberId})
                </div>

                <div className="inline-block rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  Request ID: {requestDisplayId}
                </div>

                <p className="text-sm font-semibold text-blue-600">
                  Status: {requestStatus}
                  {isIncompleteStatus &&
                    terminationRequest?.incompleteReason &&
                    ` (${terminationRequest.incompleteReason})`}
                </p>
              </div>

              {saveError && <p className="mt-2 text-sm text-red-500">{saveError}</p>}
            </div>

            <div className="flex gap-2">
              {isViewRequestMode &&
                hasSavedRequest &&
                !isRequestLocked &&
                !isEditMode && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-white text-black hover:bg-gray-100"
                  >
                    Edit
                  </Button>
                )}

              {showSaveButton && (
                <Button
                  onClick={handleSave}
                  disabled={!canModifyMember}
                  className="bg-white text-black hover:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Save
                </Button>
              )}

              {showWorkflowActions && (
                <>
                  <Button
                    onClick={() => setOpenModal(true)}
                    disabled={isWorkflowBlockedByEdit || isIncompleteStatus}
                    className="bg-[#D4183D] text-white hover:bg-[#b31334] disabled:cursor-not-allowed"
                  >
                    Mark Incomplete
                  </Button>

                  <Button
                    onClick={handleSubmitForm}
                    disabled={
                      isWorkflowBlockedByEdit ||
                      isSubmitBlockedByLoans ||
                      isIncompleteStatus
                    }
                    className="bg-[#953002] text-white hover:bg-[#7a2702] disabled:cursor-not-allowed"
                  >
                    Submit for Approval
                  </Button>
                </>
              )}
            </div>
          </div>

          {!canModifyMember && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Termination is only available when the member status is Active.
              </p>
              <p className="mt-1 text-sm text-amber-700">
                Current member status: {member.status || "Unknown"}
              </p>
            </div>
          )}

          {validation && !validation.canSubmit && (
            <div className="mt-4 rounded-lg border border-red-200 bg-white p-4 px-6 shadow-sm">
              <p className="font-semibold text-pink-500">Cannot Submit Request</p>

              {validation.hasOutstandingLoans && (
                <p className="text-sm text-pink-500">
                  • Member has outstanding loan balance: LKR{" "}
                  {validation.totalOutstandingLoanBalance}
                </p>
              )}

              {validation.hasLoanObligations && (
                <p className="text-sm text-pink-500">
                  • Member has indirect loan obligations
                </p>
              )}
            </div>
          )}

          <div className="mt-6 rounded-lg border border-gray-200 bg-white px-6 py-5">
            <h2 className="mb-4 text-lg font-bold text-[#953002]">Member Details</h2>

            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="mb-1 block font-medium">Member ID</label>
                <input
                  type="text"
                  value={member.memberId || ""}
                  readOnly
                  className="w-full cursor-not-allowed rounded-md border border-gray-300 px-3 py-2 text-gray-700"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium">Surname with Initials</label>
                <input
                  type="text"
                  value={member.nameWithInitials || ""}
                  readOnly
                  className="w-full cursor-not-allowed rounded-md border border-gray-300 px-3 py-2 text-gray-700"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium">NIC Number</label>
                <input
                  type="text"
                  value={member.nic || ""}
                  readOnly
                  className="w-full cursor-not-allowed rounded-md border border-gray-300 px-3 py-2 text-gray-700"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-6">
            <div className="flex flex-1 flex-col space-y-6">
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-[#953002]">Request Information</h2>

                <TerminationForm
                  key={`${selectedMemberId}-${terminationRequest?.id || "new"}-${terminationRequest?.requestedDate || ""}-${terminationRequest?.effectiveDate || ""}-${terminationRequest?.terminationReasonId || ""}-${terminationRequest?.comment || ""}`}
                  ref={formRef}
                  reasons={terminationReasons}
                  readOnly={!!terminationRequest?.id && !isEditMode}
                  initialData={{
                    terminationReasonId: terminationRequest?.terminationReasonId || "",
                    terminationReason: terminationRequest?.terminationReason || "",
                    requestedDate: terminationRequest?.requestedDate || "",
                    effectiveDate: terminationRequest?.effectiveDate || "",
                    comment: terminationRequest?.comment || "",
                  }}
                />
              </div>

              <div className="rounded-lg bg-white p-4 px-6 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xl font-bold text-[#953002]">Minor Saving Disbursement</p>

                  <Button
                    className={
                      minorSavingsAccounts.length === 0 || (!!terminationRequest?.id && !isEditMode)
                        ? "cursor-not-allowed bg-gray-200 text-gray-500"
                        : "bg-gray-50 text-black hover:bg-gray-100"
                    }
                    onClick={handleAddAccountClick}
                    disabled={!!terminationRequest?.id && !isEditMode}
                  >
                    +Account
                  </Button>
                </div>

                {minorSavingsError && (
                  <p className="mb-3 text-sm text-red-500">{minorSavingsError}</p>
                )}

                {minorSavingsAccounts.length === 0 ? (
                  <p className="text-gray-600">Member has no minor saving account</p>
                ) : (
                  <>
                    <div className="mb-6 overflow-x-auto">
                      <p className="mb-2 font-semibold">Minor Saving Accounts</p>

                      <table className="w-3/4 rounded-lg border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="w-1/4 border-b px-4 py-2 text-left">
                              Minor Account No
                            </th>
                            <th className="w-1/4 border-b px-4 py-2 text-left">Holder Name</th>
                            <th className="w-1/4 border-b px-4 py-2 text-left">Balance</th>
                          </tr>
                        </thead>

                        <tbody>
                          {minorSavingsAccounts.map((account) => (
                            <tr key={account.minorAccountNo}>
                              <td className="border-b px-4 py-2">{account.minorAccountNo}</td>
                              <td className="border-b px-4 py-2">{account.holderName}</td>
                              <td className="border-b px-4 py-2">{account.balance}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {bankAccounts.length === 0 ? (
                      <p className="text-gray-600">No disbursement bank details added</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <p className="mb-2 font-semibold">Disbursement Bank Details</p>

                        <table className="w-3/4 rounded-lg border border-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="w-1/4 border-b px-4 py-2 text-left">Bank</th>
                              <th className="w-1/4 border-b px-4 py-2 text-left">Branch</th>
                              <th className="w-1/4 border-b px-4 py-2 text-left">
                                Account Number
                              </th>
                              {isEditMode && (
                                <th className="w-1/4 border-b px-4 py-2 text-left">Action</th>
                              )}
                            </tr>
                          </thead>

                          <tbody>
                            {bankAccounts.map((account) => (
                              <tr key={account.id}>
                                <td className="border-b px-4 py-2">{account.bankName}</td>
                                <td className="border-b px-4 py-2">{account.branchName}</td>
                                <td className="border-b px-4 py-2">{account.accountNumber}</td>

                                {isEditMode && (
                                  <td className="border-b px-4 py-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => {
                                        setEditingBankAccount(account);
                                        setOpenBankModal(true);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="rounded-lg bg-white p-4 px-6 shadow-sm">
                <p className="mb-4 text-xl font-bold text-[#953002]">Supporting Documents</p>

                <DocumentUpload
                  requestNo={terminationRequest?.requestNo || null}
                  memberId={selectedMemberId}
                  requestStatus={terminationRequest?.status || "NEW"}
                  requestType="termination-requests"
                  readOnly={isRequestLocked}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <MarkIncompleteModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onConfirm={handleConfirmIncomplete}
      />

      <SubmitConfirmationModal
        open={openSubmitConfirm}
        title="Submit Termination Request"
        description="Please confirm that all mandatory information and supporting documents are complete before submitting this request for approval."
        confirmLabel="Submit for Approval"
        isLoading={isSubmitting}
        onClose={() => !isSubmitting && setOpenSubmitConfirm(false)}
        onConfirm={handleConfirmSubmit}
      />

      <SubmitSuccessModal
        open={openSubmitSuccess}
        requestId={terminationRequest?.requestNo}
        onClose={() => setOpenSubmitSuccess(false)}
      />

      {openBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-96 rounded bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-[#953002]">
              Add Disbursement Bank Details
            </h2>

            <AddBankDetails
              ref={bankFormRef}
              memberId={selectedMemberId}
              initialData={editingBankAccount}
              onSave={handleBankSave}
              onClose={() => {
                setOpenBankModal(false);
                setEditingBankAccount(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
