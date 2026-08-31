"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Loader2,
  Pencil,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { MarkIncompleteModal } from "@/src/components/ui/grade5schoolarship/MarkIncomplete";
import {
  SubmitConfirmationModal,
  SubmitSuccessModal,
} from "@/src/components/ui/termination/SubmitConfirmationModal";
import { useToast } from "@/lib/toast-context";
import { type MemberDTO } from "@/lib/api/member";
import {
  approveMemberDeathRecord,
  changeMemberDeathStatus,
  forwardMemberDeathToDistrictCommittee,
  forwardMemberDeathToPdCommittee,
  getActiveMemberDeathRecord,
  getMemberDeathRecord,
  refreshMemberDeathDonation,
  getBanks,
  getBranches,
  getCauseOfDeathOptions,
  getMemberBankAccounts,
  getMemberDeathValidation,
  getMinorSavingsAccounts,
  markMemberDeathIncomplete,
  rejectMemberDeathRecord,
  saveMemberDeathRecord,
  submitMemberDeathRecord,
  updateMemberDeathRecord,
  type BankOption,
  type BranchOption,
  type CauseOfDeath,
  type MemberDeathMinorDisbursement,
  type MemberDeathRecord,
  type MemberDeathValidation,
  type MinorSavingsAccount,
} from "@/lib/api/memberDeath";
import { apiClient } from "@/lib/api/client";
import DocumentUpload from "@/src/components/ui/documentupload";
import { useAuth } from "@/lib/auth-context";
import {
  MEMBER_DEATH_DECISION_ROLE_BY_STATUS,
  MEMBER_DEATH_ENTRY_ROLES,
  MEMBER_DEATH_VIEW_ROLES,
  canDecideMemberDeathAt,
  hasRole,
} from "@/lib/permissions";

const TODAY = new Date().toISOString().split("T")[0];

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  SUBMITTED_FOR_APPROVAL: "Submitted for Approval",
  DISTRICT_COMMITTEE: "District Committee",
  PD_COMMITTEE: "P&D Committee",
  REJECTED: "Rejected",
  APPROVED: "Approved",
  INCOMPLETE: "Incomplete",
  INACTIVE: "Inactive",
};

const LOCKED_STATUSES = new Set([
  "SUBMITTED_FOR_APPROVAL",
  "DISTRICT_COMMITTEE",
  "PD_COMMITTEE",
  "APPROVED",
  "REJECTED",
]);

// Which role owns the decision at each level (MMT22 / MMT23 / MMT24) now lives in
// lib/permissions as MEMBER_DEATH_DECISION_ROLE_BY_STATUS, alongside the rest of
// the module's role matrix. The backend re-checks all of it, so getting it wrong
// here hides buttons rather than granting anything.

const NEXT_LEVEL_LABEL: Record<string, string> = {
  SUBMITTED_FOR_APPROVAL: "District Committee",
  DISTRICT_COMMITTEE: "P&D Committee",
};

