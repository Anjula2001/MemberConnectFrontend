"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/src/components/ui/select";
import { useState, useEffect } from "react";
import { Save, AlertCircle, Pencil } from "lucide-react";
import { getMemberById } from "@/lib/api/member";
import { createMemberTermination, getMemberTerminations, getTerminationById, updateTermination } from "@/lib/api/termination";
import type { TerminationReason } from "@/lib/api/termination";

// Termination reasons-enum
const TERMINATION_REASONS = [
  { value: "RETIREMENT", label: "Retirement" },
  { value: "RESIGNATION", label: "Resignation" },
  { value: "DEATH", label: "Death" },
  { value: "TERMINATION_OF_SERVICE", label: "Termination of Service" },
  { value: "VOLUNTARY_WITHDRAWAL", label: "Voluntary Withdrawal" },
  { value: "DISMISSAL", label: "Dismissal" },
  { value: "MEDICAL_GROUNDS", label: "Medical Grounds" },
  { value: "OTHER", label: "Other" },
];

const TERMINATION_REASON_VALUES = TERMINATION_REASONS.map((reason) => reason.value);

const isTerminationReason = (value: string): value is TerminationReason => {
  return TERMINATION_REASON_VALUES.includes(value);
};

const toLocalDateString = (date: string) => {
  return date ? date.split("T")[0] : "";
};

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

// HARDCODED DATA
const HARDCODED_MEMBER = {
  id: 123,
  memberId: "MEM-001",
  fullName: "John Silva",
  nic: "123456789V",
  status: "ACTIVE",
};

const HARDCODED_LOAN_DATA = {
  hasOutstandingLoan: false,
  hasIndirectLoan: false,
};

const HARDCODED_ACCOUNTS = [
  {
    id: 1,
    name: "Minor Savings Account 1",
    accNo: "ACC001",
    accountNumber: "ACC001",
    showDetails: false,
    bank: "",
    branch: "",
  },
  {
    id: 2,
    name: "Minor Savings Account 2",
    accNo: "ACC002",
    accountNumber: "ACC002",
    showDetails: false,
    bank: "",
    branch: "",
  },
];

interface MemberData {
  id: number;
  memberId: string | number;
  fullName: string;
  nic: string;
  status: string;
}

interface LoanData {
  hasOutstandingLoan: boolean;
  hasIndirectLoan: boolean;
}

interface SavingsAccountData {
  id: number;
  name: string;
  accNo: string;
  accountNumber: string;
  showDetails: boolean;
  bank: string;
  branch: string;
}

