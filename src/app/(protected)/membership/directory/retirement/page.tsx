"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../../../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "../../../../components/ui/select";
import RetirementForm, { RetirementFormRef, } from "../../../../components/ui/retirement/retirementform";
import DocumentUpload from "../../../../components/ui/documentupload";
import { MarkIncompleteModal } from "../../../../components/ui/grade5schoolarship/MarkIncomplete";
import AddBankDetails, { AddBankDetailsRef, } from "../../../../components/ui/retirement/addbankdetails";

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

interface RetirementRequest {
  id: number;
  requestNo?: string;
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
}

const API_BASE_URL = "http://localhost:8080";

const LOCKED_STATUSES = [
  "SUBMITTED_FOR_APPROVAL",
  "APPROVED",
  "REJECTED",
];

export default function RetirementPage() {
  const searchParams = useSearchParams();
  const formRef = useRef<RetirementFormRef>(null);
  const bankFormRef = useRef<AddBankDetailsRef>(null);
  const requestId = searchParams.get("requestId");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const pageMode = searchParams.get("mode") || "";
  const [isEditing, setIsEditing] = useState(pageMode === "edit");


  const [openModal, setOpenModal] = useState(false);
  const [openBankModal, setOpenBankModal] = useState(false);

  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccountRow | null>(null);
  const [minorSavingsAccounts, setMinorSavingsAccounts] = useState<MinorSavingsAccount[]>([]);

  const [minorSavingsError, setMinorSavingsError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const [member, setMember] = useState<MemberDetails>({ memberId: "", fullName: "", nameWithInitials: "", nic: "", });

  const [retirementRequest, setRetirementRequest] = useState<RetirementRequest | null>(null);
  const [isCurrentSessionSaved, setIsCurrentSessionSaved] = useState(false);
  const [selectedViewModeStatus, setSelectedViewModeStatus] = useState<string>("");

  const [validation, setValidation] = useState<RetirementValidation | null>(null);

  const [openSubmitConfirm, setOpenSubmitConfirm] = useState(false);
  const [openSubmitSuccess, setOpenSubmitSuccess] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRequestLocked = retirementRequest?.status
    ? LOCKED_STATUSES.includes(retirementRequest.status)
    : false;

  const isEditMode = isEditing && !isRequestLocked;
  const isIncompleteStatus = retirementRequest?.status === "INCOMPLETE";
  const showApprovalActions = retirementRequest?.status === "SUBMITTED_FOR_APPROVAL" && !isEditMode;
  const hideRequestEditActions = showApprovalActions;
  const isViewRequestMode = pageMode === "view" && !!requestId;

  const VIEW_MODE_STATUS_TRANSITIONS: Record<string, { status: string; label: string }[]> = {
    NEW: [
      { status: "INACTIVE", label: "Mark Inactive" },
    ],
    INCOMPLETE: [
      { status: "NEW", label: "Return to New" },
      { status: "INACTIVE", label: "Mark Inactive" },
    ],
    SUBMITTED_FOR_APPROVAL: [
      { status: "NEW", label: "Return to New" },
      { status: "INACTIVE", label: "Mark Inactive" },
    ],
    REJECTED: [
      { status: "NEW", label: "Return to New" },
      { status: "INACTIVE", label: "Mark Inactive" },
    ],
    INACTIVE: [
      { status: "NEW", label: "Reopen" },
    ],
  };

  const viewModeStatusActions = retirementRequest?.status
    ? VIEW_MODE_STATUS_TRANSITIONS[retirementRequest.status] || []
    : [];

  const showViewModeStatusActions =
    !!retirementRequest?.id &&
    !isEditMode &&
    !isCurrentSessionSaved &&
    isViewRequestMode &&
    viewModeStatusActions.length > 0;

  const showDisabledRequestActions =
    !!retirementRequest?.id &&
    !isEditMode &&
    !isCurrentSessionSaved &&
    isViewRequestMode &&
    viewModeStatusActions.length === 0;

  const showRequestEditActions =
    !hideRequestEditActions &&
    !showDisabledRequestActions &&
    (!isViewRequestMode || isEditMode || isCurrentSessionSaved);

  useEffect(() => {
    let memberIdParam = searchParams.get("memberId");
    if (memberIdParam) {
      if (memberIdParam.includes("?")) {
        memberIdParam = memberIdParam.split("?")[0];
      }
      setSelectedMemberId(memberIdParam);
    } else {
      const fetchDefaultMember = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/members/getMembers`);
          if (!res.ok) throw new Error("Failed to fetch members");
          const members = await res.json();
          const activeMember = members.find((m: { status: string; memberId: string }) => m.status === "ACTIVE" || m.status === "active");
          if (activeMember) {
            setSelectedMemberId(activeMember.memberId);
          } else if (members.length > 0) {
            setSelectedMemberId(members[0].memberId);
          }
        } catch (error) {
          console.error("Failed to fetch default member:", error);
        }
      };
      fetchDefaultMember();
    }
  }, [searchParams]);

  // Loads all data needed when opening a retirement request record.
  useEffect(() => {
    setIsEditing(pageMode === "edit");
    setIsCurrentSessionSaved(false);
    if (selectedMemberId) {
      fetchMember();
      fetchRetirementValidation();
      fetchMinorSavingsAccounts();
      fetchMemberBankAccounts();
      fetchRetirementRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageMode, selectedMemberId]);

  //Fetches the selected member details for the page header and member panel.
  const fetchMember = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/members/${selectedMemberId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch member");
      }

      const memberData = await response.json();

      setMember({
        memberId: memberData.memberId,
        fullName: memberData.fullName,
        nameWithInitials: memberData.nameWithInitials,
        nic: memberData.nic,
      });
    } catch (error) {
      console.error("Fetch member error:", error);
    }
  };

  // Checks whether the member can submit a retirement request.
  const fetchRetirementValidation = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/members/${selectedMemberId}/retirement-validation`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const validationData = await response.json();
      setValidation(validationData);
    } catch (error) {
      console.error("Retirement validation error:", error);
    }
  };

  // Loads minor savings accounts linked to the selected member.
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

  // Loads disbursement bank account details already saved for the member.
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

  // Loads the existing retirement request for the selected member.
  const fetchRetirementRequests = async () => {
    try {
      let response;

      if (requestId) {
        response = await fetch(
          `${API_BASE_URL}/api/retirement-requests/request/${requestId}`
        );
      } else {
        response = await fetch(
          `${API_BASE_URL}/api/retirement-requests/member/${selectedMemberId}`
        );
      }

      if (!response.ok) {
        const errorData = await response.json();
        setSaveError(errorData.message || "Failed to fetch retirement request");
        return;
      }

      if (requestId) {
        const request: RetirementRequest = await response.json();
        setRetirementRequest(request);
      } else {
        const requests: RetirementRequest[] = await response.json();

        if (requests.length > 0) {
          setRetirementRequest(requests[0]);
        }
      }

      setIsCurrentSessionSaved(false);
    } catch (error) {
      console.error("Fetch retirement request error:", error);
    }
  };

  // Opens the bank detail modal when the member can add disbursement details.
  const handleAddAccountClick = () => {
    if (minorSavingsAccounts.length === 0) {
      setMinorSavingsError("No need to add disbursement details because member has no minor saving accounts.");
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

  // Marks the retirement request as incomplete with a required reason.
  const handleConfirm = async (reason: string) => {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setSaveError("Incomplete reason is required.");
      return;
    }

    if (!retirementRequest?.id) {
      setSaveError("Please save retirement request before marking incomplete.");
      setOpenModal(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/retirement-requests/${retirementRequest.requestNo}/mark-incomplete`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: trimmedReason }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setSaveError(errorData.message || "Failed to mark incomplete.");
        return;
      }

      const updatedRequest: RetirementRequest = await response.json();

      setRetirementRequest(updatedRequest);
      setOpenModal(false);
      setSaveError("");
    } catch (error) {
      console.error("Mark incomplete error:", error);
      setSaveError("Failed to mark request as incomplete.");
    }
  };

  // Validates and saves the retirement request form.
  const handleSave = async () => {
    const formData = await formRef.current?.validateAndGetData();

    if (!formData) return;

    setSaveError("");

    try {
      const isUpdate = !!retirementRequest?.id && isEditMode;

      const response = await fetch(
        isUpdate
          ? `${API_BASE_URL}/api/retirement-requests/${retirementRequest.requestNo}`
          : `${API_BASE_URL}/api/retirement-requests/${selectedMemberId}`,
        {
          method: isUpdate ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

      const savedRequest: RetirementRequest = await response.json();

      setRetirementRequest(savedRequest);
      setIsEditing(false);
      setIsCurrentSessionSaved(true);
      setSaveError("");
    } catch (error) {
      console.error("Save request error:", error);
      setSaveError("Failed to save retirement request.");
    }
  };

  // Validates that all mandatory documents are uploaded before submitting.
  const validateMandatoryDocuments = async (): Promise<boolean> => {
    if (!retirementRequest?.requestNo) {
      setSaveError("Please save retirement request before submitting.");
      return false;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/retirement-requests/${retirementRequest.requestNo}/required-documents?memberId=${encodeURIComponent(selectedMemberId)}`
      );

      if (!response.ok) {
        setSaveError("Failed to validate required documents.");
        return false;
      }

      const docs: { id: number; documentName: string; mandatory: boolean; uploaded: boolean }[] = await response.json();
      const hasMissingMandatory = docs.some((doc) => doc.mandatory && !doc.uploaded);

      if (hasMissingMandatory) {
        setSaveError("Cannot submit. Mandatory documents are missing.");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Document validation error:", error);
      setSaveError("Failed to validate mandatory documents.");
      return false;
    }
  };

  // Submits a saved retirement request for approval.
  const handleSubmitForm = async () => {
    setSaveError("");

    if (!retirementRequest?.id) {
      setSaveError("Please save retirement request before submitting.");
      return;
    }

    const isDocsValid = await validateMandatoryDocuments();
    if (!isDocsValid) return;

    if (minorSavingsAccounts.length > 0 && bankAccounts.length === 0) {
      const missingBankDetailsMessage = "Please add disbursement bank details before submitting.";
      setSaveError(missingBankDetailsMessage);
      return;
    }

    if (validation && !validation.canSubmit) {
      setSaveError("Cannot submit. Member has outstanding loans or loan obligations.");
      return;
    }

    setOpenSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if (!retirementRequest?.requestNo) {
      setSaveError("Please save retirement request before submitting.");
      setOpenSubmitConfirm(false);
      return;
    }

    try {
      setIsSubmitting(true);
      setSaveError("");

      const response = await fetch(
        `${API_BASE_URL}/api/retirement-requests/${retirementRequest.requestNo}/submit`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setSaveError(errorData.message || "Cannot submit request.");
        setOpenSubmitConfirm(false);
        return;
      }

      const submittedRequest: RetirementRequest = await response.json();

      setRetirementRequest(submittedRequest);
      setSaveError("");
      setOpenSubmitConfirm(false);
      setOpenSubmitSuccess(true);
    } catch (error) {
      console.error("Submit request error:", error);
      setSaveError("Failed to submit retirement request.");
      setOpenSubmitConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status change modal state
  const [statusConfirmModal, setStatusConfirmModal] = useState<{
    isOpen: boolean;
    newStatus: string;
    statusLabel: string;
  }>({
    isOpen: false,
    newStatus: "",
    statusLabel: "",
  });

  const handleChangeStatus = (newStatus: string) => {
    if (!retirementRequest?.requestNo) {
      setSaveError("Please open a retirement request before changing status.");
      return;
    }

    const statusLabel =
      newStatus === "INACTIVE"
        ? "Inactive"
        : newStatus === "INCOMPLETE"
          ? "Incomplete"
          : newStatus === "NEW"
            ? "New"
            : newStatus === "SUBMITTED_FOR_APPROVAL"
              ? "Submitted for Approval"
              : newStatus;

    setStatusConfirmModal({
      isOpen: true,
      newStatus,
      statusLabel,
    });
  };

  const confirmChangeStatus = async () => {
    const { newStatus } = statusConfirmModal;
    setStatusConfirmModal({ isOpen: false, newStatus: "", statusLabel: "" });

    if (!retirementRequest?.requestNo) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/retirement-requests/${retirementRequest.requestNo}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setSaveError(errorData.message || "Failed to change retirement request status.");
        return;
      }

      const updatedRequest: RetirementRequest = await response.json();

      setRetirementRequest(updatedRequest);
      setSaveError("");
      await fetchMember();
    } catch (error) {
      console.error("Change status error:", error);
      setSaveError("Failed to change retirement request status.");
    }
  };

  // Approves or rejects a submitted retirement request.
  const handleApprovalAction = async (
    action: "approve" | "reject",
    comment = ""
  ) => {
    setSaveError("");

    if (!retirementRequest?.id) {
      setSaveError("Please open a retirement request before approving or rejecting.");
      return;
    }



    if (action === "reject" && !comment.trim()) {
      setSaveError("Reject comment is required.");
      return;
    }

    try {
      setApprovalAction(action);

      const response = await fetch(
        `${API_BASE_URL}/api/retirement-requests/${retirementRequest.requestNo}/${action}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body:
            action === "reject"
              ? JSON.stringify({ reason: comment.trim() })
              : undefined,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setSaveError(
          errorData.message || `Failed to ${action} retirement request.`
        );
        return;
      }

      const responseText = await response.text();
      const updatedRequest: RetirementRequest = responseText
        ? JSON.parse(responseText)
        : {
          ...retirementRequest,
          status: action === "approve" ? "APPROVED" : "REJECTED",
        };
      setRetirementRequest(updatedRequest);
      await fetchMember();
      setSaveError("");
      setRejectModalOpen(false);
      setRejectComment("");
    } catch (error) {
      console.error(`${action} request error:`, error);
      setSaveError(`Failed to ${action} retirement request.`);
    } finally {
      setApprovalAction(null);
    }
  };

  // Adds a newly saved bank account row to the displayed list.
  const handleBankSave = (savedAccount: BankAccountRow) => {
    setBankAccounts([savedAccount]);
    setEditingBankAccount(null);
    setMinorSavingsError("");
    setSaveError("");
    setOpenBankModal(false);
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 w-full px-6 py-6 pt-0">
        <div className="min-h-screen flex-1 rounded-xl w-full px-6 py-6 bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-[#953002] ">
                Retirement Request
                {retirementRequest?.requestNo && `: ${retirementRequest.requestNo}`}
              </p>

              <div className="flex items-center gap-3 mt-1">
                <div className="inline-block bg-gray-100 px-3 py-1 rounded-md text-sm text-gray-700">
                  Member: {member.fullName} ({member.memberId})
                </div>

                {/*show status and incomplete reason if the request is in incomplete status*/}
                {retirementRequest?.status && (
                  <p className="text-sm font-semibold text-blue-600">
                    Status: {retirementRequest.status}
                    {isIncompleteStatus &&
                      retirementRequest.incompleteReason &&
                      ` (${retirementRequest.incompleteReason})`}
                  </p>
                )}

              </div>
              {saveError && (
                <p className="text-red-500 text-sm mt-2">{saveError}</p>
              )}
            </div>

            <div className="flex gap-2">

              {/*Edit button is only shown when viewing an existing request that is not locked*/}
              {(isViewRequestMode) &&
                retirementRequest?.id &&
                !isRequestLocked &&
                !isEditMode &&
                !isCurrentSessionSaved && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-white text-black hover:bg-gray-100"
                  >
                    Edit
                  </Button>
                )}

              {/*Approval actions are only shown to approvers */}
              {showApprovalActions && (
                <>
                  <Button
                    onClick={() => setApproveModalOpen(true)}
                    disabled={approvalAction !== null}
                    className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    {approvalAction === "approve" ? "Approving..." : "Approve"}
                  </Button>

                  <Button
                    onClick={() => {
                      setRejectComment("");
                      setRejectModalOpen(true);
                    }}
                    disabled={approvalAction !== null}
                    className="bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    {approvalAction === "reject" ? "Rejecting..." : "Reject"}
                  </Button>
                </>
              )}

              {/*  */}
              {showViewModeStatusActions && (
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedViewModeStatus}
                    onValueChange={async (value) => {
                      setSelectedViewModeStatus(value);
                      if (value === "INCOMPLETE") {
                        setOpenModal(true);
                        setSelectedViewModeStatus("");
                      } else {
                        await handleChangeStatus(value);
                        setSelectedViewModeStatus("");
                      }
                    }}
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      {viewModeStatusActions.map((action) => (
                        <SelectItem key={action.status} value={action.status}>
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showDisabledRequestActions && (
                <>
                  <Button
                    type="button"
                    disabled
                    className="bg-[#D4183D] text-white disabled:bg-[#D4183D] hover:bg-[#b31334] disabled:text-white disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    Mark Incomplete
                  </Button>

                  <Button
                    type="button"
                    disabled
                    className="bg-[#953002] text-white disabled:bg-[#953002]  hover:bg-[#7a2702] disabled:text-white disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    Submit for Approval
                  </Button>
                </>
              )}

              {/*  */}
              {showRequestEditActions && (
                <>
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
                      isRequestLocked ||
                      (isIncompleteStatus && !isEditMode)
                    }
                    className="bg-[#D4183D] text-white hover:bg-[#b31334] disabled:cursor-not-allowed"
                  >
                    Mark Incomplete
                  </Button>

                  <Button
                    onClick={handleSubmitForm}
                    disabled={
                      !retirementRequest?.id ||
                      isRequestLocked ||
                      (isIncompleteStatus && !isEditMode) ||
                      (validation ? !validation.canSubmit : true)
                    }
                    className="bg-[#953002] text-white  hover:bg-[#7a2702] disabled:cursor-not-allowed"
                  >
                    Submit for Approval
                  </Button>
                </>
              )}
            </div>
          </div>

          {/*for show member loans and inderectobligation if have */}
          {validation && !validation.canSubmit && (
            <div className="bg-white rounded-lg shadow-sm p-4 mt-4 px-6 border border-red-200">
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

          {/*show member details*/}
          <div className="bg-white border border-gray-200 rounded-lg px-6 py-5 mt-6">
            <h2 className="text-lg font-bold text-[#953002] mb-4">
              Member Details
            </h2>

            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="block font-medium mb-1">Member ID</label>
                <input
                  type="text"
                  value={member.memberId || ""}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Surname with Initials
                </label>
                <input
                  type="text"
                  value={member.nameWithInitials || ""}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">NIC Number</label>
                <input
                  type="text"
                  value={member.nic || ""}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Retirement form, minor savings accounts, disbursement bank details and document upload sections */}
          <div className="flex gap-6 mt-6">
            <div className="flex-1 flex flex-col space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <RetirementForm
                  key={`${selectedMemberId}-${retirementRequest?.id || "new"}-${retirementRequest?.requestedDate || ""
                    }-${retirementRequest?.effectiveDate || ""}-${retirementRequest?.comment || ""
                    }`}
                  ref={formRef}
                  readOnly={!!retirementRequest?.id && !isEditMode}
                  initialData={{
                    requestedDate: retirementRequest?.requestedDate || "",
                    effectiveDate: retirementRequest?.effectiveDate || "",
                    comment: retirementRequest?.comment || "",
                  }}
                />
              </div>

              <div className="bg-white rounded-lg px-6 shadow-sm p-4">
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

                      <table className="w-3/4 border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="w-1/4 text-left px-4 py-2 border-b">
                              Minor Account No
                            </th>
                            <th className="w-1/4 text-left px-4 py-2 border-b">
                              Holder Name
                            </th>
                            <th className="w-1/4 text-left px-4 py-2 border-b">
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

                        <table className="w-3/4 border border-gray-200 rounded-lg">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="w-1/4 text-left px-4 py-2 border-b">
                                Bank
                              </th>
                              <th className="w-1/4 text-left px-4 py-2 border-b">
                                Branch
                              </th>
                              <th className="w-1/4 text-left px-4 py-2 border-b">
                                Account Number
                              </th>

                              {/** Only show action column when the user can edit the bank details */}
                              {isEditMode && (
                                <th className="w-1/4 text-left px-4 py-2 border-b">Action</th>
                              )}
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

                                {isEditMode && (
                                  <td className="px-4 py-2 border-b">
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="bg-[#953002] text-white hover:bg-gray-100"
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

              <div className="bg-white rounded-lg px-6 shadow-sm p-4">
                <p className="text-xl font-bold text-[#953002] mb-4">
                  Supporting Documents
                </p>

                <DocumentUpload
                  requestNo={retirementRequest?.requestNo || null}
                  memberId={selectedMemberId}
                  requestStatus={retirementRequest?.status || "NEW"}
                  requestType="retirement-requests"
                  readOnly={isViewRequestMode && !!retirementRequest?.id && !isEditMode}
                />
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

      {approveModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white w-[450px] rounded-lg shadow-lg p-6 relative">
            <button
              type="button"
              onClick={() => setApproveModalOpen(false)}
              disabled={approvalAction === "approve"}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
              aria-label="Close modal"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-[#953002]">
              Approve Retirement Request
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Do you want to approve this retirement request?
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setApproveModalOpen(false)}
                disabled={approvalAction === "approve"}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={async () => {
                  await handleApprovalAction("approve");
                  setApproveModalOpen(false);
                }}
                disabled={approvalAction === "approve"}
                className="bg-[#953002] text-white hover:bg-[#672102] disabled:opacity-70"
              >
                {approvalAction === "approve" ? "Approving..." : "OK"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {rejectModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white w-[450px] rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-[#953002]">
              Reject Retirement Request
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Add a reject comment before rejecting this request.
            </p>

            <div className="mt-4 space-y-4">
              <textarea
                value={rejectComment}
                onChange={(event) => setRejectComment(event.target.value)}
                placeholder="Reject comment..."
                className="w-full min-h-[100px] rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]"
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setRejectModalOpen(false);
                    setRejectComment("");
                    setSaveError("");
                  }}
                  disabled={approvalAction === "reject"}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={() => handleApprovalAction("reject", rejectComment)}
                  disabled={!rejectComment.trim() || approvalAction === "reject"}
                  className="bg-[#953002] text-white hover:bg-[#672102] disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {approvalAction === "reject" ? "Rejecting..." : "Reject"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {openBankModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold text-[#953002] mb-4">
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

      {statusConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-[#953002]">
              Change Retirement Request Status
            </h3>

            <p className="text-sm text-gray-700 leading-relaxed">
              Change retirement request status to{" "}
              <span className="font-semibold text-gray-900">{statusConfirmModal.statusLabel}</span>?
              This action may update the member&apos;s profile status.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => setStatusConfirmModal({ isOpen: false, newStatus: "", statusLabel: "" })}
                className="bg-white text-black hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmChangeStatus}
                className="bg-[#953002] text-white hover:bg-[#672102]"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {openSubmitConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white w-[450px] rounded-lg shadow-lg p-6 relative">
            <button
              type="button"
              onClick={() => !isSubmitting && setOpenSubmitConfirm(false)}
              disabled={isSubmitting}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
              aria-label="Close modal"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-[#953002]">
              Submit Retirement Request
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              After submitting, this retirement request cannot be edited. Do you want to continue?
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpenSubmitConfirm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="bg-[#953002] text-white hover:bg-[#672102] disabled:opacity-70"
              >
                {isSubmitting ? "Submitting..." : "OK"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <SubmitSuccessModal
        open={openSubmitSuccess}
        title="Submitted for Approval"
        description="The retirement request has been submitted for approval and can no longer be edited."
        requestId={retirementRequest?.requestNo}
        onClose={() => setOpenSubmitSuccess(false)}
      />
    </>
  );
}
