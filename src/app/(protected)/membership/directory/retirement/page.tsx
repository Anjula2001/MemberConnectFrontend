"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import RetirementForm, { RetirementFormRef } from "@/src/components/ui/retirement/retirementform";
import DocumentUpload from "@/src/components/ui/documentupload";
import { MarkIncompleteModal } from "@/src/components/ui/grade5schoolarship/MarkIncomplete";
import AddBankDetails, { AddBankDetailsRef } from "@/src/components/ui/retirement/addbankdetails";
import { SubmitSuccessModal } from "@/src/components/ui/termination/SubmitConfirmationModal";
import AccessRestricted from "@/src/components/AccessRestricted";
import { useAuth } from "@/lib/auth-context";
import { canAccessRetirement, hasRetPermission } from "@/lib/permissions";
import {
  approveRetirementRequest,
  changeRetirementRequestStatus,
  getMemberSummary,
  getMembers,
  getRetirementRequestById,
  getRetirementRequestsByMember,
  getRetirementValidation,
  markRetirementRequestIncomplete,
  rejectRetirementRequest,
  saveRetirementRequest,
  sendRetirementToFinance,
  submitRetirementRequest,
  updateRetirementRequest,
  getRetirementRequiredDocuments,
} from "@/lib/api/retirementRequests";
import { getMemberBankAccounts, getMinorSavingsAccounts } from "@/lib/api/memberDeath";


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
  // The member's own status. The request stays APPROVED after the Finance Module
  // handoff — it is this that becomes RETIRED.
  memberStatus?: string;
}

interface MemberDetails {
  memberId: string;
  fullName: string;
  nameWithInitials: string;
  nic: string;
}

// apiClient rejects with a plain Error carrying the backend's message, and turns a 403
// into "You do not have permission to perform this action." — so every catch below just
// needs to surface that text.
const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const LOCKED_STATUSES = [
  "SUBMITTED_FOR_APPROVAL",
  "APPROVED",
  "REJECTED",
];

