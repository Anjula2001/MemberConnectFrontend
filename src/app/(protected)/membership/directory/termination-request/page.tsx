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
import MinorDisbursementSection, {
  type MinorDisbursementSectionRef,
  type SavedMinorDisbursement,
} from "@/src/components/ui/termination/minordisbursement";
import { apiClient } from "@/lib/api/client";
import { changeTerminationRequestStatus } from "@/lib/api/terminationRequests";
import { useAuth } from "@/lib/auth-context";
import {
  INACTIVE_RIGHTS_ROLES,
  TERMINATION_ENTRY_ROLES,
  hasRole,
} from "@/lib/permissions";

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
  minorDisbursements?: SavedMinorDisbursement[];
}

interface MemberDetails {
  memberId: string;
  fullName: string;
  nameWithInitials: string;
  nic: string;
  status?: string;
}

const LOCKED_STATUSES = ["SUBMITTED_FOR_APPROVAL", "APPROVED", "REJECTED", "ADDED_TO_APPROVAL_LIST"];

const TERMINATION_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  INCOMPLETE: "Incomplete",
  SUBMITTED_FOR_APPROVAL: "Submitted for Approval",
  ADDED_TO_APPROVAL_LIST: "Added to Termination Approval List",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  INACTIVE: "Inactive",
};

/**
 * The MMT04 status-change matrix (SRS 2.2.4), mirroring
 * TerminationService.ALLOWED_STATUS_CHANGES. This copy only decides what the
 * dropdown offers - the server enforces the same table and the Inactive rights
 * independently, so a stale or edited client cannot widen it.
 */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ["INACTIVE"],
  INCOMPLETE: ["NEW", "INACTIVE"],
  SUBMITTED_FOR_APPROVAL: ["NEW", "INACTIVE"],
  REJECTED: ["NEW", "INACTIVE"],
  INACTIVE: ["NEW"],
};

/**
 * apiClient already unwraps the server's {"message": ...} body into
 * Error.message, so these handlers show what the server actually objected to
 * ("Cannot submit. Mandatory documents are missing.") instead of a generic
 * failure the user cannot act on.
 */
const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const formatTerminationStatus = (status: string) =>
  TERMINATION_STATUS_LABELS[status] ?? status.replaceAll("_", " ");

