"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Info } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { MarkIncompleteModal } from "@/src/components/ui/grade5schoolarship/MarkIncomplete";
import { RejectRequestModal } from "@/src/components/ui/death-donation/RejectRequestModal";
import {
  SubmitConfirmationModal,
  SubmitSuccessModal,
} from "@/src/components/ui/termination/SubmitConfirmationModal";
import {
  deleteDeathDonationDocument,
  getDeathDonationDocumentDownloadUrl,
  getDeathDonationDocuments,
  getDeathDonationRequest,
  getDeathDonationRequestsByMember,
  approveDeathDonationRequest,
  markDeathDonationIncomplete,
  populateDeceasedMember,
  refreshDeathDonationRelatives,
  rejectDeathDonationRequest,
  saveDeathDonationRequest,
  submitDeathDonationRequest,
  updateDeathDonationRequest,
  uploadDeathDonationDocument,
  type DeathDonationDocument,
  type DeathDonationRelative,
  type DeathDonationRequest,
} from "@/lib/api/deathDonation";

const API_BASE_URL = "http://localhost:8080";
const TODAY = new Date().toISOString().split("T")[0];

const RELATIONSHIP_OPTIONS = [
  "Father",
  "Mother",
  "Spouse",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Grandfather",
  "Grandmother",
  "Other",
];

const DOCUMENT_TYPES = [
  { type: "DEATH_CERTIFICATE", label: "Death Certificate", mandatory: true },
  { type: "NIC_COPY", label: "NIC Copy", mandatory: true },
  { type: "OTHER", label: "Other Documents", mandatory: false },
];

const LOCKED_STATUSES = [
  "SUBMITTED_FOR_APPROVAL",
  "DISTRICT_COMMITTEE",
  "PD_COMMITTEE",
  "APPROVED",
  "REJECTED",
  "INACTIVE",
];

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  INCOMPLETE: "Incomplete",
  SUBMITTED_FOR_APPROVAL: "Submitted for Approval",
  DISTRICT_COMMITTEE: "District Committee",
  PD_COMMITTEE: "P&D Committee",
  P_AND_D_COMMITTEE: "P&D Committee",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  INACTIVE: "Inactive",
};

interface MemberDetails {
  memberId: string;
  fullName: string;
  nameWithInitials: string;
  nic: string;
  status?: string;
}

type RelativeRow = DeathDonationRelative;

