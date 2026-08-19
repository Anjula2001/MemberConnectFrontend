"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Loader2,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
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
  getActiveMemberDeathRecord,
  getBanks,
  getBranches,
  getCauseOfDeathOptions,
  getMemberBankAccounts,
  getMemberDeathDocumentDownloadUrl,
  getMemberDeathValidation,
  getMinorSavingsAccounts,
  markMemberDeathIncomplete,
  rejectMemberDeathRecord,
  saveMemberDeathRecord,
  submitMemberDeathRecord,
  updateMemberDeathRecord,
  uploadMemberDeathDocument,
  deleteMemberDeathDocument,
  type BankOption,
  type BranchOption,
  type CauseOfDeath,
  type MemberDeathDocument,
  type MemberDeathMinorDisbursement,
  type MemberDeathRecord,
  type MemberDeathValidation,
  type MinorSavingsAccount,
} from "@/lib/api/memberDeath";
import { apiClient } from "@/lib/api/client";

const TODAY = new Date().toISOString().split("T")[0];

const DOCUMENT_TYPES = [
  { type: "DEATH_CERTIFICATE", label: "Death Certificate", mandatory: true },
  { type: "OTHER", label: "Other Documents", mandatory: false },
] as const;

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

function formatStatus(status?: string) {
  if (!status) return "New";
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

function getStatusBadgeClass(status?: string) {
  switch (status) {
    case "NEW":
      return "bg-blue-100 text-blue-800";
    case "SUBMITTED_FOR_APPROVAL":
    case "DISTRICT_COMMITTEE":
    case "PD_COMMITTEE":
      return "bg-yellow-100 text-yellow-800";
    case "APPROVED":
      return "bg-green-100 text-green-800";
    case "INCOMPLETE":
    case "REJECTED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function RecordMemberDeathPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const [memberId, setMemberId] = useState("");
  const [member, setMember] = useState<MemberDTO | null>(null);
  const [record, setRecord] = useState<MemberDeathRecord | null>(null);
  const [validation, setValidation] = useState<MemberDeathValidation | null>(null);
  const [causeOptions, setCauseOptions] = useState<CauseOfDeath[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [nomineeBranches, setNomineeBranches] = useState<BranchOption[]>([]);
  const [minorBranches, setMinorBranches] = useState<Record<string, BranchOption[]>>({});
  const [minorAccounts, setMinorAccounts] = useState<MinorSavingsAccount[]>([]);
  const [documents, setDocuments] = useState<MemberDeathDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [openIncompleteModal, setOpenIncompleteModal] = useState(false);
  const [openSubmitConfirm, setOpenSubmitConfirm] = useState(false);
  const [openSubmitSuccess, setOpenSubmitSuccess] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

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
    deathDonationAmount: "",
  });
  const [minorDisbursements, setMinorDisbursements] = useState<MemberDeathMinorDisbursement[]>([]);

  const recordNo = record?.recordNo;
  const status = record?.status ?? "NEW";
  const isLocked = LOCKED_STATUSES.has(status);
  const isEditable = !isLocked;
  const hasSavedRecord = !!record?.id;
  const canSubmitByLoans = validation?.canSubmit ?? false;

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
          deathDonationAmount:
            deathRecord.deathDonationAmount != null ? String(deathRecord.deathDonationAmount) : "",
        });
        setMinorDisbursements(
          buildMinorDisbursements(accounts, deathRecord.minorDisbursements ?? [])
        );
        setDocuments(deathRecord.documents ?? []);

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
          deathDonationAmount: "",
        });
        setMinorDisbursements(buildMinorDisbursements(accounts));
        setDocuments([]);

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
            getActiveMemberDeathRecord(memberId).catch(() => null),
          ]);

        const profile = profileRes.data;

        if (profile.status !== "ACTIVE" && profile.status !== "MEMBER_DEATH_RECORDED") {
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
  }, [memberId, applyRecordToForm, loadBranches]);

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
    deathDonationAmount: form.deathDonationAmount
      ? Number(form.deathDonationAmount)
      : null,
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
      setDocuments(saved.documents ?? []);
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

  const handleDocumentUpload = async (documentType: string, file: File) => {
    const activeRecordNo = record?.recordNo;
    if (!activeRecordNo) {
      addToast("Please save the record before uploading documents.", "destructive");
      return;
    }

    setUploadingType(documentType);
    try {
      const uploaded = await uploadMemberDeathDocument(activeRecordNo, documentType, file);
      setDocuments((prev) => [
        ...prev.filter((doc) => doc.documentType !== documentType),
        uploaded,
      ]);
      addToast("Document uploaded successfully.");
    } catch (uploadError) {
      addToast(
        uploadError instanceof Error ? uploadError.message : "Failed to upload document",
        "destructive"
      );
    } finally {
      setUploadingType(null);
    }
  };

  const handleDocumentDelete = async (documentId?: number) => {
    if (!documentId) return;

    try {
      await deleteMemberDeathDocument(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      addToast("Document deleted.");
    } catch (deleteError) {
      addToast(
        deleteError instanceof Error ? deleteError.message : "Failed to delete document",
        "destructive"
      );
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!recordNo) return;

    try {
      const updated = await changeMemberDeathStatus(recordNo, newStatus);
      setRecord(updated);
      addToast(`Status updated to ${formatStatus(newStatus)}.`);
    } catch (statusError) {
      addToast(
        statusError instanceof Error ? statusError.message : "Failed to change status",
        "destructive"
      );
    }
  };

  const handleApprove = async () => {
    if (!recordNo) return;

    try {
      const updated = await approveMemberDeathRecord(recordNo);
      setRecord(updated);
      addToast("Record approved.");
    } catch (approveError) {
      addToast(
        approveError instanceof Error ? approveError.message : "Failed to approve record",
        "destructive"
      );
    }
  };

  const handleReject = async () => {
    if (!recordNo || !rejectReason.trim()) {
      addToast("Reject reason is required.", "destructive");
      return;
    }

    try {
      const updated = await rejectMemberDeathRecord(recordNo, rejectReason.trim());
      setRecord(updated);
      setShowRejectInput(false);
      setRejectReason("");
      addToast("Record rejected.");
    } catch (rejectError) {
      addToast(
        rejectError instanceof Error ? rejectError.message : "Failed to reject record",
        "destructive"
      );
    }
  };

  const documentsByType = useMemo(() => {
    const map: Record<string, MemberDeathDocument[]> = {};
    for (const docType of DOCUMENT_TYPES) {
      map[docType.type] = documents.filter((doc) => doc.documentType === docType.type);
    }
    return map;
  }, [documents]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B4513]" />
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
            <h1 className="text-2xl font-bold text-[#8B4513]">Record Member Death</h1>
            <p className="mt-1 text-sm text-gray-500">Create and manage member death records</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={`${getStatusBadgeClass(status)} px-3 py-1`}>
            {formatStatus(status)}
          </Badge>
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
          <div className="h-6 w-2 rounded-sm bg-[#8B4513]" />
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
          <div className="h-6 w-2 rounded-sm bg-[#8B4513]" />
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
              className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B4513] disabled:bg-gray-50"
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
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B4513] disabled:bg-gray-50"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-600">Concerns Identified</label>
            <textarea
              disabled={!isEditable}
              value={form.concerns}
              onChange={(e) => setForm({ ...form, concerns: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B4513] disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-6 w-2 rounded-sm bg-[#8B4513]" />
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
              className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B4513] disabled:bg-gray-50"
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
              className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B4513] disabled:bg-gray-50"
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
            <div className="h-6 w-2 rounded-sm bg-[#8B4513]" />
            <h2 className="text-lg font-semibold text-gray-800">Death Donation Amount</h2>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 p-4">
            <Banknote className="mt-0.5 h-5 w-5 text-amber-700" />
            <div className="flex-1">
              <p className="text-sm text-amber-900">
                Verify or update the death donation amount. This can be adjusted after the record is saved.
              </p>
              <div className="mt-3 max-w-xs">
                <label className="text-sm font-medium text-gray-600">Amount (LKR)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={!isEditable && status !== "SUBMITTED_FOR_APPROVAL" && status !== "DISTRICT_COMMITTEE" && status !== "PD_COMMITTEE"}
                  value={form.deathDonationAmount}
                  onChange={(e) => setForm({ ...form, deathDonationAmount: e.target.value })}
                  className="mt-1"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {minorAccounts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-6 w-2 rounded-sm bg-[#8B4513]" />
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
                      className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-[#8B4513] disabled:bg-gray-50"
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
                      className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-[#8B4513] disabled:bg-gray-50"
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

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-6 w-2 rounded-sm bg-[#8B4513]" />
          <h2 className="text-lg font-semibold text-gray-800">Required Documents</h2>
        </div>
        <div className="space-y-5">
          {DOCUMENT_TYPES.map((docType) => {
            const uploaded = documentsByType[docType.type] ?? [];
            return (
              <div key={docType.type} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">{docType.label}</span>
                    {docType.mandatory && (
                      <span className="text-xs font-semibold text-red-500">* Mandatory</span>
                    )}
                  </div>
                  {isEditable && (
                    <label className="cursor-pointer rounded-md bg-[#8B4513] px-3 py-1 text-sm text-white hover:opacity-90">
                      {uploadingType === docType.type ? "Uploading..." : "Add"}
                      <input
                        type="file"
                        className="hidden"
                        disabled={!hasSavedRecord || uploadingType !== null}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleDocumentUpload(docType.type, file);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
                {!hasSavedRecord && (
                  <p className="text-sm text-amber-700">Save the record before uploading documents.</p>
                )}
                {uploaded.length > 0 ? (
                  <div className="space-y-2">
                    {uploaded.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <div className="text-sm">
                          <a
                            href={file.id ? getMemberDeathDocumentDownloadUrl(file.id) : "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-[#8B4513] hover:underline"
                          >
                            {file.fileName}
                          </a>
                          <p className="text-xs text-gray-500">
                            {file.fileType} • {file.uploadedAt}
                          </p>
                        </div>
                        {isEditable && (
                          <button
                            type="button"
                            onClick={() => handleDocumentDelete(file.id)}
                            className="text-sm text-red-500 hover:underline"
                          >
                            Delete
                          </button>
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

      {hasSavedRecord && isLocked && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-6 w-2 rounded-sm bg-[#8B4513]" />
            <h2 className="text-lg font-semibold text-gray-800">Workflow Actions</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {["SUBMITTED_FOR_APPROVAL", "DISTRICT_COMMITTEE", "PD_COMMITTEE"].includes(status) && (
              <Button variant="outline" onClick={() => handleStatusChange("NEW")}>
                Revert to New
              </Button>
            )}
            {status === "SUBMITTED_FOR_APPROVAL" && (
              <>
                <Button variant="outline" onClick={() => handleStatusChange("DISTRICT_COMMITTEE")}>
                  District Committee
                </Button>
                <Button variant="outline" onClick={() => handleStatusChange("PD_COMMITTEE")}>
                  P&amp;D Committee
                </Button>
                <Button className="bg-green-600 text-white hover:bg-green-700" onClick={handleApprove}>
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600"
                  onClick={() => setShowRejectInput((prev) => !prev)}
                >
                  Reject
                </Button>
              </>
            )}
            {(status === "DISTRICT_COMMITTEE" || status === "PD_COMMITTEE") && (
              <Button className="bg-green-600 text-white hover:bg-green-700" onClick={handleApprove}>
                Approve
              </Button>
            )}
          </div>
          {showRejectInput && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reject reason"
                className="flex-1"
              />
              <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleReject}>
                Confirm Reject
              </Button>
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
            className="bg-[#8B4513] text-white hover:opacity-90 disabled:opacity-50"
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