export default function RetirementPage() {
  const { user } = useAuth();
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
  const [isSendingToFinance, setIsSendingToFinance] = useState(false);

  // UX only — the backend enforces the same matrix in RolePermissions.java, and that
  // copy is the one that counts.
  const canCreateRequest = hasRetPermission(user?.role, "RET_REQUEST_CREATE");
  const canEditRequest = hasRetPermission(user?.role, "RET_REQUEST_EDIT");
  const canSubmitRequest = hasRetPermission(user?.role, "RET_REQUEST_SUBMIT");
  const canMarkIncomplete = hasRetPermission(user?.role, "RET_REQUEST_INCOMPLETE");
  const canApproveRequest = hasRetPermission(user?.role, "RET_REQUEST_APPROVE");

  const isRequestLocked = retirementRequest?.status
    ? LOCKED_STATUSES.includes(retirementRequest.status)
    : false;

  const isEditMode = isEditing && !isRequestLocked;
  const isIncompleteStatus = retirementRequest?.status === "INCOMPLETE";
  const showApprovalActions =
    retirementRequest?.status === "SUBMITTED_FOR_APPROVAL" &&
    !isEditMode &&
    canApproveRequest;

  // MMT17 — an approved retirement waiting on the Finance Module. Once Finance is
  // done the member is RETIRED and there is nothing left to send.
  const showSendToFinance =
    retirementRequest?.status === "APPROVED" &&
    retirementRequest?.memberStatus === "RETIREMENT_APPROVED" &&
    !isEditMode &&
    canApproveRequest;
  // A user who cannot approve still must not see the create/edit buttons on a submitted
  // request — hiding them depends on the status, not on who is looking.
  const hideRequestEditActions =
    retirementRequest?.status === "SUBMITTED_FOR_APPROVAL" && !isEditMode;
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

  // Mirrors requiredPermissionForStatusChange in RetirementRequestController:
  //   -> INACTIVE                          SRS 3.2.4 "the user needs Inactive rights".
  //   SUBMITTED/REJECTED/INACTIVE -> NEW    SRS 3.2.1 "the rights to change the status";
  //                                         reopens a request that is out of the office's hands.
  //   INCOMPLETE -> NEW                     the everyday fix-and-carry-on path, ordinary edit rights.
  const viewModeStatusActions = (
    retirementRequest?.status
      ? VIEW_MODE_STATUS_TRANSITIONS[retirementRequest.status] || []
      : []
  ).filter((action) => {
    if (action.status === "INACTIVE") {
      return hasRetPermission(user?.role, "RET_REQUEST_SET_INACTIVE");
    }
    if (action.status === "NEW" && retirementRequest?.status !== "INCOMPLETE") {
      return hasRetPermission(user?.role, "RET_REQUEST_RETURN_TO_NEW");
    }
    return canEditRequest;
  });

  // A closed request — approved, rejected or inactive — is finished with Save,
  // Incomplete and Submit. An approved one is only waiting on the Finance Module; a
  // rejected or inactive one is revived through Return to New / Reopen, not re-saved
  // or resubmitted from here. Showing those buttons, even greyed out, implies a step
  // that no longer exists.
  const isClosedRequest =
    retirementRequest?.status === "APPROVED" ||
    retirementRequest?.status === "REJECTED" ||
    retirementRequest?.status === "INACTIVE";

  // The status dropdown normally belongs to view mode. A closed request is the
  // exception: rejecting or deactivating a request puts the member back to ACTIVE, so
  // the office opens the create page for them again and lands on that old request.
  // Changing its status is the only thing to do there, so the dropdown has to follow
  // the request rather than the page mode.
  const showViewModeStatusActions =
    !!retirementRequest?.id &&
    !isEditMode &&
    !isCurrentSessionSaved &&
    (isViewRequestMode || isClosedRequest) &&
    viewModeStatusActions.length > 0;

  const showDisabledRequestActions =
    !!retirementRequest?.id &&
    !isEditMode &&
    !isCurrentSessionSaved &&
    isViewRequestMode &&
    !isClosedRequest &&
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
          const members = await getMembers();
          const activeMember = members.find((m) => m.status === "ACTIVE" || m.status === "active");
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
      const memberData = await getMemberSummary(selectedMemberId);

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
      setValidation(await getRetirementValidation(selectedMemberId));
    } catch (error) {
      console.error("Retirement validation error:", error);
    }
  };

  // Loads minor savings accounts linked to the selected member.
  const fetchMinorSavingsAccounts = async () => {
    try {
      setMinorSavingsAccounts(await getMinorSavingsAccounts(selectedMemberId));
    } catch (error) {
      console.error("Fetch minor savings accounts error:", error);
    }
  };

  // Loads disbursement bank account details already saved for the member.
  const fetchMemberBankAccounts = async () => {
    try {
      setBankAccounts(await getMemberBankAccounts(selectedMemberId));
    } catch (error) {
      console.error("Fetch member bank accounts error:", error);
    }
  };

  // Loads the existing retirement request for the selected member.
  const fetchRetirementRequests = async () => {
    try {
      if (requestId) {
        setRetirementRequest(
          (await getRetirementRequestById(requestId)) as RetirementRequest
        );
      } else {
        const requests = (await getRetirementRequestsByMember(
          selectedMemberId
        )) as RetirementRequest[];

        if (requests.length > 0) {
          setRetirementRequest(requests[0]);
        }
      }

      setIsCurrentSessionSaved(false);
    } catch (error) {
      console.error("Fetch retirement request error:", error);
      setSaveError(errorMessage(error, "Failed to fetch retirement request"));
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
      const updatedRequest = (await markRetirementRequestIncomplete(
        retirementRequest.requestNo!,
        trimmedReason
      )) as RetirementRequest;

      setRetirementRequest(updatedRequest);
      setOpenModal(false);
      setSaveError("");
    } catch (error) {
      console.error("Mark incomplete error:", error);
      setSaveError(errorMessage(error, "Failed to mark request as incomplete."));
    }
  };

  // Validates and saves the retirement request form.
  const handleSave = async () => {
    const formData = await formRef.current?.validateAndGetData();

    if (!formData) return;

    setSaveError("");

    try {
      const isUpdate = !!retirementRequest?.id && isEditMode;

      const savedRequest = (isUpdate
        ? await updateRetirementRequest(retirementRequest.requestNo!, formData)
        : await saveRetirementRequest(selectedMemberId, formData)) as RetirementRequest;

      setRetirementRequest(savedRequest);
      setIsEditing(false);
      setIsCurrentSessionSaved(true);
      setSaveError("");
    } catch (error) {
      console.error("Save request error:", error);
      setSaveError(errorMessage(error, "Failed to save retirement request."));
    }
  };

  // Validates that all mandatory documents are uploaded before submitting.
  const validateMandatoryDocuments = async (): Promise<boolean> => {
    if (!retirementRequest?.requestNo) {
      setSaveError("Please save retirement request before submitting.");
      return false;
    }

    try {
      const docs = await getRetirementRequiredDocuments(
        retirementRequest.requestNo,
        selectedMemberId
      );
      const hasMissingMandatory = docs.some((doc) => doc.mandatory && !doc.uploaded);

      if (hasMissingMandatory) {
        setSaveError("Cannot submit. Mandatory documents are missing.");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Document validation error:", error);
      setSaveError(errorMessage(error, "Failed to validate mandatory documents."));
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

      const submittedRequest = (await submitRetirementRequest(
        retirementRequest.requestNo
      )) as RetirementRequest;

      setRetirementRequest(submittedRequest);
      setSaveError("");
      setOpenSubmitConfirm(false);
      setOpenSubmitSuccess(true);
    } catch (error) {
      console.error("Submit request error:", error);
      setSaveError(errorMessage(error, "Failed to submit retirement request."));
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
      const updatedRequest = (await changeRetirementRequestStatus(
        retirementRequest.requestNo,
        newStatus
      )) as RetirementRequest;

      setRetirementRequest(updatedRequest);
      setSaveError("");

      // Returning a request to New exists to let the office fix it and send it back
      // up, so the form opens ready to edit rather than making the user hunt for the
      // Edit button. Any other status change leaves the mode alone.
      if (newStatus === "NEW") {
        setIsEditing(true);
        setIsCurrentSessionSaved(false);
      }

      await fetchMember();
    } catch (error) {
      console.error("Change status error:", error);
      setSaveError(errorMessage(error, "Failed to change retirement request status."));
    }
  };

  // MMT17 — hand this approved retirement to the Finance Module. On success the
  // member becomes RETIRED and the button drops away; the request stays APPROVED.
  const handleSendToFinance = async () => {
    if (!retirementRequest?.requestNo) return;

    setSaveError("");
    setIsSendingToFinance(true);

    try {
      const updatedRequest = (await sendRetirementToFinance(
        retirementRequest.requestNo
      )) as RetirementRequest;

      setRetirementRequest(updatedRequest);
      await fetchMember();
    } catch (error) {
      console.error("Send to Finance error:", error);
      setSaveError(
        errorMessage(error, "Failed to send the retirement to the Finance Module.")
      );
    } finally {
      setIsSendingToFinance(false);
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

      const updatedRequest = (action === "approve"
        ? await approveRetirementRequest(retirementRequest.requestNo!)
        : await rejectRetirementRequest(
          retirementRequest.requestNo!,
          comment.trim()
        )) as RetirementRequest;

      setRetirementRequest(updatedRequest);
      await fetchMember();
      setSaveError("");
      setRejectModalOpen(false);
      setRejectComment("");
    } catch (error) {
      console.error(`${action} request error:`, error);
      setSaveError(errorMessage(error, `Failed to ${action} retirement request.`));
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

  // Reached from the Member Directory, which more roles can open than may work with
  // retirements — so this screen needs its own guard rather than inheriting the
  // directory's.
  if (user && !canAccessRetirement(user.role)) {
    return (
      <AccessRestricted
        message="Retirement requests are restricted to District Office, Head Office and Accounts personnel."
        fallbackHref="/membership/directory"
        fallbackLabel="Back to Member Directory"
      />
    );
  }

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
                !isCurrentSessionSaved &&
                canEditRequest && (
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

              {/* MMT17 — an approved retirement is released to the Finance Module from here. */}
              {showSendToFinance && (
                <Button
                  onClick={handleSendToFinance}
                  disabled={isSendingToFinance}
                  title="Send this approved retirement to the Finance Module"
                  className="bg-[#953002] text-white hover:bg-[#7a2702] disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {isSendingToFinance ? "Sending..." : "Send to Finance"}
                </Button>
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
                  {canMarkIncomplete && (
                    <Button
                      type="button"
                      disabled
                      className="bg-[#D4183D] text-white disabled:bg-[#D4183D] hover:bg-[#b31334] disabled:text-white disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      Mark Incomplete
                    </Button>
                  )}

                  {canSubmitRequest && (
                    <Button
                      type="button"
                      disabled
                      className="bg-[#953002] text-white disabled:bg-[#953002]  hover:bg-[#7a2702] disabled:text-white disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      Submit for Approval
                    </Button>
                  )}
                </>
              )}

              {/*  */}
              {showRequestEditActions && (
                <>
                  {/* Saving an existing record goes through the update endpoint, so it
                      needs edit rights; a first save needs create rights.

                      Hidden once saved, and on a request the Board has already decided.
                      Deliberately NOT hidden in edit mode: returning a request to New
                      opens the form for editing, and an edit that cannot be saved is
                      not an edit. */}
                  {!isCurrentSessionSaved &&
                    !isClosedRequest &&
                    (retirementRequest?.id ? canEditRequest : canCreateRequest) && (
                    <Button
                      onClick={handleSave}
                      className="bg-white text-black hover:bg-gray-100"
                    >
                      Save
                    </Button>
                  )}

                  {!isClosedRequest && canMarkIncomplete && (
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
                  )}

                  {!isClosedRequest && canSubmitRequest && (
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
                  )}
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