export default function TerminationRequestPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const formRef = useRef<TerminationFormRef>(null);
  const minorDisbursementRef = useRef<MinorDisbursementSectionRef>(null);
  const pageMode = searchParams.get("mode") || "";

  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(pageMode === "edit");
  const [openModal, setOpenModal] = useState(false);
  const [openSubmitConfirm, setOpenSubmitConfirm] = useState(false);
  const [openSubmitSuccess, setOpenSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [minorSavingsAccounts, setMinorSavingsAccounts] = useState<MinorSavingsAccount[]>([]);
  const [saveError, setSaveError] = useState("");
  const [member, setMember] = useState<MemberDetails>({
    memberId: "",
    fullName: "",
    nameWithInitials: "",
    nic: "",
  });
  const [terminationRequest, setTerminationRequest] = useState<TerminationRequest | null>(null);
  const [validation, setValidation] = useState<TerminationValidation | null>(null);
  const [terminationReasons, setTerminationReasons] = useState<TerminationReason[]>([]);
  const [reasonsError, setReasonsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusTarget, setStatusTarget] = useState("");
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [statusChangeError, setStatusChangeError] = useState("");

  const requestStatusValue = terminationRequest?.status || "NEW";
  const isRequestLocked = terminationRequest?.status
    ? LOCKED_STATUSES.includes(terminationRequest.status)
    : false;
  const isEditMode = isEditing && !isRequestLocked;
  const isIncompleteStatus = terminationRequest?.status === "INCOMPLETE";
  const hasSavedRequest = !!terminationRequest?.id;
  const canModifyMember =
    !member.status ||
    member.status === "ACTIVE" ||
    member.status === "TERMINATION_REQUESTED";
  // MMT04: what this user may change the status to from here. Transitions that
  // set or clear Inactive are withheld from users without Inactive rights, so
  // the dropdown never offers an action the server will refuse.
  const canSetInactive = hasRole(user?.role, INACTIVE_RIGHTS_ROLES);
  const availableStatusTargets = (STATUS_TRANSITIONS[requestStatusValue] ?? []).filter(
    (target) =>
      canSetInactive || (target !== "INACTIVE" && requestStatusValue !== "INACTIVE")
  );
  const showStatusChange =
    hasSavedRequest && !isEditMode && availableStatusTargets.length > 0;

  // MMT01-MMT04 name the District Office System User as the actor. Head Office
  // can still open and read a request; it just cannot author one.
  const canEnterRequests = hasRole(user?.role, TERMINATION_ENTRY_ROLES);
  const showEditButton =
    canEnterRequests && hasSavedRequest && !isRequestLocked && !isEditMode;
  const showSaveButton = canEnterRequests && (!hasSavedRequest || isEditMode);
  const showWorkflowActions =
    canEnterRequests && hasSavedRequest && !isRequestLocked && !isEditMode;
  const isWorkflowBlockedByEdit = isEditMode;
  const isSubmitBlockedByLoans = validation ? !validation.canSubmit : true;

  // A saved request keeps the reason it was created with. Once that reason is
  // deactivated the master stops offering it, so it is merged back in here -
  // otherwise the <select> would match no option, render blank, and the next
  // save would silently replace the reason the request was approved under.
  const savedReasonId = terminationRequest?.terminationReasonId || "";
  const formReasons: TerminationReason[] =
    savedReasonId && !terminationReasons.some((reason) => reason.id === savedReasonId)
      ? [
          ...terminationReasons,
          {
            id: savedReasonId,
            name: `${terminationRequest?.terminationReason || "Unknown reason"} (inactive)`,
          },
        ]
      : terminationReasons;

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
        fetchTerminationRequests(),
      ]);
      setLoading(false);
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageMode, selectedMemberId]);

  // The Termination Reasons Master is the only source of dropdown options. On any
  // failure the list is left empty and an error is shown - never a stale local
  // copy, which would let a user pick a reason the server would then reject.
  const fetchTerminationReasons = async () => {
    try {
      const { data: reasons } = await apiClient.get<Array<{ id: string | number; name: string }>>(
        "/api/masters/termination-reasons"
      );

      // Ids arrive from the master as numbers but a <select> value is always a
      // string, so they are normalised once here rather than at each comparison.
      setTerminationReasons(
        reasons.map((reason) => ({
          id: String(reason.id),
          name: reason.name,
        }))
      );
      setReasonsError(
        reasons.length === 0 ? "No termination reasons are configured. Please contact an administrator." : ""
      );
    } catch (error) {
      console.error("Failed to fetch termination reasons:", error);
      setTerminationReasons([]);
      setReasonsError("Failed to load termination reasons. Please try again.");
    }
  };

  const fetchMember = async () => {
    try {
      const { data: memberData } = await apiClient.get<MemberDetails>(
        `/api/members/${encodeURIComponent(selectedMemberId)}`
      );
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
      // Older deployments only expose the retirement endpoint; fall back to it
      // rather than leaving the loan warnings blank.
      let validationData: TerminationValidation;
      try {
        ({ data: validationData } = await apiClient.get<TerminationValidation>(
          `/api/members/${encodeURIComponent(selectedMemberId)}/termination-validation`
        ));
      } catch {
        ({ data: validationData } = await apiClient.get<TerminationValidation>(
          `/api/members/${encodeURIComponent(selectedMemberId)}/retirement-validation`
        ));
      }
      setValidation(validationData);
    } catch (error) {
      console.error("Termination validation error:", error);
    }
  };

  const fetchMinorSavingsAccounts = async () => {
    try {
      const { data: accounts } = await apiClient.get<MinorSavingsAccount[]>(
        `/api/members/${encodeURIComponent(selectedMemberId)}/minor-savings-accounts`
      );
      setMinorSavingsAccounts(accounts);
    } catch (error) {
      console.error("Fetch minor savings accounts error:", error);
    }
  };

  const fetchTerminationRequests = async () => {
    try {
      const { data: requests } = await apiClient.get<TerminationRequest[]>(
        `/api/termination-requests/member/${encodeURIComponent(selectedMemberId)}`
      );

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
      const { data: updatedRequest } = await apiClient.put<TerminationRequest>(
        `/api/termination-requests/${encodeURIComponent(terminationRequest.requestNo ?? "")}/mark-incomplete`,
        { reason: trimmedReason }
      );
      setTerminationRequest(updatedRequest);
      setOpenModal(false);
      setSaveError("");
    } catch (error) {
      console.error("Mark incomplete error:", error);
      setSaveError(errorMessage(error, "Failed to mark request as incomplete."));
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

    const minorDisbursementRows = minorDisbursementRef.current?.getData() || [];

    const payload = {
      ...formData,
      minorDisbursements: minorDisbursementRows.map((row) => ({
        minorAccountNo: row.minorAccountNo,
        disbursementBankId: row.disbursementBankId ? Number(row.disbursementBankId) : null,
        disbursementBranchId: row.disbursementBranchId ? Number(row.disbursementBranchId) : null,
        disbursementAccountNo: row.disbursementAccountNo?.trim() || null,
      })),
    };

    try {
      const isUpdate = !!terminationRequest?.id && isEditMode;

      const { data: savedRequest } = isUpdate
        ? await apiClient.put<TerminationRequest>(
            `/api/termination-requests/${encodeURIComponent(terminationRequest!.requestNo ?? "")}`,
            payload
          )
        : await apiClient.post<TerminationRequest>(
            `/api/termination-requests/${encodeURIComponent(selectedMemberId)}`,
            payload
          );
      setTerminationRequest(savedRequest);
      setIsEditing(false);
      setSaveError("");
      await fetchMember();
    } catch (error) {
      console.error("Save request error:", error);
      setSaveError(errorMessage(error, "Failed to save termination request."));
    }
  };

  const handleSubmitForm = () => {
    setSaveError("");

    if (!terminationRequest?.id) {
      setSaveError("Please save termination request before submitting.");
      return;
    }

    if (minorSavingsAccounts.length > 0) {
      const rows = minorDisbursementRef.current?.getData() || [];
      const hasIncompleteRow = minorSavingsAccounts.some((account) => {
        const row = rows.find((item) => item.minorAccountNo === account.minorAccountNo);
        return (
          !row ||
          !row.disbursementBankId ||
          !row.disbursementBranchId ||
          !row.disbursementAccountNo.trim()
        );
      });

      if (hasIncompleteRow) {
        setSaveError(
          "Please provide complete disbursement bank details for every minor savings account before submitting."
        );
        return;
      }
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

      const { data: submittedRequest } = await apiClient.post<TerminationRequest>(
        `/api/termination-requests/${encodeURIComponent(terminationRequest.requestNo ?? "")}/submit`
      );
      setTerminationRequest(submittedRequest);
      setIsEditing(false);
      setOpenSubmitConfirm(false);
      setOpenSubmitSuccess(true);
    } catch (error) {
      console.error("Submit request error:", error);
      setSaveError(errorMessage(error, "Failed to submit termination request."));
      setOpenSubmitConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!statusTarget || !terminationRequest?.requestNo) return;

    try {
      setIsChangingStatus(true);
      setStatusChangeError("");

      const updated = await changeTerminationRequestStatus(
        terminationRequest.requestNo,
        statusTarget
      );
      setTerminationRequest(updated as TerminationRequest);
      setStatusTarget("");

      // The server moves the member too (Inactive -> Active, New ->
      // Termination Requested). Re-read it rather than guessing, so the header
      // and the Save gate reflect what was actually stored.
      await fetchMember();
    } catch (error) {
      console.error("Failed to change termination request status:", error);
      setStatusChangeError(errorMessage(error, "Failed to change the request status"));
    } finally {
      setIsChangingStatus(false);
    }
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

        <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-6 px-14 py-10">
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
                  Status: {formatTerminationStatus(requestStatus)}
                  {isIncompleteStatus &&
                    terminationRequest?.incompleteReason &&
                    ` (${terminationRequest.incompleteReason})`}
                </p>
              </div>

              {reasonsError && <p className="mt-2 text-sm text-red-500">{reasonsError}</p>}

              {saveError && <p className="mt-2 text-sm text-red-500">{saveError}</p>}

              {statusChangeError && (
                <p className="mt-2 text-sm text-red-500">{statusChangeError}</p>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {/* MMT04: change the request status within the SRS matrix. */}
              {showStatusChange && (
                <div className="flex items-center gap-2">
                  <select
                    value={statusTarget}
                    onChange={(event) => setStatusTarget(event.target.value)}
                    disabled={isChangingStatus}
                    aria-label="Change request status to"
                    className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Change status to...</option>
                    {availableStatusTargets.map((target) => (
                      <option key={target} value={target}>
                        {formatTerminationStatus(target)}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    onClick={handleChangeStatus}
                    disabled={!statusTarget || isChangingStatus}
                    className="border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isChangingStatus ? "Applying..." : "Apply"}
                  </Button>
                </div>
              )}

              {showEditButton && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                >
                  Edit
                </Button>
              )}

              {showSaveButton && (
                <Button
                  onClick={handleSave}
                  disabled={!canModifyMember}
                  className="bg-[#953002] text-white hover:bg-[#7a2702] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save
                </Button>
              )}

              {showWorkflowActions && (
                <>
                  <Button
                    onClick={() => setOpenModal(true)}
                    disabled={isWorkflowBlockedByEdit || isIncompleteStatus}
                    className="bg-[#D4183D] text-white hover:bg-[#b31334] disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="bg-[#953002] text-white hover:bg-[#7a2702] disabled:cursor-not-allowed disabled:opacity-50"
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
                  reasons={formReasons}
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
                <p className="mb-4 text-xl font-bold text-[#953002]">Minor Saving Disbursement</p>

                <MinorDisbursementSection
                  ref={minorDisbursementRef}
                  accounts={minorSavingsAccounts}
                  initialData={terminationRequest?.minorDisbursements}
                  readOnly={!!terminationRequest?.id && !isEditMode}
                />
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
        footerNote="Once submitted, this termination request cannot be edited."
        isLoading={isSubmitting}
        onClose={() => !isSubmitting && setOpenSubmitConfirm(false)}
        onConfirm={handleConfirmSubmit}
      />

      <SubmitSuccessModal
        open={openSubmitSuccess}
        requestId={terminationRequest?.requestNo}
        onClose={() => setOpenSubmitSuccess(false)}
      />
    </>
  );
}