function formatStatus(status: string) {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

function isOutsideAllowedRange(requestedDate: string, deceasedDate: string) {
  if (!requestedDate || !deceasedDate) return false;
  const requested = new Date(requestedDate);
  const deceased = new Date(deceasedDate);
  const limit = new Date(deceased);
  limit.setMonth(limit.getMonth() + 3);
  return requested > limit;
}

export default function DeathDonationRequestPage() {
  const searchParams = useSearchParams();
  const memberIdParam = searchParams.get("memberId") ?? "";
  const requestNoParam = searchParams.get("requestNo") ?? "";
  const pageMode = searchParams.get("mode") ?? "";
  const source = searchParams.get("source") ?? "";

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(pageMode === "edit" || !requestNoParam);
  const [saveError, setSaveError] = useState("");
  const [member, setMember] = useState<MemberDetails>({
    memberId: "",
    fullName: "",
    nameWithInitials: "",
    nic: "",
  });
  const [request, setRequest] = useState<DeathDonationRequest | null>(null);
  const [savedRequests, setSavedRequests] = useState<DeathDonationRequest[]>([]);
  const [documents, setDocuments] = useState<DeathDonationDocument[]>([]);
  const [relatives, setRelatives] = useState<RelativeRow[]>([]);
  const [newMemberId, setNewMemberId] = useState("");
  const [newRelationship, setNewRelationship] = useState("");
  const [openIncompleteModal, setOpenIncompleteModal] = useState(false);
  const [openApproveConfirm, setOpenApproveConfirm] = useState(false);
  const [openRejectModal, setOpenRejectModal] = useState(false);
  const [openApproveSuccess, setOpenApproveSuccess] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [openSubmitConfirm, setOpenSubmitConfirm] = useState(false);
  const [openSubmitSuccess, setOpenSubmitSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadingDocumentType, setUploadingDocumentType] = useState<string | null>(null);

  const [form, setForm] = useState({
    relationshipToDeceased: "",
    requestedDate: TODAY,
    deceasedMember: false,
    deceasedMemberId: "",
    deceasedName: "",
    maidenNameIfMarried: "",
    deceasedDate: "",
    deathCertificateNumber: "",
    deceasedPlaceOfWork: "",
    concernsIdentified: "",
  });

  const requestStatus = request?.status ?? "NEW";
  const requestDisplayId = request?.requestNo ?? "NEW";
  const isRequestLocked = LOCKED_STATUSES.includes(requestStatus);
  const isEditable = !isRequestLocked;
  const hasSavedRequest = !!request?.requestNo;
  const isEditMode = isEditing && isEditable;
  const isFormEditable = !hasSavedRequest || isEditMode;
  const isConcernsEditable = isRequestLocked || isFormEditable;
  const showEditButton = hasSavedRequest && isEditable && !isEditMode;
  const showSaveButton = (!hasSavedRequest || isEditMode) && isEditable;
  const showWorkflowActions = hasSavedRequest && isEditable && !isEditMode;
  const showApprovalActions =
    hasSavedRequest && requestStatus === "SUBMITTED_FOR_APPROVAL" && !isEditMode;
  const showSaveConcerns =
    isRequestLocked && requestStatus !== "SUBMITTED_FOR_APPROVAL";
  const pageTitle = !hasSavedRequest
    ? "Death Donation Request Entry"
    : isEditMode
      ? "Edit Death Donation Request"
      : "View Death Donation Request";
  const pageSubtitle = !hasSavedRequest
    ? "MMD01 - Create Death Donation Request"
    : isEditMode
      ? "MMD01 - Edit Death Donation Request"
      : "MMD02 - View Death Donation Request";
  const backHref =
    source === "death-donation"
      ? "/death-donation"
      : `/membership/directory/${member.memberId}`;
  const backLabel =
    source === "death-donation" ? "Back to Death Donation Requests" : "Back to Member Profile";
  const canModifyMember = member.status === "ACTIVE";
  const dateRangeWarning = useMemo(
    () => isOutsideAllowedRange(form.requestedDate, form.deceasedDate),
    [form.requestedDate, form.deceasedDate]
  );

  useEffect(() => {
    if (!memberIdParam) {
      setLoading(false);
      return;
    }

    const loadPage = async () => {
      setLoading(true);
      setSaveError("");

      try {
        const memberResponse = await fetch(`${API_BASE_URL}/api/members/${memberIdParam}`);
        if (!memberResponse.ok) throw new Error("Failed to load member");

        const memberData = await memberResponse.json();
        setMember({
          memberId: memberData.memberId,
          fullName: memberData.fullName,
          nameWithInitials: memberData.nameWithInitials,
          nic: memberData.nic,
          status: memberData.status,
        });

        const memberRequests = await getDeathDonationRequestsByMember(memberIdParam);
        setSavedRequests(memberRequests);

        if (requestNoParam) {
          await loadRequest(requestNoParam);
        } else {
          resetToNew();
        }
      } catch (error) {
        console.error("Load death donation page error:", error);
        setSaveError(error instanceof Error ? error.message : "Failed to load page data");
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [memberIdParam, requestNoParam]);

  useEffect(() => {
    if (!requestNoParam) {
      setIsEditing(true);
      return;
    }

    setIsEditing(pageMode === "edit");
  }, [pageMode, requestNoParam]);

  const resetToNew = () => {
    setIsEditing(true);
    setRequest(null);
    setRelatives([]);
    setDocuments([]);
    setForm({
      relationshipToDeceased: "",
      requestedDate: TODAY,
      deceasedMember: false,
      deceasedMemberId: "",
      deceasedName: "",
      maidenNameIfMarried: "",
      deceasedDate: "",
      deathCertificateNumber: "",
      deceasedPlaceOfWork: "",
      concernsIdentified: "",
    });
  };

  const loadRequest = async (requestNo: string, editMode = false) => {
    const loaded = await getDeathDonationRequest(requestNo);
    setRequest(loaded);
    setIsEditing(editMode || pageMode === "edit");
    setForm({
      relationshipToDeceased: loaded.relationshipToDeceased ?? "",
      requestedDate: loaded.requestedDate ?? TODAY,
      deceasedMember: loaded.deceasedMember ?? false,
      deceasedMemberId: loaded.deceasedMemberId ?? "",
      deceasedName: loaded.deceasedName ?? "",
      maidenNameIfMarried: loaded.maidenNameIfMarried ?? "",
      deceasedDate: loaded.deceasedDate ?? "",
      deathCertificateNumber: loaded.deathCertificateNumber ?? "",
      deceasedPlaceOfWork: loaded.deceasedPlaceOfWork ?? "",
      concernsIdentified: loaded.concernsIdentified ?? "",
    });
    setRelatives(loaded.relatives ?? []);
    const docs = await getDeathDonationDocuments(requestNo);
    setDocuments(docs);
  };

  const buildPayload = (): DeathDonationRequest => ({
    requestNo: request?.requestNo,
    memberId: member.memberId,
    relationshipToDeceased: form.relationshipToDeceased,
    requestedDate: form.requestedDate,
    deceasedMember: form.deceasedMember,
    deceasedMemberId: form.deceasedMember ? form.deceasedMemberId : undefined,
    deceasedName: form.deceasedName,
    maidenNameIfMarried: form.maidenNameIfMarried || undefined,
    deceasedDate: form.deceasedDate,
    deathCertificateNumber: form.deathCertificateNumber,
    deceasedPlaceOfWork: form.deceasedPlaceOfWork || undefined,
    concernsIdentified: form.concernsIdentified || undefined,
    relatives,
  });

  const handleSave = async () => {
    if (!canModifyMember) {
      setSaveError("Death donation is only available when the member status is Active.");
      return;
    }

    setSaveError("");
    setIsSaving(true);

    try {
      const payload = buildPayload();
      const saved = request?.requestNo
        ? await updateDeathDonationRequest(request.requestNo, payload)
        : await saveDeathDonationRequest(member.memberId, payload);

      setRequest(saved);
      setRelatives(saved.relatives ?? []);
      const docs = saved.requestNo ? await getDeathDonationDocuments(saved.requestNo) : [];
      setDocuments(docs);

      const refreshed = await getDeathDonationRequestsByMember(member.memberId);
      setSavedRequests(refreshed);
      setIsEditing(false);
    } catch (error) {
      console.error("Save death donation request error:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save request");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConcerns = async () => {
    if (!request?.requestNo) return;

    try {
      setIsSaving(true);
      setSaveError("");
      const updated = await updateDeathDonationRequest(request.requestNo, buildPayload());
      setRequest(updated);
    } catch (error) {
      console.error("Save concerns error:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save concerns");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!request?.requestNo) {
      setSaveError("Please save the death donation request before submitting.");
      return;
    }

    setSaveError("");
    setOpenSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if (!request?.requestNo) return;

    try {
      setIsSubmitting(true);
      setSaveError("");

      const payload = buildPayload();
      await updateDeathDonationRequest(request.requestNo, payload);
      const submitted = await submitDeathDonationRequest(request.requestNo);
      setRequest(submitted);
      setIsEditing(false);
      setOpenSubmitConfirm(false);
      setOpenSubmitSuccess(true);
    } catch (error) {
      console.error("Submit death donation request error:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to submit request");
      setOpenSubmitConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmIncomplete = async (reason: string) => {
    if (!request?.requestNo) {
      setSaveError("Please save the death donation request before marking incomplete.");
      setOpenIncompleteModal(false);
      return;
    }

    try {
      const updated = await markDeathDonationIncomplete(request.requestNo, reason);
      setRequest(updated);
      setIsEditing(true);
      setOpenIncompleteModal(false);
      setSaveError("");
    } catch (error) {
      console.error("Mark incomplete error:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to mark incomplete");
    }
  };

  const handleConfirmApprove = async () => {
    if (!request?.requestNo) return;

    try {
      setIsApproving(true);
      setSaveError("");
      const approved = await approveDeathDonationRequest(request.requestNo);
      setRequest(approved);
      setOpenApproveConfirm(false);
      setOpenApproveSuccess(true);
    } catch (error) {
      console.error("Approve death donation request error:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to approve request");
      setOpenApproveConfirm(false);
    } finally {
      setIsApproving(false);
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!request?.requestNo) return;

    try {
      setIsRejecting(true);
      setSaveError("");
      const rejected = await rejectDeathDonationRequest(request.requestNo, reason);
      setRequest(rejected);
      setOpenRejectModal(false);
    } catch (error) {
      console.error("Reject death donation request error:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to reject request");
    } finally {
      setIsRejecting(false);
    }
  };

  const handlePopulate = async () => {
    if (!form.deceasedMemberId.trim()) {
      setSaveError("Enter a valid deceased Member ID before populating.");
      return;
    }

    try {
      setIsPopulating(true);
      setSaveError("");
      const populated = await populateDeceasedMember(form.deceasedMemberId.trim());
      setForm((prev) => ({
        ...prev,
        deceasedName: populated.deceasedName,
        deceasedPlaceOfWork: populated.deceasedPlaceOfWork ?? "",
      }));
    } catch (error) {
      console.error("Populate deceased member error:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to populate deceased member");
    } finally {
      setIsPopulating(false);
    }
  };

  const handleRefreshRelatives = async () => {
    if (!form.deathCertificateNumber.trim()) {
      setSaveError("Enter Death Certificate Number before refreshing relatives.");
      return;
    }

    try {
      setIsRefreshing(true);
      setSaveError("");
      const autoRelatives = await refreshDeathDonationRelatives(
        form.deathCertificateNumber.trim(),
        request?.requestNo
      );

      setRelatives((prev) => {
        const manual = prev.filter((row) => !row.autoPopulated);
        const existingAutoIds = new Set(
          prev.filter((row) => row.autoPopulated).map((row) => row.relativeMemberId)
        );
        const mergedAuto = [
          ...prev.filter((row) => row.autoPopulated),
          ...autoRelatives.filter((row) => !existingAutoIds.has(row.relativeMemberId)),
        ];
        return [...mergedAuto, ...manual];
      });
    } catch (error) {
      console.error("Refresh relatives error:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to refresh relatives");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddRelative = () => {
    if (!newMemberId.trim() || !newRelationship) {
      setSaveError("Enter member ID and relationship to add a relative.");
      return;
    }

    if (relatives.some((row) => row.relativeMemberId === newMemberId.trim())) {
      setSaveError("This member is already in the relatives list.");
      return;
    }

    setRelatives([
      ...relatives,
      {
        relativeMemberId: newMemberId.trim(),
        relationshipToDeceased: newRelationship,
        autoPopulated: false,
      },
    ]);
    setNewMemberId("");
    setNewRelationship("");
    setSaveError("");
  };

  const handleRemoveRelative = (index: number) => {
    const row = relatives[index];
    if (row.autoPopulated) return;
    setRelatives(relatives.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleUploadDocument = async (documentType: string, file: File) => {
    if (!request?.requestNo) {
      setSaveError("Please save the request before uploading documents.");
      return;
    }

    try {
      setSaveError("");
      setUploadingDocumentType(documentType);
      await uploadDeathDonationDocument(request.requestNo, documentType, file);
      const docs = await getDeathDonationDocuments(request.requestNo);
      setDocuments(docs);
    } catch (error) {
      console.error("Upload document error:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to upload document");
    } finally {
      setUploadingDocumentType(null);
    }
  };

  const handleDeleteDocument = async (documentId?: number) => {
    if (!documentId) return;

    try {
      setSaveError("");
      await deleteDeathDonationDocument(documentId);
      if (request?.requestNo) {
        const docs = await getDeathDonationDocuments(request.requestNo);
        setDocuments(docs);
      }
    } catch (error) {
      console.error("Delete document error:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to delete document");
    }
  };

  const getDocumentsForType = (documentType: string) =>
    documents.filter((doc) => doc.documentType === documentType);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-neutral-500">
        Loading death donation request...
      </div>
    );
  }

  if (!memberIdParam) {
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
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-[#9d3602]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-6 px-14 py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-bold text-[#953002]">{pageTitle}</p>
              <p className="text-sm text-gray-500">{pageSubtitle}</p>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="inline-block rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  Member: {member.fullName} ({member.memberId})
                </div>
                <div className="inline-block rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  Request ID: {requestDisplayId}
                </div>
                <p className="text-sm font-semibold text-blue-600">
                  Status: {formatStatus(requestStatus)}
                  {requestStatus === "INCOMPLETE" && request?.incompleteReason
                    ? ` (${request.incompleteReason})`
                    : ""}
                  {requestStatus === "REJECTED" && request?.rejectReason
                    ? ` (${request.rejectReason})`
                    : ""}
                </p>
              </div>

              {saveError && <p className="mt-2 text-sm text-red-500">{saveError}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
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
                  disabled={!canModifyMember || isSaving}
                  className="bg-[#953002] text-white hover:bg-[#7a2702] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              )}

              {showWorkflowActions && (
                <>
                  <Button
                    onClick={() => setOpenIncompleteModal(true)}
                    disabled={!request?.requestNo}
                    className="bg-[#D4183D] text-white hover:bg-[#b31334] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Incomplete
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!request?.requestNo || isSubmitting}
                    className="bg-[#953002] text-white hover:bg-[#7a2702] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Submit
                  </Button>
                </>
              )}

              {showApprovalActions && (
                <>
                  <Button
                    onClick={() => setOpenRejectModal(true)}
                    disabled={isRejecting}
                    className="bg-[#D4183D] text-white hover:bg-[#b31334] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => setOpenApproveConfirm(true)}
                    disabled={isApproving}
                    className="bg-green-700 text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Approve
                  </Button>
                </>
              )}

              {showSaveConcerns && (
                <Button
                  onClick={handleSaveConcerns}
                  disabled={isSaving}
                  className="bg-[#953002] text-white hover:bg-[#7a2702] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Concerns"}
                </Button>
              )}
            </div>
          </div>

          {!canModifyMember && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Death donation is only available when the member status is Active.
              </p>
              <p className="mt-1 text-sm text-amber-700">
                Current member status: {member.status || "Unknown"}
              </p>
            </div>
          )}

          {savedRequests.length > 0 && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Open Saved Request
              </label>
              <select
                className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={request?.requestNo ?? ""}
                onChange={async (event) => {
                  const value = event.target.value;
                  if (!value) {
                    resetToNew();
                    return;
                  }
                  await loadRequest(value);
                }}
              >
                <option value="">Create New Request</option>
                {savedRequests.map((saved) => (
                  <option key={saved.requestNo} value={saved.requestNo}>
                    {saved.requestNo} - {formatStatus(saved.status ?? "NEW")} -{" "}
                    {saved.deceasedName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-6 rounded-lg border border-gray-200 bg-white px-6 py-5">
            <h2 className="mb-4 text-lg font-bold text-[#953002]">Member Details</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className="mb-1 block font-medium">Member ID</label>
                <Input value={member.memberId} readOnly className="cursor-not-allowed bg-gray-50" />
              </div>
              <div>
                <label className="mb-1 block font-medium">Surname with Initials</label>
                <Input
                  value={member.nameWithInitials}
                  readOnly
                  className="cursor-not-allowed bg-gray-50"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium">NIC Number</label>
                <Input value={member.nic} readOnly className="cursor-not-allowed bg-gray-50" />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-[#953002]">Request Information</h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium">
                  Relationship to the Deceased <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.relationshipToDeceased}
                  disabled={!isFormEditable}
                  onChange={(e) =>
                    setForm({ ...form, relationshipToDeceased: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                >
                  <option value="">Select relationship</option>
                  {RELATIONSHIP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-medium">
                  Requested Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  max={TODAY}
                  disabled={!isFormEditable}
                  value={form.requestedDate}
                  onChange={(e) => setForm({ ...form, requestedDate: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium">
                  Is the Deceased a Member <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.deceasedMember ? "YES" : "NO"}
                  disabled={!isFormEditable}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      deceasedMember: e.target.value === "YES",
                      deceasedMemberId: e.target.value === "YES" ? form.deceasedMemberId : "",
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                >
                  <option value="NO">No</option>
                  <option value="YES">Yes</option>
                </select>
              </div>

              {form.deceasedMember && (
                <div>
                  <label className="mb-1 block font-medium">
                    Deceased Member ID <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={form.deceasedMemberId}
                      disabled={!isFormEditable}
                      onChange={(e) =>
                        setForm({ ...form, deceasedMemberId: e.target.value })
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!isFormEditable || isPopulating}
                      onClick={handlePopulate}
                    >
                      {isPopulating ? "..." : "Populate"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="mb-1 block font-medium">
                  Name of the Deceased <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.deceasedName}
                  disabled={!isFormEditable}
                  onChange={(e) => setForm({ ...form, deceasedName: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium">Maiden Name if Married</label>
                <Input
                  value={form.maidenNameIfMarried}
                  disabled={!isFormEditable}
                  onChange={(e) =>
                    setForm({ ...form, maidenNameIfMarried: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block font-medium">
                  Deceased Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  max={TODAY}
                  disabled={!isFormEditable}
                  value={form.deceasedDate}
                  onChange={(e) => setForm({ ...form, deceasedDate: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium">
                  Death Certificate Number <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.deathCertificateNumber}
                  disabled={!isFormEditable}
                  onChange={(e) =>
                    setForm({ ...form, deathCertificateNumber: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block font-medium">Member&apos;s Current Place of Work</label>
                <Input
                  value={form.deceasedPlaceOfWork}
                  disabled={!isFormEditable}
                  onChange={(e) =>
                    setForm({ ...form, deceasedPlaceOfWork: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#953002]">
                Members who are close relatives to the Deceased
              </h2>
              <Button
                type="button"
                variant="outline"
                disabled={!isFormEditable || isRefreshing}
                onClick={handleRefreshRelatives}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            {isFormEditable && (
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Input
                  placeholder="Member ID"
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                />
                <select
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">Relationship</option>
                  {RELATIONSHIP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <Button type="button" onClick={handleAddRelative}>
                  Add New
                </Button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border-b px-4 py-2 text-left">Member ID</th>
                    <th className="border-b px-4 py-2 text-left">Relationship</th>
                    <th className="border-b px-4 py-2 text-left">Source</th>
                    <th className="border-b px-4 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {relatives.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                        No close relatives added yet.
                      </td>
                    </tr>
                  ) : (
                    relatives.map((relative, index) => (
                      <tr key={`${relative.relativeMemberId}-${index}`}>
                        <td className="border-b px-4 py-2">
                          <div className="flex items-center gap-2">
                            {relative.autoPopulated && (
                              <Info className="h-4 w-4 text-amber-600" aria-label="Auto populated" />
                            )}
                            {relative.relativeMemberId}
                          </div>
                        </td>
                        <td className="border-b px-4 py-2">
                          {relative.relationshipToDeceased}
                        </td>
                        <td className="border-b px-4 py-2">
                          {relative.autoPopulated ? "Auto" : "Manual"}
                        </td>
                        <td className="border-b px-4 py-2">
                          {!relative.autoPopulated && isFormEditable && (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveRelative(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-[#953002]">Concerns Identified</h2>

            {dateRangeWarning && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                  <p className="text-sm text-amber-800">
                    Warning: Requested Date is more than 3 months after the Deceased Date. You may
                    still submit this request, but please document any concerns below.
                  </p>
                </div>
              </div>
            )}

            <textarea
              value={form.concernsIdentified}
              onChange={(e) => setForm({ ...form, concernsIdentified: e.target.value })}
              disabled={!isConcernsEditable}
              className="min-h-[100px] w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
              placeholder="Enter any concerns identified before proceeding..."
            />
          </div>

          <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-[#953002]">Required Documents</h2>

            <div className="space-y-5">
              {DOCUMENT_TYPES.map((docType) => {
                const files = getDocumentsForType(docType.type);
                return (
                  <div key={docType.type} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{docType.label}</span>
                        {docType.mandatory && (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                            Mandatory
                          </Badge>
                        )}
                      </div>

                      {isFormEditable && (
                        <label
                          className={`rounded-md px-3 py-1 text-sm text-white ${
                            uploadingDocumentType === docType.type
                              ? "cursor-not-allowed bg-[#953002]/60"
                              : "cursor-pointer bg-[#953002] hover:bg-[#7a2702]"
                          }`}
                        >
                          {uploadingDocumentType === docType.type ? "Uploading..." : "Add"}
                          <input
                            type="file"
                            className="hidden"
                            disabled={uploadingDocumentType === docType.type}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleUploadDocument(docType.type, file);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {files.length > 0 ? (
                      <div className="space-y-2">
                        {files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
                          >
                            <div>
                              <a
                                href={getDeathDonationDocumentDownloadUrl(file.id!)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-medium text-[#953002] hover:underline"
                              >
                                {file.fileName}
                              </a>
                              <p className="text-xs text-gray-500">
                                {file.fileType} • {file.uploadedAt}
                              </p>
                            </div>
                            {isFormEditable && (
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteDocument(file.id)}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No files uploaded</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <MarkIncompleteModal
        open={openIncompleteModal}
        onClose={() => setOpenIncompleteModal(false)}
        onConfirm={handleConfirmIncomplete}
      />

      <SubmitConfirmationModal
        open={openSubmitConfirm}
        title="Submit Death Donation Request"
        description="Please confirm that all mandatory information and supporting documents are complete before submitting this request for approval."
        confirmLabel="Submit for Approval"
        footerNote="Once submitted, this death donation request cannot be edited until marked incomplete."
        isLoading={isSubmitting}
        onClose={() => !isSubmitting && setOpenSubmitConfirm(false)}
        onConfirm={handleConfirmSubmit}
      />

      <SubmitSuccessModal
        open={openSubmitSuccess}
        requestId={request?.requestNo}
        title="Request Submitted"
        description="The death donation request has been submitted for approval and can no longer be edited."
        onClose={() => setOpenSubmitSuccess(false)}
      />

      <SubmitConfirmationModal
        open={openApproveConfirm}
        title="Approve Death Donation Request"
        description="Are you sure you want to approve this death donation request?"
        confirmLabel="Approve"
        footerNote="Once approved, this request will be marked as Approved."
        isLoading={isApproving}
        onClose={() => !isApproving && setOpenApproveConfirm(false)}
        onConfirm={handleConfirmApprove}
      />

      <SubmitSuccessModal
        open={openApproveSuccess}
        requestId={request?.requestNo}
        title="Request Approved"
        description="The death donation request has been approved."
        onClose={() => setOpenApproveSuccess(false)}
      />

      <RejectRequestModal
        open={openRejectModal}
        onClose={() => !isRejecting && setOpenRejectModal(false)}
        onConfirm={handleConfirmReject}
        isLoading={isRejecting}
      />
    </>
  );
}