function formatAmount(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return numeric.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatStatus(status?: string) {
  if (!status) return "New";
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

export default function RecordMemberDeathPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [memberId, setMemberId] = useState("");
  const [member, setMember] = useState<MemberDTO | null>(null);
  const [record, setRecord] = useState<MemberDeathRecord | null>(null);
  const [validation, setValidation] = useState<MemberDeathValidation | null>(null);
  const [causeOptions, setCauseOptions] = useState<CauseOfDeath[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [nomineeBranches, setNomineeBranches] = useState<BranchOption[]>([]);
  const [minorBranches, setMinorBranches] = useState<Record<string, BranchOption[]>>({});
  const [minorAccounts, setMinorAccounts] = useState<MinorSavingsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [openIncompleteModal, setOpenIncompleteModal] = useState(false);
  const [openSubmitConfirm, setOpenSubmitConfirm] = useState(false);
  const [openSubmitSuccess, setOpenSubmitSuccess] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [forwardConcerns, setForwardConcerns] = useState("");
  const [showForwardInput, setShowForwardInput] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [refreshingDonation, setRefreshingDonation] = useState(false);
  const [donationForm, setDonationForm] = useState({
    monthsRemitted: "",
    receivedPast12Months: "",
    creditedToSpecialFixedAccount: "",
  });

  const [form, setForm] = useState({
    informedDate: "",
    deceasedDate: "",
    causeOfDeathId: "",
    comment: "",
    concerns: "",
    mobile: "",
    email: "",
    bankId: "",
    branchId: "",
    accountNo: "",
  });
  const [minorDisbursements, setMinorDisbursements] = useState<MemberDeathMinorDisbursement[]>([]);

  const recordNo = record?.recordNo;
  const status = record?.status ?? "NEW";
  const role = user?.role;

  /**
   * MMT18 / MMT21: entering and editing a record belongs to the District Office.
   * Everyone else who reaches this screen is here to read it and, at their own
   * level, decide on it. Mirrors ENTRY_ROLES on MemberDeathRecordController and
   * DEATH_ENTRY_ROLES in MemberDeathRecordService, both of which re-check.
   */
  const canEnterRecords = hasRole(role, MEMBER_DEATH_ENTRY_ROLES);
  const canViewRecords = hasRole(role, MEMBER_DEATH_VIEW_ROLES);

  const isLocked = LOCKED_STATUSES.has(status);
  // "Editable" now means both that the record's status allows a change and that
  // this user is allowed to make one.
  const isEditable = !isLocked && canEnterRecords;
  const hasSavedRecord = !!record?.id;
  const canSubmitByLoans = validation?.canSubmit ?? false;

  /** True when this user owns the level the record is currently sitting at. */
  const canDecideAtCurrentLevel = canDecideMemberDeathAt(role, status);

  const nextLevelLabel = NEXT_LEVEL_LABEL[status];

  /**
   * MMT20: "The Concerns Identified Field will be editable even in the View mode
   * for the users who can approve the record on any level." Without this the
   * whole escalation flow is unusable - a committee could see concerns but never
   * add one.
   */
  const canEditConcerns = isEditable || canDecideAtCurrentLevel;

  /**
   * The SRS lets an authorised user adjust the donation figures in View Mode, so
   * the panel stays live for whoever owns the current level. It closes for good
   * once the record is approved, rejected or made inactive.
   */
  const canEditDonation =
    (isEditable || canDecideAtCurrentLevel) &&
    status !== "APPROVED" &&
    status !== "REJECTED" &&
    status !== "INACTIVE";

  // The requests list opens a specific record, not just "whatever is live for
  // this member", so the record number is honoured when it is supplied.
  const requestedRecordNo = searchParams.get("requestId");

  useEffect(() => {
    let id = searchParams.get("memberId");
    if (id?.includes("?")) {
      id = id.split("?")[0];
    }
    if (id) {
      setMemberId(id);
    } else {
      setLoading(false);
      setError("Member ID is required to record a death.");
    }
  }, [searchParams]);

  const loadBranches = useCallback(async (bankId: string) => {
    if (!bankId) return [];
    const branches = await getBranches(bankId);
    return branches;
  }, []);

  const buildMinorDisbursements = useCallback(
    (
      accounts: MinorSavingsAccount[],
      saved: MemberDeathMinorDisbursement[] = []
    ): MemberDeathMinorDisbursement[] =>
      accounts.map((account) => {
        const existing = saved.find((item) => item.minorAccountNo === account.minorAccountNo);
        return {
          minorAccountNo: account.minorAccountNo,
          holderName: account.holderName,
          disbursementBankId: existing?.disbursementBankId ?? null,
          disbursementBranchId: existing?.disbursementBranchId ?? null,
          disbursementAccountNo: existing?.disbursementAccountNo ?? "",
        };
      }),
    []
  );

  const applyRecordToForm = useCallback(
    async (deathRecord: MemberDeathRecord | null, profile: MemberDTO, accounts: MinorSavingsAccount[]) => {
      const bankAccounts = await getMemberBankAccounts(profile.memberId!).catch(() => []);
      const primaryBank = bankAccounts[0];

      if (deathRecord) {
        setForm({
          informedDate: deathRecord.informedDate ?? "",
          deceasedDate: deathRecord.deceasedDate ?? "",
          causeOfDeathId: deathRecord.causeOfDeathId ? String(deathRecord.causeOfDeathId) : "",
          comment: deathRecord.comment ?? "",
          concerns: deathRecord.concernsIdentified ?? "",
          mobile: deathRecord.nomineeMobile ?? profile.mobileNumber ?? "",
          email: deathRecord.nomineeEmail ?? profile.emailAddress ?? "",
          bankId: deathRecord.nomineeBankId ? String(deathRecord.nomineeBankId) : "",
          branchId: deathRecord.nomineeBranchId ? String(deathRecord.nomineeBranchId) : "",
          accountNo: deathRecord.nomineeAccountNo ?? "",
        });
        setMinorDisbursements(
          buildMinorDisbursements(accounts, deathRecord.minorDisbursements ?? [])
        );

        if (deathRecord.nomineeBankId) {
          const branches = await loadBranches(String(deathRecord.nomineeBankId));
          setNomineeBranches(branches);
        }
      } else {
        setForm({
          informedDate: "",
          deceasedDate: "",
          causeOfDeathId: "",
          comment: "",
          concerns: "",
          mobile: profile.mobileNumber ?? "",
          email: profile.emailAddress ?? "",
          bankId: primaryBank?.bankId ?? "",
          branchId: primaryBank?.branchId ?? "",
          accountNo: primaryBank?.accountNumber ?? "",
        });
        setMinorDisbursements(buildMinorDisbursements(accounts));

        if (primaryBank?.bankId) {
          const branches = await loadBranches(primaryBank.bankId);
          setNomineeBranches(branches);
        }
      }
    },
    [buildMinorDisbursements, loadBranches]
  );

  useEffect(() => {
    if (!memberId) return;

    const loadPage = async () => {
      setLoading(true);
      setError("");

      try {
        const [profileRes, causes, bankList, validationData, accounts, activeRecord] =
          await Promise.all([
            apiClient.get<MemberDTO>(`/api/members/by-member-id/${encodeURIComponent(memberId)}`),
            getCauseOfDeathOptions(),
            getBanks(),
            getMemberDeathValidation(memberId),
            getMinorSavingsAccounts(memberId).catch(() => [] as MinorSavingsAccount[]),
            requestedRecordNo
              ? getMemberDeathRecord(requestedRecordNo).catch(() => null)
              : getActiveMemberDeathRecord(memberId).catch(() => null),
          ]);

        const profile = profileRes.data;

        // A member who is already MEMBER_DEATH_APPROVED or DECEASED cannot have a
        // NEW record raised, but their existing one must still open - that is how
        // the committees and Finance read it after the fact.
        const openingExistingRecord = !!requestedRecordNo;
        if (
          !openingExistingRecord &&
          profile.status !== "ACTIVE" &&
          profile.status !== "MEMBER_DEATH_RECORDED"
        ) {
          setError("Record Member Death is only available for active members.");
          setMember(profile);
          return;
        }

        setMember(profile);
        setCauseOptions(causes);
        setBanks(bankList);
        setValidation(validationData);
        setMinorAccounts(accounts);
        setRecord(activeRecord);

        await applyRecordToForm(activeRecord, profile, accounts);

        if (activeRecord?.minorDisbursements?.length) {
          const branchMap: Record<string, BranchOption[]> = {};
          for (const item of activeRecord.minorDisbursements) {
            if (item.disbursementBankId) {
              branchMap[item.minorAccountNo] = await loadBranches(String(item.disbursementBankId));
            }
          }
          setMinorBranches(branchMap);
        }
      } catch (loadError) {
        console.error(loadError);
        setError(loadError instanceof Error ? loadError.message : "Failed to load page data");
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [memberId, requestedRecordNo, applyRecordToForm, loadBranches]);

  // The three editable donation inputs mirror the record; everything else in the
  // panel is derived server-side and only ever displayed.
  useEffect(() => {
    setDonationForm({
      monthsRemitted:
        record?.monthsRemitted !== null && record?.monthsRemitted !== undefined
          ? String(record.monthsRemitted)
          : "",
      receivedPast12Months:
        record?.receivedPast12Months !== null && record?.receivedPast12Months !== undefined
          ? String(record.receivedPast12Months)
          : "",
      creditedToSpecialFixedAccount:
        record?.creditedToSpecialFixedAccount !== null &&
        record?.creditedToSpecialFixedAccount !== undefined
          ? String(record.creditedToSpecialFixedAccount)
          : "",
    });
  }, [record]);

  const nomineeDetails = useMemo(
    () => ({
      name: record?.nomineeFullName ?? member?.nomineeFullName ?? "",
      relationship: record?.nomineeRelationship ?? member?.nomineeRelationship ?? "",
      address: record?.nomineeAddress ?? member?.nomineeAddress ?? "",
      idType: record?.nomineeIdentificationType ?? member?.identification ?? "",
      idNumber:
        record?.nomineeIdentificationNumber ?? member?.identificationNumber ?? "",
    }),
    [record, member]
  );

  const buildPayload = (): MemberDeathRecord => ({
    recordNo: recordNo,
    informedDate: form.informedDate,
    deceasedDate: form.deceasedDate,
    causeOfDeathId: form.causeOfDeathId ? Number(form.causeOfDeathId) : null,
    comment: form.comment,
    concernsIdentified: form.concerns,
    nomineeMobile: form.mobile,
    nomineeEmail: form.email,
    nomineeBankId: form.bankId ? Number(form.bankId) : null,
    nomineeBranchId: form.branchId ? Number(form.branchId) : null,
    nomineeAccountNo: form.accountNo,
    minorDisbursements,
  });

  const handleNomineeBankChange = async (bankId: string) => {
    setForm((prev) => ({ ...prev, bankId, branchId: "" }));
    setNomineeBranches([]);
    if (bankId) {
      const branches = await loadBranches(bankId);
      setNomineeBranches(branches);
    }
  };

  const handleMinorBankChange = async (index: number, bankId: string) => {
    const updated = [...minorDisbursements];
    updated[index] = {
      ...updated[index],
      disbursementBankId: bankId ? Number(bankId) : null,
      disbursementBranchId: null,
    };
    setMinorDisbursements(updated);

    if (bankId) {
      const branches = await loadBranches(bankId);
      setMinorBranches((prev) => ({
        ...prev,
        [updated[index].minorAccountNo]: branches,
      }));
    }
  };

  const handleSave = async () => {
    if (!memberId) return;

    if (!form.informedDate || !form.deceasedDate || !form.causeOfDeathId) {
      addToast("Please fill informed date, deceased date, and cause of death.", "destructive");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = buildPayload();
      const saved = recordNo
        ? await updateMemberDeathRecord(recordNo, payload)
        : await saveMemberDeathRecord(memberId, payload);

      setRecord(saved);
      addToast("Member death record saved successfully.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save record";
      setError(message);
      addToast(message, "destructive");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!recordNo) {
      addToast("Please save the record before submitting.", "destructive");
      return;
    }

    if (!canSubmitByLoans) {
      addToast("Outstanding loans or obligations must be cleared before submitting.", "destructive");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const saved = await submitMemberDeathRecord(recordNo);
      setRecord(saved);
      setOpenSubmitConfirm(false);
      setOpenSubmitSuccess(true);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Failed to submit record";
      setError(message);
      addToast(message, "destructive");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIncomplete = async (reason: string) => {
    if (!recordNo) {
      addToast("Please save the record before marking incomplete.", "destructive");
      return;
    }

    try {
      const updated = await markMemberDeathIncomplete(recordNo, reason);
      setRecord(updated);
      setOpenIncompleteModal(false);
      addToast("Record marked as incomplete.");
    } catch (incompleteError) {
      const message =
        incompleteError instanceof Error ? incompleteError.message : "Failed to mark incomplete";
      addToast(message, "destructive");
    }
  };

  /**
   * Manual status change within the MMT21 matrix - in practice the "Revert to
   * New" escape hatch. The approval ladder itself moves through the dedicated
   * approve / reject / forward actions, which carry the per-level role checks.
   */
  const handleStatusChange = async (nextStatus: string) => {
    if (!recordNo) return;

    try {
      const updated = await changeMemberDeathStatus(recordNo, nextStatus);
      setRecord(updated);
      addToast(`Status changed to ${formatStatus(nextStatus)}.`);
    } catch (statusError) {
      addToast(
        statusError instanceof Error ? statusError.message : "Failed to change status",
        "destructive"
      );
    }
  };

  const handleApprove = async () => {
    if (!recordNo) return;

    setDeciding(true);
    try {
      const updated = await approveMemberDeathRecord(recordNo);
      setRecord(updated);
      addToast("Record approved. The member is now awaiting Finance completion.");
    } catch (approveError) {
      addToast(
        approveError instanceof Error ? approveError.message : "Failed to approve record",
        "destructive"
      );
    } finally {
      setDeciding(false);
    }
  };

  /**
   * MMT22 / MMT23: escalate to the next level, carrying the concern that prompted
   * it. Which endpoint applies is decided by the level the record sits at, not by
   * the button, so the two cannot drift apart.
   */
  const handleForward = async () => {
    if (!recordNo) return;

    setDeciding(true);
    try {
      const updated =
        status === "SUBMITTED_FOR_APPROVAL"
          ? await forwardMemberDeathToDistrictCommittee(recordNo, forwardConcerns.trim())
          : await forwardMemberDeathToPdCommittee(recordNo, forwardConcerns.trim());

      setRecord(updated);
      setForwardConcerns("");
      setShowForwardInput(false);
      addToast(`Record forwarded to the ${nextLevelLabel}.`);
    } catch (forwardError) {
      addToast(
        forwardError instanceof Error ? forwardError.message : "Failed to forward record",
        "destructive"
      );
    } finally {
      setDeciding(false);
    }
  };

  /** The SRS refresh button next to the editable death donation figures. */
  const handleRefreshDonation = async () => {
    if (!recordNo) return;

    setRefreshingDonation(true);
    try {
      const updated = await refreshMemberDeathDonation(recordNo, donationForm);
      setRecord(updated);
      addToast("Death donation amounts recalculated.");
    } catch (refreshError) {
      addToast(
        refreshError instanceof Error
          ? refreshError.message
          : "Failed to recalculate death donation amounts",
        "destructive"
      );
    } finally {
      setRefreshingDonation(false);
    }
  };

  const handleReject = async () => {
    if (!recordNo || !rejectReason.trim()) {
      addToast("Reject reason is required.", "destructive");
      return;
    }

    try {
      const updated = await rejectMemberDeathRecord(recordNo, rejectReason.trim());
      setRejectReason("");
      setShowRejectInput(false);
      setRecord(updated);
      setShowRejectInput(false);
      setRejectReason("");
      addToast("Record rejected. The member profile has been set back to Active.");
    } catch (rejectError) {
      addToast(
        rejectError instanceof Error ? rejectError.message : "Failed to reject record",
        "destructive"
      );
    }
  };

  // Server-side @PreAuthorize is the real gate; this keeps a role that has no
  // business in SRS section 4 from being shown a screen of failing requests.
  if (user && !canViewRecords) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
        <h1 className="text-xl font-bold text-gray-800">Access Restricted</h1>
        <p className="max-w-md text-sm text-gray-500">
          Member Death records are restricted to District Office, District and P&amp;D
          Committee, and Head Office personnel.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#953002]" />
      </div>
    );
  }

  if (!memberId || (error && !member)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6">
        <p className="text-red-600">{error || "Member not found."}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 bg-gray-50 p-6 min-h-screen">
      <div className="flex justify-between items-center rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#953002]">Record Member Death</h1>
            <p className="mt-1 text-sm text-gray-500">Create and manage member death records</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={status} vocabulary="donation" />
          <span className="text-xs text-gray-500">
            Record ID: {recordNo ?? "NEW"}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {validation && (!validation.canSubmit || validation.hasOutstandingLoans || validation.hasLoanObligations) && (
        <div className="rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
              <ShieldAlert className="h-5 w-5 text-orange-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900">Loan clearance required for submission</h3>
              <p className="mt-1 text-sm text-orange-800">
                You can still save this record, but submission will remain disabled until the issues below are resolved.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {validation.hasOutstandingLoans && (
                  <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-white/80 px-3 py-2 text-sm">
                    <Wallet className="h-4 w-4 text-orange-600" />
                    <span>
                      Outstanding loan balance:{" "}
                      <strong>
                        {validation.totalOutstandingLoanBalance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                    </span>
                  </div>
                )}
                {validation.hasLoanObligations && (
                  <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-white/80 px-3 py-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span>Member is nominee on another member&apos;s active loan</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-6 w-2 rounded-sm bg-[#953002]" />
          <h2 className="text-lg font-semibold text-gray-800">Member Details</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-gray-600">Member ID</label>
            <Input value={member?.memberId ?? ""} disabled className="mt-1 bg-gray-50 font-medium" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Member Name</label>
            <Input
              value={member?.nameWithInitials || member?.fullName || ""}
              disabled
              className="mt-1 bg-gray-50 font-medium"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">NIC Number</label>
            <Input value={member?.nic ?? ""} disabled className="mt-1 bg-gray-50 font-medium" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-6 w-2 rounded-sm bg-[#953002]" />
          <h2 className="text-lg font-semibold text-gray-800">Death Information</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-600">
              Informed Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              max={TODAY}
              disabled={!isEditable}
              value={form.informedDate}
              onChange={(e) => setForm({ ...form, informedDate: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">
              Deceased Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              max={TODAY}
              disabled={!isEditable}
              value={form.deceasedDate}
              onChange={(e) => setForm({ ...form, deceasedDate: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-600">
              Cause of Death <span className="text-red-500">*</span>
            </label>
            <select
              disabled={!isEditable}
              value={form.causeOfDeathId}
              onChange={(e) => setForm({ ...form, causeOfDeathId: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002] disabled:bg-gray-50"
            >
              <option value="">Select cause</option>
              {causeOptions.map((cause) => (
                <option key={cause.id} value={cause.id}>
                  {cause.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-600">Comment</label>
            <textarea
              disabled={!isEditable}
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002] disabled:bg-gray-50"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-600">Concerns Identified</label>
            {record?.eligiblePeriodWarning && (
              <p className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {record.eligiblePeriodWarning}
              </p>
            )}
            <textarea
              disabled={!canEditConcerns}
              value={form.concerns}
              onChange={(e) => setForm({ ...form, concerns: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002] disabled:bg-gray-50"
            />
            {!isEditable && canEditConcerns && (
              <p className="mt-1 text-xs text-gray-500">
                Concerns you add when forwarding this record stay visible to every later level.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-6 w-2 rounded-sm bg-[#953002]" />
          <h2 className="text-lg font-semibold text-gray-800">Nominee Details</h2>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm text-gray-600">Full Name</label>
            <Input value={nomineeDetails.name} disabled className="mt-1 bg-gray-50" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Relationship</label>
            <Input value={nomineeDetails.relationship} disabled className="mt-1 bg-gray-50" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Address</label>
            <Input value={nomineeDetails.address} disabled className="mt-1 bg-gray-50" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Identification Type</label>
            <Input value={nomineeDetails.idType} disabled className="mt-1 bg-gray-50" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Identification Number</label>
            <Input value={nomineeDetails.idNumber} disabled className="mt-1 bg-gray-50" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-600">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <Input
              disabled={!isEditable}
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              placeholder="07XXXXXXXX"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Email Address</label>
            <Input
              type="email"
              disabled={!isEditable}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">
              Bank <span className="text-red-500">*</span>
            </label>
            <select
              disabled={!isEditable}
              value={form.bankId}
              onChange={(e) => handleNomineeBankChange(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002] disabled:bg-gray-50"
            >
              <option value="">{banks.length === 0 ? "No banks available" : "Select Bank"}</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </select>
            {banks.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Bank master data is not loaded. Restart the backend to seed default banks.
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">
              Bank Branch <span className="text-red-500">*</span>
            </label>
            <select
              disabled={!isEditable || !form.bankId}
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002] disabled:bg-gray-50"
            >
              <option value="">Select Branch</option>
              {nomineeBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-600">
              Account Number <span className="text-red-500">*</span>
            </label>
            <Input
              disabled={!isEditable}
              value={form.accountNo}
              onChange={(e) => setForm({ ...form, accountNo: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {hasSavedRecord && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-6 w-2 rounded-sm bg-[#953002]" />
            <h2 className="text-lg font-semibold text-gray-800">Death Donation Details</h2>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 p-4">
            <Banknote className="mt-0.5 h-5 w-5 text-amber-700" />
            <p className="text-sm text-amber-900">
              The entitlement is calculated from the months of remittance deducted. Correct any
              of the three editable figures below and click Recalculate to update the rest.
              {record?.funeralAccountNo ? (
                <>
                  {" "}
                  This member holds a Special Fixed Account for Funerals, so the maximum and
                  eligible amounts are multiplied by{" "}
                  {formatAmount(record.donationMultiplierApplied)}.
                </>
              ) : null}
            </p>
          </div>

          {/* Editable inputs. Each carries the SRS "field was edited" marker. */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-600">
                Total Months Remittance Deducted
                {record?.monthsRemittedEdited && (
                  <Pencil className="h-3 w-3 text-amber-600" aria-label="Edited by a user" />
                )}
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                disabled={!canEditDonation}
                value={donationForm.monthsRemitted}
                onChange={(e) =>
                  setDonationForm({ ...donationForm, monthsRemitted: e.target.value })
                }
                className="mt-1"
                placeholder="0"
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-600">
                Donations Received in Past 12 Months
                {record?.receivedPast12MonthsEdited && (
                  <Pencil className="h-3 w-3 text-amber-600" aria-label="Edited by a user" />
                )}
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                disabled={!canEditDonation}
                value={donationForm.receivedPast12Months}
                onChange={(e) =>
                  setDonationForm({ ...donationForm, receivedPast12Months: e.target.value })
                }
                className="mt-1"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-600">
                Credited to Special Fixed Account
                {record?.creditedToSpecialFixedEdited && (
                  <Pencil className="h-3 w-3 text-amber-600" aria-label="Edited by a user" />
                )}
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                disabled={!canEditDonation || !record?.funeralAccountNo}
                value={donationForm.creditedToSpecialFixedAccount}
                onChange={(e) =>
                  setDonationForm({
                    ...donationForm,
                    creditedToSpecialFixedAccount: e.target.value,
                  })
                }
                className="mt-1"
                placeholder={record?.funeralAccountNo ? "0.00" : "No funeral account"}
              />
            </div>
          </div>

          {canEditDonation && (
            <div className="mt-3">
              <Button
                variant="outline"
                onClick={handleRefreshDonation}
                disabled={refreshingDonation}
              >
                {refreshingDonation ? "Recalculating..." : "Recalculate"}
              </Button>
            </div>
          )}

          {/* Derived figures. Read-only: they follow from the inputs above. */}
          <div className="mt-5 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Maximum Death Donation Amount</span>
              <span className="font-medium text-gray-900">
                {formatAmount(record?.maximumDonationAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Eligible Death Donation Amount</span>
              <span className="font-medium text-gray-900">
                {formatAmount(record?.eligibleDonationAmount)}
              </span>
            </div>

            {record?.funeralAccountNo && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Special Fixed Account (Funerals)</span>
                  <span className="font-medium text-gray-900">{record.funeralAccountNo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Already Credited / Maximum</span>
                  <span className="font-medium text-gray-900">
                    {formatAmount(record.funeralAccountCredited)} /{" "}
                    {formatAmount(record.funeralAccountMaximum)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">To Credit to Special Fixed Account</span>
                  <span className="font-medium text-gray-900">
                    {formatAmount(record.creditedToSpecialFixedAccount)}
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between border-t border-gray-300 pt-3 text-sm md:col-span-2">
              <span className="font-semibold text-gray-800">
                Disburse Death Donation Amount
              </span>
              <span className="font-semibold text-[#953002]">
                LKR {formatAmount(record?.disburseDonationAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {minorAccounts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-6 w-2 rounded-sm bg-[#953002]" />
            <h2 className="text-lg font-semibold text-gray-800">Minor Savings Accounts</h2>
          </div>
          <div className="space-y-6">
            {minorDisbursements.map((acc, index) => (
              <div key={acc.minorAccountNo} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-gray-600">Account Number</label>
                    <Input value={acc.minorAccountNo} disabled className="mt-1 bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Account Holder Name</label>
                    <Input value={acc.holderName ?? ""} disabled className="mt-1 bg-gray-50" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Disbursement Bank <span className="text-red-500">*</span>
                    </label>
                    <select
                      disabled={!isEditable}
                      value={acc.disbursementBankId ? String(acc.disbursementBankId) : ""}
                      onChange={(e) => handleMinorBankChange(index, e.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-[#953002] disabled:bg-gray-50"
                    >
                      <option value="">Select Bank</option>
                      {banks.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Branch <span className="text-red-500">*</span>
                    </label>
                    <select
                      disabled={!isEditable || !acc.disbursementBankId}
                      value={acc.disbursementBranchId ? String(acc.disbursementBranchId) : ""}
                      onChange={(e) => {
                        const updated = [...minorDisbursements];
                        updated[index] = {
                          ...updated[index],
                          disbursementBranchId: e.target.value ? Number(e.target.value) : null,
                        };
                        setMinorDisbursements(updated);
                      }}
                      className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-[#953002] disabled:bg-gray-50"
                    >
                      <option value="">Select Branch</option>
                      {(minorBranches[acc.minorAccountNo] ?? []).map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      disabled={!isEditable}
                      value={acc.disbursementAccountNo ?? ""}
                      onChange={(e) => {
                        const updated = [...minorDisbursements];
                        updated[index] = { ...updated[index], disbursementAccountNo: e.target.value };
                        setMinorDisbursements(updated);
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/*
        Documents come from the Supporting Documents for Applications Master, not
        from a hardcoded list: MMT18 says the required set is pre-defined
        configuration and grows when the member has minor savings accounts to
        close. This is the same component termination and retirement use, so the
        master, the upload path and the mandatory-document check on submit are
        all the same ones the backend gates on.
      */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-6 w-2 rounded-sm bg-[#953002]" />
          <h2 className="text-lg font-semibold text-gray-800">Required Documents</h2>
        </div>
        {hasSavedRecord && recordNo ? (
          <DocumentUpload
            requestNo={recordNo}
            memberId={memberId}
            requestStatus={status}
            requestType="member-death-records"
            readOnly={!isEditable}
          />
        ) : (
          <p className="text-sm text-amber-700">
            Save the record before uploading documents.
          </p>
        )}
      </div>

      {hasSavedRecord && isLocked && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-6 w-2 rounded-sm bg-[#953002]" />
            <h2 className="text-lg font-semibold text-gray-800">Workflow Actions</h2>
          </div>
          <p className="mb-3 text-sm text-gray-600">
            {MEMBER_DEATH_DECISION_ROLE_BY_STATUS[status]
              ? `This record is awaiting a decision from the ${
                  status === "SUBMITTED_FOR_APPROVAL"
                    ? "District Office"
                    : status === "DISTRICT_COMMITTEE"
                      ? "District Committee"
                      : "P&D Committee"
                }.`
              : `This record is ${formatStatus(status)}. No further decision is required.`}
          </p>

          <div className="flex flex-wrap gap-2">
            {["SUBMITTED_FOR_APPROVAL", "DISTRICT_COMMITTEE", "PD_COMMITTEE"].includes(status) && (
              <Button variant="outline" onClick={() => handleStatusChange("NEW")}>
                Revert to New
              </Button>
            )}

            {/* Approve, Reject and Forward are offered at EVERY level, but only to
                the role that owns the level the record is actually sitting at. */}
            {canDecideAtCurrentLevel && (
              <>
                <Button
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={deciding}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600"
                  onClick={() => {
                    setShowRejectInput((prev) => !prev);
                    setShowForwardInput(false);
                  }}
                  disabled={deciding}
                >
                  Reject
                </Button>
                {nextLevelLabel && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForwardInput((prev) => !prev);
                      setShowRejectInput(false);
                    }}
                    disabled={deciding}
                  >
                    Forward to {nextLevelLabel}
                  </Button>
                )}
              </>
            )}
          </div>

          {!canDecideAtCurrentLevel && MEMBER_DEATH_DECISION_ROLE_BY_STATUS[status] && (
            <p className="mt-3 text-sm text-gray-500">
              Your role cannot decide on this record at its current level.
            </p>
          )}

          {showRejectInput && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reject reason"
                className="flex-1"
              />
              <Button
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleReject}
                disabled={deciding || !rejectReason.trim()}
              >
                Confirm Reject
              </Button>
            </div>
          )}

          {showForwardInput && nextLevelLabel && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                value={forwardConcerns}
                onChange={(e) => setForwardConcerns(e.target.value)}
                placeholder={`Concern to pass on to the ${nextLevelLabel} (optional)`}
                className="flex-1"
              />
              <Button
                className="bg-[#953002] text-white hover:opacity-90"
                onClick={handleForward}
                disabled={deciding}
              >
                Confirm Forward
              </Button>
            </div>
          )}

          {(record?.level1DecidedBy || record?.level2DecidedBy || record?.level3DecidedBy) && (
            <div className="mt-4 space-y-1 border-t border-gray-200 pt-3 text-xs text-gray-500">
              {record?.level1DecidedBy && (
                <p>
                  District Office: {record.level1DecidedBy} on {record.level1DecidedAt}
                </p>
              )}
              {record?.level2DecidedBy && (
                <p>
                  District Committee: {record.level2DecidedBy} on {record.level2DecidedAt}
                </p>
              )}
              {record?.level3DecidedBy && (
                <p>
                  P&amp;D Committee: {record.level3DecidedBy} on {record.level3DecidedAt}
                </p>
              )}
            </div>
          )}
          {record?.incompleteReason && (
            <p className="mt-3 text-sm text-amber-800">Incomplete reason: {record.incompleteReason}</p>
          )}
          {record?.rejectReason && (
            <p className="mt-3 text-sm text-red-700">Reject reason: {record.rejectReason}</p>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap justify-end gap-3">
        {isEditable && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-600 text-white hover:bg-gray-700"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        )}
        {hasSavedRecord && isEditable && (
          <Button
            variant="outline"
            className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
            onClick={() => setOpenIncompleteModal(true)}
          >
            Incomplete
          </Button>
        )}
        {hasSavedRecord && isEditable && (
          <Button
            onClick={() => setOpenSubmitConfirm(true)}
            disabled={!canSubmitByLoans || submitting}
            className="bg-[#953002] text-white hover:opacity-90 disabled:opacity-50"
          >
            Submit
          </Button>
        )}
      </div>

      <MarkIncompleteModal
        open={openIncompleteModal}
        onClose={() => setOpenIncompleteModal(false)}
        onConfirm={handleIncomplete}
      />

      <SubmitConfirmationModal
        open={openSubmitConfirm}
        title="Submit Member Death Record"
        description="Are you sure you want to submit this member death record for approval?"
        footerNote="Once submitted, this record cannot be edited unless a super user reverts the status to New."
        isLoading={submitting}
        onClose={() => setOpenSubmitConfirm(false)}
        onConfirm={handleSubmit}
      />

      <SubmitSuccessModal
        open={openSubmitSuccess}
        title="Submitted Successfully"
        description="The member death record has been submitted for approval."
        onClose={() => setOpenSubmitSuccess(false)}
      />
    </div>
  );
}
