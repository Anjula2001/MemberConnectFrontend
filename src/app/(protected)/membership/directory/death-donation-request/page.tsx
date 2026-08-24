"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Info, Pencil } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { MarkIncompleteModal } from "@/src/components/ui/grade5schoolarship/MarkIncomplete";
import { RejectRequestModal } from "@/src/components/ui/death-donation/RejectRequestModal";
import {
  SubmitConfirmationModal,
  SubmitSuccessModal,
} from "@/src/components/ui/termination/SubmitConfirmationModal";
import {
  changeDeathDonationStatus,
  deleteDeathDonationDocument,
  downloadDeathDonationDocument,
  forwardDeathDonationToDistrictCommittee,
  forwardDeathDonationToPdCommittee,
  getDeathDonationDocuments,
  getDeathDonationRelationships,
  getDeathDonationRequiredDocuments,
  updateDeathDonationConcerns,
  getDeathDonationRequest,
  getDeathDonationRequestsByMember,
  approveDeathDonationRequest,
  markDeathDonationIncomplete,
  populateDeceasedMember,
  refreshDeathDonationEntitlement,
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
import { useAuth } from "@/lib/auth-context";
import {
  DEATH_DONATION_AMOUNT_EDIT_ROLES,
  DEATH_DONATION_ENTRY_ROLES,
  DEATH_DONATION_LEVEL_LABEL,
  DEATH_DONATION_NEXT_LEVEL,
  DEATH_DONATION_VIEW_ROLES,
  canDecideDeathDonationAt,
  canForwardDeathDonationAt,
  hasRole,
} from "@/lib/permissions";

// Was hardcoded to localhost, which meant the member lookup below pointed at a
// developer machine in every other environment.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const TODAY = new Date().toISOString().split("T")[0];

// Fallback only. The list proper comes from the Death Donation Relationship
// master (MMD01) via getDeathDonationRelationships(); these values are what the
// screen offers if that call fails, and match what the master seeds.
const FALLBACK_RELATIONSHIP_OPTIONS = [
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

// Fallback only, used before a request has been saved (the master lookup is
// scoped to a saved request). The live list comes from the Supporting Documents
// master via getDeathDonationRequiredDocuments (MMD01).
const FALLBACK_DOCUMENT_TYPES = [
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

/**
 * A local approximation of the eligible-period rule, used only while the form is
 * being filled in and there is no saved request to ask the server about.
 *
 * The authoritative answer is request.eligiblePeriodWarning, computed from the
 * DONATION_ELIGIBLE_PERIOD_DAYS configuration value. This three-month guess is
 * deliberately not shown once a saved request carries the real one.
 */
function isOutsideAllowedRange(requestedDate: string, deceasedDate: string) {
  if (!requestedDate || !deceasedDate) return false;
  const requested = new Date(requestedDate);
  const deceased = new Date(deceasedDate);
  const limit = new Date(deceased);
  limit.setMonth(limit.getMonth() + 3);
  return requested > limit;
}

type FormValues = {
  relationshipToDeceased: string;
  requestedDate: string;
  deceasedMember: boolean;
  deceasedMemberId: string;
  deceasedName: string;
  maidenNameIfMarried: string;
  deceasedDate: string;
  deathCertificateNumber: string;
  deceasedPlaceOfWork: string;
  concernsIdentified: string;
};

/**
 * The same required-field rules DeathDonationService.validateRequestDto applies,
 * checked before the request leaves the browser.
 *
 * The server is still the authority - this does not replace it. It exists so a
 * missed field is pointed at in place, instead of costing a round trip and
 * coming back as a bare sentence that names no field. Keep the two in step: a
 * rule added on the server but not here just reverts to the old behaviour.
 */
function validateDeathDonationForm(form: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.relationshipToDeceased.trim()) {
    errors.relationshipToDeceased = "Relationship to the deceased is required";
  }

  if (!form.requestedDate.trim()) {
    errors.requestedDate = "Requested Date is required";
  } else if (form.requestedDate > TODAY) {
    errors.requestedDate = "Requested Date cannot be a future date";
  }

  if (form.deceasedMember && !form.deceasedMemberId.trim()) {
    errors.deceasedMemberId = "Deceased Member ID is required when the deceased is a member";
  }

  if (!form.deceasedName.trim()) {
    errors.deceasedName = "Name of the deceased is required";
  }

  if (!form.deceasedDate.trim()) {
    errors.deceasedDate = "Deceased Date is required";
  }

  if (!form.deathCertificateNumber.trim()) {
    errors.deathCertificateNumber = "Death Certificate Number is required";
  }

  return errors;
}

/** Inline message under the field it belongs to. */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-600">{message}</p>;
}

/** Money for display; the server owns the arithmetic. */
function formatAmount(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

  const [relationshipOptions, setRelationshipOptions] = useState<string[]>(
    FALLBACK_RELATIONSHIP_OPTIONS
  );
  const [documentTypes, setDocumentTypes] = useState(FALLBACK_DOCUMENT_TYPES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isForwarding, setIsForwarding] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isRefreshingDonation, setIsRefreshingDonation] = useState(false);
  const [donationInputs, setDonationInputs] = useState({
    monthsRemitted: "",
    receivedPast12Months: "",
    creditedToSpecialFixedAccount: "",
  });

  const { user } = useAuth();
  const role = user?.role;
  const canViewRequests = hasRole(role, DEATH_DONATION_VIEW_ROLES);
  const canEnterRequests = hasRole(role, DEATH_DONATION_ENTRY_ROLES);

  const requestStatus = request?.status ?? "NEW";
  const requestDisplayId = request?.requestNo ?? "NEW";
  const isRequestLocked = LOCKED_STATUSES.includes(requestStatus);
  // Status alone used to decide every button on this screen, which is why any
  // authenticated user could approve a donation. Each gate now needs the role as
  // well; the server enforces the same rules independently.
  const isEditable = !isRequestLocked && canEnterRequests;
  const hasSavedRequest = !!request?.requestNo;
  const isEditMode = isEditing && isEditable;
  const isFormEditable = !hasSavedRequest || isEditMode;

  /** MMD05-07: a decision belongs to the role owning the level it sits at. */
  const canDecideAtCurrentLevel = canDecideDeathDonationAt(role, requestStatus);
  const canForwardAtCurrentLevel = canForwardDeathDonationAt(role, requestStatus);
  const nextLevel = DEATH_DONATION_NEXT_LEVEL[requestStatus];

  // SRS pp.21-22: Concerns Identified stays editable in View Mode for anyone who
  // can approve at any level.
  const isConcernsEditable = isFormEditable || canDecideAtCurrentLevel;

  // SRS p.22: the entitlement figures are editable by whoever "has the authority
  // to change the Death Donation values".
  const canEditDonationAmounts =
    hasRole(role, DEATH_DONATION_AMOUNT_EDIT_ROLES) &&
    !["APPROVED", "REJECTED", "INACTIVE"].includes(requestStatus);

  const showEditButton = hasSavedRequest && isEditable && !isEditMode;
  const showSaveButton = (!hasSavedRequest || isEditMode) && isEditable;
  const showWorkflowActions = hasSavedRequest && isEditable && !isEditMode;
  const showApprovalActions = hasSavedRequest && canDecideAtCurrentLevel && !isEditMode;
  // Whoever may type in Concerns Identified needs a way to save it. The plain
  // Save button covers the entry role while the request is still editable; this
  // covers the approver reading a locked request in View Mode, whom SRS pp.21-22
  // explicitly allows to edit that one field.
  //
  // Written against isConcernsEditable rather than against showApprovalActions:
  // keying it off the latter made it `canDecide && !canDecide`, so the button
  // could never appear at all.
  const showSaveConcerns = hasSavedRequest && isConcernsEditable && !showSaveButton;

  // Everyone who can see the request but is not the level it is waiting on gets
  // told who it is with, rather than an unexplained absence of buttons.
  const waitingOnLabel =
    hasSavedRequest && !canDecideAtCurrentLevel
      ? DEATH_DONATION_LEVEL_LABEL[requestStatus]
      : undefined;

  const allowedStatusChanges = request?.allowedStatusChanges ?? [];
  const showDonationDetails = hasSavedRequest;
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
  // Once there is a saved request the server has already applied the configured
  // eligible period; only fall back to the local three-month guess while the
  // form is still being filled in.
  const dateRangeWarning = useMemo(() => {
    if (request?.eligiblePeriodWarning) return true;
    if (hasSavedRequest) return !!request?.dateRangeWarning;
    return isOutsideAllowedRange(form.requestedDate, form.deceasedDate);
  }, [
    request?.eligiblePeriodWarning,
    request?.dateRangeWarning,
    hasSavedRequest,
    form.requestedDate,
    form.deceasedDate,
  ]);

  // MMD01: the dropdown comes from the Death Donation Relationship master, not
  // from a list hardcoded in this file, so an administrator can change it.
  useEffect(() => {
    if (!canViewRequests) return;

    let cancelled = false;
    getDeathDonationRelationships()
      .then((options) => {
        if (!cancelled && options.length > 0) {
          setRelationshipOptions(options);
        }
      })
      .catch(() => {
        /* keep the fallback list rather than emptying the dropdown */
      });
    return () => {
      cancelled = true;
    };
  }, [canViewRequests]);

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
    syncDonationInputs(loaded);
    const docs = await getDeathDonationDocuments(requestNo);
    setDocuments(docs);

    try {
      const required = await getDeathDonationRequiredDocuments(requestNo);
      if (required.length > 0) {
        setDocumentTypes(
          required.map((row) => ({
            type: row.documentType,
            label: row.documentName ?? row.documentType,
            mandatory: !!row.mandatory,
          }))
        );
      }
    } catch {
      /* keep the fallback list rather than showing no document types at all */
    }
  };

  /** Mirrors the three operator-editable figures into their input boxes. */
  const syncDonationInputs = (loaded: DeathDonationRequest) => {
    setDonationInputs({
      monthsRemitted:
        loaded.monthsRemitted === null || loaded.monthsRemitted === undefined
          ? ""
          : String(loaded.monthsRemitted),
      receivedPast12Months:
        loaded.receivedPast12Months === null || loaded.receivedPast12Months === undefined
          ? ""
          : String(loaded.receivedPast12Months),
      creditedToSpecialFixedAccount:
        loaded.creditedToSpecialFixedAccount === null ||
        loaded.creditedToSpecialFixedAccount === undefined
          ? ""
          : String(loaded.creditedToSpecialFixedAccount),
    });
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

  /** Sets a form field and drops any error still showing against it. */
  const updateField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => {
      if (!previous[field as string]) return previous;
      const next = { ...previous };
      delete next[field as string];
      return next;
    });
  };

  const handleSave = async () => {
    if (!canModifyMember) {
      setSaveError("Death donation is only available when the member status is Active.");
      return;
    }

    // Check here first so a missed field is highlighted in place rather than
    // bouncing off the server as an unattributed message.
    const errors = validateDeathDonationForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSaveError("Please correct the highlighted fields before saving.");
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
      // The dedicated endpoint, not a full-record update: this path is open to
      // approvers who have no entry rights, and replaying every field through
      // the save route makes the request look like an edit they may not make.
      const updated = await updateDeathDonationConcerns(
        request.requestNo,
        form.concernsIdentified
      );
      setRequest(updated);
    } catch (error) {
      console.error("Save concerns error:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save concerns");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * MMD05 / MMD06: escalate one level instead of deciding. The concerns the user
   * typed travel with the request, which is what the SRS asks for - the reason
   * for escalating is exactly what the next level needs to read.
   */
  const handleForward = async () => {
    if (!request?.requestNo || !nextLevel) return;

    try {
      setIsForwarding(true);
      setSaveError("");
      const forward =
        requestStatus === "SUBMITTED_FOR_APPROVAL"
          ? forwardDeathDonationToDistrictCommittee
          : forwardDeathDonationToPdCommittee;
      const updated = await forward(request.requestNo, form.concernsIdentified);
      setRequest(updated);
      setForm((previous) => ({
        ...previous,
        concernsIdentified: updated.concernsIdentified ?? "",
      }));
    } catch (error) {
      console.error("Forward error:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to forward the request");
    } finally {
      setIsForwarding(false);
    }
  };

  /** MMD04 status matrix. The server decides what is legal; this just offers it. */
  const handleChangeStatus = async (status: string) => {
    if (!request?.requestNo || !status) return;

    try {
      setIsChangingStatus(true);
      setSaveError("");
      const updated = await changeDeathDonationStatus(request.requestNo, status);
      setRequest(updated);
      syncDonationInputs(updated);
      setIsEditing(false);
    } catch (error) {
      console.error("Change status error:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to change the status");
    } finally {
      setIsChangingStatus(false);
    }
  };

  /** SRS 2.2.3 refresh: recalculate every derived figure from the three inputs. */
  const handleRefreshDonation = async () => {
    if (!request?.requestNo) return;

    try {
      setIsRefreshingDonation(true);
      setSaveError("");
      const updated = await refreshDeathDonationEntitlement(request.requestNo, donationInputs);
      setRequest(updated);
      syncDonationInputs(updated);
    } catch (error) {
      console.error("Refresh donation error:", error);
      setSaveError(
        error instanceof Error ? error.message : "Failed to recalculate the donation"
      );
    } finally {
      setIsRefreshingDonation(false);
    }
  };

  const handleDownloadDocument = async (file: DeathDonationDocument) => {
    if (!file.id) return;

    try {
      setSaveError("");
      await downloadDeathDonationDocument(file.id, file.fileName);
    } catch (error) {
      console.error("Download error:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to download the file");
    }
  };

  /**
   * The mandatory document types with nothing uploaded against them (MMD01).
   *
   * Reads the same Supporting Documents master the server validates against, so
   * the two agree on what is mandatory.
   */
  const missingMandatoryDocuments = () =>
    documentTypes
      .filter((docType) => docType.mandatory)
      .filter((docType) => !documents.some((doc) => doc.documentType === docType.type))
      .map((docType) => docType.label);

  const handleSubmit = async () => {
    if (!request?.requestNo) {
      setSaveError("Please save the death donation request before submitting.");
      return;
    }

    // Submit re-validates every field server-side, so check them here too rather
    // than opening a confirmation dialog for something that cannot succeed.
    const errors = validateDeathDonationForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSaveError("Please correct the highlighted fields before submitting.");
      return;
    }

    // MMD01: "the system user must upload the files to the mandatory document
    // types before submitting the request for approval". Naming the missing ones
    // beats the server's one-at-a-time message, which only ever reports the
    // first and says nothing about the rest.
    const missing = missingMandatoryDocuments();
    if (missing.length > 0) {
      setSaveError(
        `Upload the mandatory ${missing.length > 1 ? "documents" : "document"} before submitting: ` +
          `${missing.join(", ")}.`
      );
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

  // SRS Requirement 05 names only the District Office and Head Office System
  // Users as actors, so everyone else is turned away here as well as by the
  // server. Waits for `user` so the check never fires during hydration.
  if (user && !canViewRequests) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold text-neutral-800">Access Restricted</h1>
        <p className="max-w-md text-sm text-neutral-500">
          Death Donation requests are restricted to District Office, District and P&amp;D
          Committee, and Head Office personnel.
        </p>
        <Link href="/">
          <Button variant="outline">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

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
                  {/* MMD05 / MMD06: escalate instead of deciding. Absent at the
                      P&D Committee, which is the last level. */}
                  {canForwardAtCurrentLevel && nextLevel && (
                    <Button
                      variant="outline"
                      onClick={handleForward}
                      disabled={isForwarding}
                      className="border-[#953002] bg-white text-[#953002] hover:bg-[#fdf6f2] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isForwarding ? "Forwarding..." : `Forward to ${nextLevel.label}`}
                    </Button>
                  )}
                </>
              )}

              {/* MMD04 status matrix (SRS p.24). The server sends only the
                  transitions it will actually accept from this caller, so an
                  option appearing here is one that works. */}
              {hasSavedRequest && allowedStatusChanges.length > 0 && !isEditMode && (
                <select
                  value=""
                  disabled={isChangingStatus}
                  onChange={(event) => handleChangeStatus(event.target.value)}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {isChangingStatus ? "Changing..." : "Change Status"}
                  </option>
                  {allowedStatusChanges.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
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

            {/* Everyone who can see the request but is not the level it is with
                gets told who has it, instead of an unexplained empty toolbar. */}
            {waitingOnLabel && (
              <p className="mt-3 text-sm text-neutral-500">
                This request is awaiting a decision from {waitingOnLabel}.
              </p>
            )}
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
                  onChange={(e) => updateField("relationshipToDeceased", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                >
                  <option value="">Select relationship</option>
                  {relationshipOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrors.relationshipToDeceased} />
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
                  onChange={(e) => updateField("requestedDate", e.target.value)}
                />
                <FieldError message={fieldErrors.requestedDate} />
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
                      onChange={(e) => updateField("deceasedMemberId", e.target.value)}
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
                  <FieldError message={fieldErrors.deceasedMemberId} />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="mb-1 block font-medium">
                  Name of the Deceased <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.deceasedName}
                  disabled={!isFormEditable}
                  onChange={(e) => updateField("deceasedName", e.target.value)}
                />
                <FieldError message={fieldErrors.deceasedName} />
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
                  onChange={(e) => updateField("deceasedDate", e.target.value)}
                />
                <FieldError message={fieldErrors.deceasedDate} />
              </div>

              <div>
                <label className="mb-1 block font-medium">
                  Death Certificate Number <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.deathCertificateNumber}
                  disabled={!isFormEditable}
                  onChange={(e) => updateField("deathCertificateNumber", e.target.value)}
                />
                <FieldError message={fieldErrors.deathCertificateNumber} />
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
                  {relationshipOptions.map((option) => (
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
              <div className="overflow-hidden rounded-lg border border-neutral-300">
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="bg-[#fafafa] hover:bg-[#fafafa]">
                      {["Member ID", "Relationship", "Source", "Action"].map((h) => (
                        <TableHead
                          key={h}
                          className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase"
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatives.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-neutral-500">
                          No close relatives added yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      relatives.map((relative, index) => (
                        <TableRow
                          key={`${relative.relativeMemberId}-${index}`}
                          className="hover:bg-neutral-50"
                        >
                          <TableCell className="px-4 py-4 font-medium">
                            <div className="flex items-center gap-2">
                              {relative.autoPopulated && (
                                <Info className="h-4 w-4 text-amber-600" aria-label="Auto populated" />
                              )}
                              {relative.relativeMemberId}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-neutral-700">
                            {relative.relationshipToDeceased}
                          </TableCell>
                          <TableCell className="px-4 py-4 text-neutral-700">
                            {relative.autoPopulated ? "Auto" : "Manual"}
                          </TableCell>
                          <TableCell className="px-4 py-4">
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
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-[#953002]">Concerns Identified</h2>

            {dateRangeWarning && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                  <p className="text-sm text-amber-800">
                    {request?.eligiblePeriodWarning ??
                      "Warning: the Requested Date falls outside the eligible period after the Deceased Date."}{" "}
                    You may still submit this request, but please document any concerns below.
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

          {/* Death Donation Details (SRS 2.2.3). Appears only once the request
              has been saved, which is when the SRS says the amounts show up. */}
          {showDonationDetails && (
            <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-bold text-[#953002]">Death Donation Details</h2>
              <p className="mb-4 text-sm text-neutral-500">
                The eligible amount is calculated from the months of remittance deducted.
                {request?.funeralAccountNo
                  ? ` A Special Fixed Account for Funerals exists, so the maximum and eligible
                     amounts are multiplied by ${request.donationMultiplierApplied ?? 2}.`
                  : ""}
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 flex items-center gap-1 font-medium">
                    Total Months Remittance Deducted
                    {request?.monthsRemittedEdited && (
                      <Pencil className="h-3 w-3 text-amber-600" aria-label="Edited by hand" />
                    )}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={donationInputs.monthsRemitted}
                    disabled={!canEditDonationAmounts}
                    onChange={(e) =>
                      setDonationInputs({ ...donationInputs, monthsRemitted: e.target.value })
                    }
                    className="disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1 font-medium">
                    Donations Received in Past 12 Months
                    {request?.receivedPast12MonthsEdited && (
                      <Pencil className="h-3 w-3 text-amber-600" aria-label="Edited by hand" />
                    )}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={donationInputs.receivedPast12Months}
                    disabled={!canEditDonationAmounts}
                    onChange={(e) =>
                      setDonationInputs({
                        ...donationInputs,
                        receivedPast12Months: e.target.value,
                      })
                    }
                    className="disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1 font-medium">
                    Credited to Special Fixed Account
                    {request?.creditedToSpecialFixedEdited && (
                      <Pencil className="h-3 w-3 text-amber-600" aria-label="Edited by hand" />
                    )}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={donationInputs.creditedToSpecialFixedAccount}
                    // Meaningless without a funeral account to credit.
                    disabled={!canEditDonationAmounts || !request?.funeralAccountNo}
                    onChange={(e) =>
                      setDonationInputs({
                        ...donationInputs,
                        creditedToSpecialFixedAccount: e.target.value,
                      })
                    }
                    className="disabled:bg-gray-100"
                  />
                </div>
              </div>

              {canEditDonationAmounts && (
                <Button
                  type="button"
                  onClick={handleRefreshDonation}
                  disabled={isRefreshingDonation}
                  className="mt-4 bg-[#953002] text-white hover:bg-[#7a2702] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRefreshingDonation ? "Recalculating..." : "Recalculate"}
                </Button>
              )}

              <div className="mt-6 grid gap-4 border-t pt-4 md:grid-cols-2">
                <div className="flex justify-between rounded-md bg-gray-50 px-3 py-2">
                  <span className="text-sm text-neutral-600">Maximum Death Donation Amount</span>
                  <span className="text-sm font-medium">
                    {formatAmount(request?.maximumDonationAmount)}
                  </span>
                </div>
                <div className="flex justify-between rounded-md bg-gray-50 px-3 py-2">
                  <span className="text-sm text-neutral-600">Eligible Death Donation Amount</span>
                  <span className="text-sm font-medium">
                    {formatAmount(request?.eligibleDonationAmount)}
                  </span>
                </div>
                <div className="flex justify-between rounded-md bg-gray-50 px-3 py-2">
                  <span className="text-sm text-neutral-600">
                    Special Fixed Account for Funerals
                  </span>
                  <span className="text-sm font-medium">
                    {request?.funeralAccountNo ?? "None"}
                  </span>
                </div>
                <div className="flex justify-between rounded-md bg-gray-50 px-3 py-2">
                  <span className="text-sm text-neutral-600">Credited to Special Fixed Account</span>
                  <span className="text-sm font-medium">
                    {formatAmount(request?.creditedToSpecialFixedAccount)}
                  </span>
                </div>
                <div className="flex justify-between rounded-md bg-emerald-50 px-3 py-2 md:col-span-2">
                  <span className="text-sm font-medium text-emerald-900">
                    Disburse Death Donation Amount (LKR)
                  </span>
                  <span className="text-sm font-bold text-emerald-900">
                    {formatAmount(request?.disburseDonationAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-[#953002]">Required Documents</h2>

            <div className="space-y-5">
              {documentTypes.map((docType) => {
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
                              {/* A plain <a href> is a top-level navigation, so
                                  it never carried the JWT and every download
                                  answered 401. This pulls the bytes through the
                                  authenticated client instead. */}
                              <button
                                type="button"
                                onClick={() => handleDownloadDocument(file)}
                                className="text-left text-sm font-medium text-[#953002] hover:underline"
                              >
                                {file.fileName}
                              </button>
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