export default function RequestTerminationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberIdParam = searchParams.get("memberId") || "";
  const terminationIdParam = searchParams.get("terminationId") || "";
  const initialMode = (searchParams.get("mode") as "create" | "view" | "edit") || "create";

  const [mode, setMode] = useState<"create" | "view" | "edit">(initialMode);
  const [status, setStatus] = useState<string>("NEW");

  // Form states
  const [reason, setReason] = useState<TerminationReason | "">("");
  const [requestedDate, setRequestedDate] = useState(new Date().toISOString().split("T")[0]);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [comment, setComment] = useState("");

  // Data states
  const [member, setMember] = useState<MemberData | null>(null);
  const [loanData, setLoanData] = useState<LoanData>({ hasOutstandingLoan: false, hasIndirectLoan: false });
  const [accounts, setAccounts] = useState<SavingsAccountData[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [incompleteReason, setIncompleteReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch member data on mount
  useEffect(() => {
    const loadMemberData = async () => {
      try {
        setLoading(true);
        setError("");

        let fetchedMemberId = memberIdParam;

        if (terminationIdParam) {
          const terminationData = await getTerminationById(Number(terminationIdParam));
          setReason(terminationData.terminationReason);
          setRequestedDate(terminationData.requestedDate || "");
          setEffectiveDate(terminationData.terminationDate || "");
          setComment(terminationData.remarks || "");
          setStatus(terminationData.terminationStatus || "NEW");

          fetchedMemberId = String(terminationData.memberId);
        }

        // If no memberId in URL or termination, use hardcoded data
        if (!fetchedMemberId) {
          setMember(HARDCODED_MEMBER);
          setLoanData(HARDCODED_LOAN_DATA);
          setAccounts(HARDCODED_ACCOUNTS);
          return;
        }

        // Fetch real member data from backend
        const memberIdNum = parseInt(fetchedMemberId, 10);
        if (isNaN(memberIdNum)) {
          setError("Invalid member ID");
          return;
        }

        const memberData = await getMemberById(memberIdNum);
        const numericMemberId = Number(memberData.id ?? memberData.memberId ?? memberIdNum);

        setMember({
          id: Number.isFinite(numericMemberId) ? numericMemberId : memberIdNum,
          memberId: memberData.memberId || "",
          fullName: memberData.fullName || "",
          nic: memberData.nic || "",
          status: memberData.status || "ACTIVE",
        });

        // TODO: Fetch loan data and savings accounts from backend
        setLoanData(HARDCODED_LOAN_DATA);
        setAccounts(HARDCODED_ACCOUNTS);
      } catch (err: unknown) {
        console.error("Error loading member:", err);
        setError(getErrorMessage(err, "Failed to load member data"));
        // Fallback to hardcoded data on error
        setMember(HARDCODED_MEMBER);
        setLoanData(HARDCODED_LOAN_DATA);
        setAccounts(HARDCODED_ACCOUNTS);
      } finally {
        setLoading(false);
      }
    };

    loadMemberData();
  }, [memberIdParam]);

  // Validate effective date is in future
  const isValidEffectiveDate = (date: string) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate > today;
  };

  // Check if form is valid
  const isFormValid = () => {
    return Boolean(
      reason &&
      isTerminationReason(reason) &&
      requestedDate &&
      effectiveDate &&
      isValidEffectiveDate(effectiveDate) &&
      !loanData.hasOutstandingLoan
    );
  };

  const getBackendMemberId = () => {
    if (!member) return null;

    const possibleId = Number(member.id ?? member.memberId);
    return Number.isFinite(possibleId) ? possibleId : null;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid()) {
      setError("Please fill all required fields and ensure effective date is in the future");
      return;
    }

    if (!member) {
      setError("Member data not found");
      return;
    }

    const backendMemberId = getBackendMemberId();
    if (!backendMemberId) {
      setError("Invalid member ID. Please open this page from a valid member profile.");
      return;
    }

    if (!isTerminationReason(reason)) {
      setError("Invalid termination reason selected");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      // Validate form data before submission
      if (loanData.hasOutstandingLoan) {
        setError("Cannot submit termination request: Member has outstanding loan balance.");
        setSubmitting(false);
        return;
      }

      // Payload must match MemberTerminationDTO in Spring Boot.
      const payload = {
        memberId: backendMemberId,
        terminationReason: reason,
        terminationDate: toLocalDateString(effectiveDate),
        requestedDate: toLocalDateString(requestedDate),
        remarks: comment.trim() || "",
      };

      console.log("Submitting termination request:", payload);

      let response;

      if (terminationIdParam) {
        // Update existing termination
        response = await updateTermination(Number(terminationIdParam), payload);
        console.log("Termination updated successfully:", response);
        setSuccess(`Termination request updated successfully! (ID: ${response.terminationId || response.id})`);
      } else {
        // Call backend API to create termination
        response = await createMemberTermination(payload);
        console.log("Termination created successfully:", response);
        setSuccess(`Termination request submitted successfully! (ID: ${response.terminationId || response.id})`);
      }

      // Reset form after 2 seconds and redirect
      setTimeout(() => {
        setSuccess("");
        // Redirect to terminations list or member profile
        router.push("/membership/termination");
      }, 2000);
    } catch (err: unknown) {
      console.error("Submission error:", err);
      const errorMessage = getErrorMessage(err, "Failed to submit termination request");
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      setError("");

      if (!member) {
        setError("Member data not found");
        return;
      }

      const backendMemberId = getBackendMemberId();
      if (!backendMemberId) {
        setError("Invalid member ID. Please open this page from a valid member profile.");
        return;
      }

      // Save form data to localStorage as draft
      const draftData = {
        memberId: backendMemberId,
        reason,
        requestedDate,
        effectiveDate,
        comment,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(`termination_draft_${backendMemberId}`, JSON.stringify(draftData));

      console.log("Draft saved to localStorage:", draftData);

      setSuccess("Draft saved successfully! You can continue editing later.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      console.error("Save error:", err);
      setError(getErrorMessage(err, "Failed to save draft"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleIncomplete = async () => {
    try {
      setSubmitting(true);
      console.log("Marking as incomplete:", incompleteReason);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setShowModal(false);
      setIncompleteReason("");
      setSuccess("Marked as incomplete successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to mark as incomplete");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-6">
        <div className="bg-red-100 text-red-800 p-4 rounded-md">
          {error || "Member not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-[#8B4513]">
              Termination Request: {status}
            </h1>
            <p className="text-sm text-muted-foreground">
              Member: {member.fullName} ({member.memberId})
            </p>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          {mode === "view" && (status === "NEW" || status === "INCOMPLETE" || status === "PENDING") && (
            <Button onClick={() => setMode("edit")} variant="outline">
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          <Badge className="bg-blue-100 text-blue-800 flex items-center gap-2">
            Status: {status}
            {status === "INCOMPLETE" && incompleteReason && (
              <span className="ml-2 font-normal">({incompleteReason})</span>
            )}
          </Badge>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="p-3 rounded-md bg-red-100 text-red-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-md bg-green-100 text-green-800 text-sm">
          Success: {success}
        </div>
      )}

      {/* Warnings */}
      {(loanData.hasOutstandingLoan || loanData.hasIndirectLoan) && (
        <div className="space-y-2">
          {loanData.hasOutstandingLoan && (
            <div className="p-3 rounded-md bg-red-100 text-red-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Member has outstanding loan balance. Cannot submit.
            </div>
          )}

          {loanData.hasIndirectLoan && (
            <div className="p-3 rounded-md bg-yellow-100 text-yellow-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Member has indirect loan obligations.
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Member details */}
          <Card>
            <CardHeader>
              <CardTitle>Member Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Member ID</p>
                  <p className="font-medium">{member.memberId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{member.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NIC</p>
                  <p className="font-medium">{member.nic}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reason */}
              <div>
                <label className="text-sm font-medium">Termination Reason *</label>
                <Select
                  value={reason}
                  onValueChange={(value) => {
                    if (isTerminationReason(value)) {
                      setReason(value);
                    }
                  }}
                  disabled={mode === "view"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {TERMINATION_REASONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Requested Date */}
              <div>
                <label className="text-sm font-medium">Requested Date *</label>
                <Input
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  disabled={mode === "view"}
                />
              </div>

              {/* Effective Date */}
              <div>
                <label className="text-sm font-medium">Effective Date *</label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  disabled={mode === "view"}
                />
                {effectiveDate && !isValidEffectiveDate(effectiveDate) && mode !== "view" && (
                  <p className="text-red-500 text-xs mt-1">
                    Effective date must be in the future
                  </p>
                )}
              </div>

              {/* Comment */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Comment/Remarks</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm disabled:opacity-50 disabled:bg-gray-50"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Enter any additional remarks"
                  disabled={mode === "view"}
                />
              </div>
            </CardContent>
          </Card>

          {/* Saving Accounts */}
          {accounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Minor Savings Accounts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {accounts.map((acc, i) => (
                  <div key={i} className="border rounded-md p-3 space-y-3">
                    {/* MAIN ROW */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const updated = [...accounts];
                            updated[i].showDetails = !updated[i].showDetails;
                            setAccounts(updated);
                          }}
                        >
                          {acc.showDetails ? "Close" : "Add Details"}
                        </Button>
                        <div>
                          <p className="font-medium text-[#8B4513]">
                            {acc.accountNumber || acc.accNo || "Account"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {acc.name || "Savings Account"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* EXPANDABLE SECTION */}
                    {acc.showDetails && (
                      <div className="border-t pt-3 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Bank */}
                          <div>
                            <label className="text-sm font-medium">Bank *</label>
                            <Select
                              value={acc.bank}
                              onValueChange={(value) => {
                                const updated = [...accounts];
                                updated[i].bank = value;
                                setAccounts(updated);
                              }}
                              disabled={mode === "view"}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Bank" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BOC">Bank of Ceylon</SelectItem>
                                <SelectItem value="PEOPLE">People&apos;s Bank</SelectItem>
                                <SelectItem value="COMMERCIAL">Commercial Bank</SelectItem>
                                <SelectItem value="DFCC">DFCC Bank</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Branch */}
                          <div>
                            <label className="text-sm font-medium">Branch *</label>
                            <Input
                              value={acc.branch}
                              onChange={(e) => {
                                const updated = [...accounts];
                                updated[i].branch = e.target.value;
                                setAccounts(updated);
                              }}
                              placeholder="Branch name"
                              disabled={mode === "view"}
                            />
                          </div>

                          {/* Account Number */}
                          <div>
                            <label className="text-sm font-medium">Account Number *</label>
                            <Input
                              value={acc.accountNumber}
                              onChange={(e) => {
                                const updated = [...accounts];
                                updated[i].accountNumber = e.target.value;
                                setAccounts(updated);
                              }}
                              placeholder="Account number"
                              disabled={mode === "view"}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* SIDE PANEL - DOCUMENTS */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="border-dashed border-2 rounded-md p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Upload required documents
                </p>
                <Button size="sm" variant="outline" className="mt-2" disabled={mode === "view"}>
                  Upload File
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                No files uploaded
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      {mode !== "view" && (
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={submitting}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>

          <Button
            variant="destructive"
            onClick={() => setShowModal(true)}
            disabled={submitting}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Mark Incomplete
          </Button>

          <Button
            disabled={!isFormValid() || submitting}
            className="bg-[#8B4513] text-white disabled:opacity-50"
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>
      )}

      {/* INCOMPLETE REASON MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md w-[400px] space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold">Reason for Incomplete</h2>

            <textarea
              className="w-full border rounded-md p-2 text-sm"
              rows={4}
              value={incompleteReason}
              onChange={(e) => setIncompleteReason(e.target.value)}
              placeholder="Please explain why this request is incomplete"
            />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleIncomplete}
                disabled={submitting || !incompleteReason.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Confirm"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
