"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  createDeathDonationRequest,
  saveDeathDonationRequest,
  submitDeathDonationRequest,
  markDeathDonationIncomplete,
  getDeathDonationRequest,
  changeDeathDonationStatus,
  type DeathDonationStatus,
} from "@/lib/api/deathDonation";

// ─── Hardcoded requesting member (replace with auth context in production) ─────
const REQUESTING_MEMBER = {
  id: 1,              // DB id used in API calls
  memberId: "MEM001245",
  name: "Perera A.B.",
  nic: "902345678V",
};

export default function CreateDeathDonationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateDeathDonationForm />
    </Suspense>
  );
}

function CreateDeathDonationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  // ── Header / lifecycle state ─────────────────────────────────────────────
  const [savedId, setSavedId] = useState<number | null>(null);   // DB id once saved
  const [requestId, setRequestId] = useState<string>("NEW");     // Human-readable ID
  const [status, setStatus] = useState<DeathDonationStatus>("NEW");

  // ── Loading flags ────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMarkingIncomplete, setIsMarkingIncomplete] = useState(false);

  // ── Toast state ──────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const showToast = (message: string, ok = true) => {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Incomplete modal state ───────────────────────────────────────────────
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [incompleteReason, setIncompleteReason] = useState("");

  // ── Form state ───────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    relationship: "",
    requestedDate: new Date().toISOString().split("T")[0], // today
    isMember: "NO",
    deceasedMemberId: "",
    deceasedName: "",
    maidenName: "",
    certificateNo: "",
    deceasedDate: "",
    placeOfWork: "",
    concerns: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (idParam) {
      loadExistingRequest(parseInt(idParam, 10));
    }
  }, [idParam]);

  const loadExistingRequest = async (id: number) => {
    try {
      setIsLoading(true);
      const data = await getDeathDonationRequest(id);
      setSavedId(data.id);
      setRequestId(data.requestId);
      setStatus(data.status);
      setForm({
        relationship: data.relationshipToDeceased,
        requestedDate: data.requestedDate,
        isMember: data.isDeceasedMember ? "YES" : "NO",
        deceasedMemberId: data.deceasedMemberId || "",
        deceasedName: data.deceasedName,
        maidenName: data.maidenName || "",
        certificateNo: data.deathCertificateNumber,
        deceasedDate: data.deceasedDate,
        placeOfWork: data.placeOfWork || "",
        concerns: data.concernsIdentified || "",
      });
      setRelatives(
        data.relatives.map((r) => ({
          memberId: r.memberId,
          relationship: r.relationshipToDeceased,
          isAuto: r.isAuto,
        }))
      );
    } catch (err) {
      showToast("Failed to load existing request", false);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Close relatives state ────────────────────────────────────────────────
  const [relatives, setRelatives] = useState<
    { memberId: string; relationship: string; isAuto: boolean }[]
  >([]);
  const [newMemberId, setNewMemberId] = useState("");
  const [newRelationship, setNewRelationship] = useState("");

  const handleAddRelative = () => {
    if (!newMemberId || !newRelationship) {
      showToast("Please enter both Member ID and Relationship", false);
      return;
    }
    setRelatives([...relatives, { memberId: newMemberId, relationship: newRelationship, isAuto: false }]);
    setNewMemberId("");
    setNewRelationship("");
  };

  const handleRemoveRelative = (index: number) => {
    setRelatives((prev) => prev.filter((_, i) => i !== index));
  };

  // Simulate auto-fetch by certificate number
  const handleRefresh = () => {
    if (!form.certificateNo) {
      showToast("Enter Death Certificate Number first", false);
      return;
    }
    // Simulated result — replace with a real API call when ready
    const autoMembers = [{ memberId: "MEM999", relationship: "Brother", isAuto: true }];
    setRelatives((prev) => [...prev.filter((r) => !r.isAuto), ...autoMembers]);
    showToast("Relatives refreshed from system");
  };

  // ── Document state ───────────────────────────────────────────────────────
  const [documents, setDocuments] = useState([
    { type: "Death Certificate", mandatory: true, files: [] as { name: string; mimeType: string; uploadedAt: string }[] },
    { type: "NIC Copy", mandatory: true, files: [] as { name: string; mimeType: string; uploadedAt: string }[] },
    { type: "Other Documents", mandatory: false, files: [] as { name: string; mimeType: string; uploadedAt: string }[] },
  ]);

  const handleUpload = (docIndex: number, file: File) => {
    setDocuments((prev) => {
      const updated = [...prev];
      updated[docIndex].files.push({
        name: file.name,
        mimeType: file.type,
        uploadedAt: new Date().toLocaleString(),
      });
      return updated;
    });
  };

  const handleDeleteFile = (docIndex: number, fileIndex: number) => {
    setDocuments((prev) => {
      const updated = [...prev];
      updated[docIndex].files.splice(fileIndex, 1);
      return [...updated];
    });
  };

  // ── Build payload for API calls ──────────────────────────────────────────
  const buildPayload = () => ({
    memberId: REQUESTING_MEMBER.id,
    relationshipToDeceased: form.relationship,
    requestedDate: form.requestedDate,
    isDeceasedMember: form.isMember === "YES",
    deceasedMemberId: form.isMember === "YES" ? form.deceasedMemberId : undefined,
    deceasedName: form.deceasedName,
    maidenName: form.maidenName || undefined,
    deceasedDate: form.deceasedDate,
    deathCertificateNumber: form.certificateNo,
    placeOfWork: form.placeOfWork || undefined,
    concernsIdentified: form.concerns || undefined,
    relatives: relatives.map((r) => ({
      memberId: r.memberId,
      relationshipToDeceased: r.relationship,
      isAuto: r.isAuto,
    })),
  });

  // ── Frontend validation ──────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.relationship)    return "Relationship is required";
    if (!form.requestedDate)   return "Requested date is required";
    if (form.requestedDate > new Date().toISOString().split("T")[0])
                               return "Requested date cannot be in the future";
    if (!form.deceasedName)    return "Deceased name is required";
    if (!form.deceasedDate)    return "Deceased date is required";
    if (!form.certificateNo)   return "Death Certificate Number is required";
    if (form.isMember === "YES" && !form.deceasedMemberId)
                               return "Member ID is required when deceased is a member";
    return null;
  };

  const validateForSubmit = (): string | null => {
    const basic = validate();
    if (basic) return basic;
    const missingDocs = documents.filter((d) => d.mandatory && d.files.length === 0);
    if (missingDocs.length > 0)
      return `Please upload: ${missingDocs.map((d) => d.type).join(", ")}`;
    return null;
  };

  // ─── SAVE ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const error = validate();
    if (error) { showToast(error, false); return; }

    try {
      setIsSaving(true);
      const payload = buildPayload();

      let result;
      if (savedId === null) {
        // First save → create
        result = await createDeathDonationRequest(payload);
      } else {
        // Subsequent save → update draft
        result = await saveDeathDonationRequest(savedId, payload);
      }

      setSavedId(result.id);
      setRequestId(result.requestId);
      setStatus(result.status);
      showToast(`Request saved — ${result.requestId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Save failed", false);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── SUBMIT ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const error = validateForSubmit();
    if (error) { showToast(error, false); return; }

    // 3-month warning check
    if (form.requestedDate && form.deceasedDate) {
      const reqDate = new Date(form.requestedDate);
      const decDate = new Date(form.deceasedDate);
      const monthsDiff =
        (reqDate.getFullYear() - decDate.getFullYear()) * 12 +
        (reqDate.getMonth() - decDate.getMonth());
      if (monthsDiff > 3) {
        const proceed = window.confirm(
          "⚠️ Warning: The requested date is more than 3 months after the date of death. Do you want to proceed?"
        );
        if (!proceed) return;
      }
    }

    try {
      setIsSubmitting(true);

      // If not yet saved, create first then submit
      let id = savedId;
      if (id === null) {
        const saved = await createDeathDonationRequest(buildPayload());
        id = saved.id;
        setSavedId(saved.id);
        setRequestId(saved.requestId);
      }

      const result = await submitDeathDonationRequest(id, buildPayload());
      setStatus(result.status);
      setRequestId(result.requestId);
      showToast(`Request submitted successfully — ${result.requestId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Submit failed", false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── MARK INCOMPLETE ─────────────────────────────────────────────────────
  const handleMarkIncomplete = async () => {
    if (!incompleteReason.trim()) {
      showToast("Please enter a reason", false);
      return;
    }
    if (savedId === null) {
      showToast("Save the request first before marking it incomplete", false);
      return;
    }

    try {
      setIsMarkingIncomplete(true);
      const result = await markDeathDonationIncomplete(savedId, incompleteReason);
      setStatus(result.status);
      setShowIncompleteModal(false);
      setIncompleteReason("");
      showToast("Request marked as Incomplete");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to mark incomplete", false);
    } finally {
      setIsMarkingIncomplete(false);
    }
  };

  // ── Status badge colour ──────────────────────────────────────────────────
  const statusColor: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-800",
    SUBMITTED_FOR_APPROVAL: "bg-yellow-100 text-yellow-800",
    DISTRICT_COMMITTEE: "bg-purple-100 text-purple-800",
    PD_COMMITTEE: "bg-orange-100 text-orange-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    INCOMPLETE: "bg-gray-200 text-gray-700",
    INACTIVE: "bg-gray-300 text-gray-800",
  };

  const isSubmitted = status !== "NEW" && status !== "INCOMPLETE";

  // ─── CHANGE STATUS ───────────────────────────────────────────────────────
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const getAvailableStatuses = (currentStatus: DeathDonationStatus): DeathDonationStatus[] => {
    switch (currentStatus) {
      case "NEW": return ["INACTIVE"];
      case "INCOMPLETE": return ["NEW", "INACTIVE"];
      case "SUBMITTED_FOR_APPROVAL": return ["NEW", "INACTIVE"];
      case "DISTRICT_COMMITTEE": return ["NEW", "INACTIVE"];
      case "PD_COMMITTEE": return ["NEW", "INACTIVE"];
      case "REJECTED": return ["NEW", "INACTIVE"];
      case "INACTIVE": return ["NEW"];
      default: return []; // APPROVED has no transitions
    }
  };

  const availableStatuses = getAvailableStatuses(status);

  const handleChangeStatus = async (newStatus: DeathDonationStatus) => {
    if (savedId === null) return;
    try {
      setIsChangingStatus(true);
      const result = await changeDeathDonationStatus(savedId, newStatus);
      setStatus(result.status);
      showToast(`Status changed to ${result.status.replace(/_/g, " ")}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to change status", false);
    } finally {
      setIsChangingStatus(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B4513]" />
        <p className="mt-4 text-gray-600">Loading request details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 min-h-screen">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#8B4513]">
              Create Death Donation Request
            </h1>
            <p className="text-sm text-gray-500">
              {requestId !== "NEW" ? requestId : "MMD01 - Death Donation Request Entry"}
            </p>
          </div>
        </div>
        <Badge className={statusColor[status] ?? "bg-blue-100 text-blue-800"}>
          {status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* ── Member Details ────────────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-xl shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-6 bg-[#8B4513]" />
          <h2 className="font-semibold text-gray-800">Member Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input value={REQUESTING_MEMBER.memberId} disabled />
          <Input value={REQUESTING_MEMBER.name} disabled />
          <Input value={REQUESTING_MEMBER.nic} disabled />
        </div>
      </div>

      {/* ── Request Details ───────────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-xl shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-6 bg-[#8B4513]" />
          <h2 className="font-semibold text-gray-800">Request Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Relationship */}
          <div>
            <label className="text-sm font-medium text-gray-700">Relationship to Deceased *</label>
            <select
              value={form.relationship}
              onChange={(e) => setForm({ ...form, relationship: e.target.value })}
              disabled={isSubmitted}
              className="w-full border rounded-md h-10 px-2 mt-1 disabled:bg-gray-100"
            >
              <option value="">Select</option>
              <option>Father</option>
              <option>Mother</option>
              <option>Spouse</option>
              <option>Son</option>
              <option>Daughter</option>
              <option>Brother</option>
              <option>Sister</option>
            </select>
          </div>

          {/* Requested Date */}
          <div>
            <label className="text-sm font-medium text-gray-700">Requested Date *</label>
            <Input
              type="date"
              value={form.requestedDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setForm({ ...form, requestedDate: e.target.value })}
              disabled={isSubmitted}
              className="mt-1"
            />
          </div>

          {/* Is Member */}
          <div>
            <label className="text-sm font-medium text-gray-700">Is Deceased a Member? *</label>
            <select
              value={form.isMember}
              onChange={(e) => setForm({ ...form, isMember: e.target.value, deceasedMemberId: "" })}
              disabled={isSubmitted}
              className="w-full border rounded-md h-10 px-2 mt-1 disabled:bg-gray-100"
            >
              <option value="NO">No</option>
              <option value="YES">Yes</option>
            </select>
          </div>

          {/* Conditional Member ID */}
          {form.isMember === "YES" && (
            <div>
              <label className="text-sm font-medium text-gray-700">Deceased Member ID *</label>
              <Input
                value={form.deceasedMemberId}
                onChange={(e) => setForm({ ...form, deceasedMemberId: e.target.value })}
                disabled={isSubmitted}
                placeholder="e.g. MEM001234"
                className="mt-1"
              />
            </div>
          )}

          {/* Deceased Name */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Deceased Name *</label>
            <Input
              value={form.deceasedName}
              onChange={(e) => setForm({ ...form, deceasedName: e.target.value })}
              disabled={isSubmitted}
              placeholder="Full name of deceased"
              className="mt-1"
            />
          </div>

          {/* Maiden Name */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Maiden Name <span className="text-gray-400">(optional)</span></label>
            <Input
              value={form.maidenName}
              onChange={(e) => setForm({ ...form, maidenName: e.target.value })}
              disabled={isSubmitted}
              placeholder="Maiden / alternate name"
              className="mt-1"
            />
          </div>

          {/* Deceased Date */}
          <div>
            <label className="text-sm font-medium text-gray-700">Date of Death *</label>
            <Input
              type="date"
              value={form.deceasedDate}
              onChange={(e) => setForm({ ...form, deceasedDate: e.target.value })}
              disabled={isSubmitted}
              className="mt-1"
            />
          </div>

          {/* Certificate Number */}
          <div>
            <label className="text-sm font-medium text-gray-700">Death Certificate No. *</label>
            <Input
              value={form.certificateNo}
              onChange={(e) => setForm({ ...form, certificateNo: e.target.value })}
              disabled={isSubmitted}
              placeholder="e.g. DC-2025-001234"
              className="mt-1"
            />
          </div>

          {/* Place of Work */}
          <div>
            <label className="text-sm font-medium text-gray-700">Place of Work <span className="text-gray-400">(optional)</span></label>
            <Input
              value={form.placeOfWork}
              onChange={(e) => setForm({ ...form, placeOfWork: e.target.value })}
              disabled={isSubmitted}
              className="mt-1"
            />
          </div>

          {/* Concerns — editable even after submit */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">
              Concerns Identified <span className="text-gray-400">(optional, editable after submit)</span>
            </label>
            <textarea
              value={form.concerns}
              onChange={(e) => setForm({ ...form, concerns: e.target.value })}
              rows={3}
              className="w-full border rounded-md p-2 mt-1 text-sm"
              placeholder="Any concerns or notes..."
            />
          </div>
        </div>
      </div>

      {/* ── Add Close Relative ────────────────────────────────────────────── */}
      {!isSubmitted && (
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-6 bg-[#8B4513]" />
            <h2 className="font-semibold text-gray-800">Add Close Relative</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Member ID"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
            />
            <select
              value={newRelationship}
              onChange={(e) => setNewRelationship(e.target.value)}
              className="border rounded-md h-10 px-2"
            >
              <option value="">Relationship</option>
              <option>Brother</option>
              <option>Sister</option>
              <option>Spouse</option>
              <option>Son</option>
              <option>Daughter</option>
              <option>Father</option>
              <option>Mother</option>
            </select>
            <Button onClick={handleAddRelative}>Add</Button>
          </div>
        </div>
      )}

      {/* ── Close Relatives Grid ──────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-xl shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-800">Members who are close relatives</h2>
          {!isSubmitted && (
            <Button variant="outline" onClick={handleRefresh}>Refresh</Button>
          )}
        </div>

        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Member ID</th>
              <th className="p-2 text-left">Relationship</th>
              <th className="p-2 text-left">Source</th>
              {!isSubmitted && <th className="p-2 text-left">Action</th>}
            </tr>
          </thead>
          <tbody>
            {relatives.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-400 text-sm">
                  No relatives added yet
                </td>
              </tr>
            ) : (
              relatives.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{r.memberId}</td>
                  <td className="p-2">{r.relationship}</td>
                  <td className="p-2">
                    {r.isAuto
                      ? <span className="text-green-600 font-medium">Auto</span>
                      : <span className="text-gray-500">Manual</span>}
                  </td>
                  {!isSubmitted && (
                    <td className="p-2">
                      {!r.isAuto && (
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveRelative(i)}>
                          Remove
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Required Documents ────────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-xl shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-6 bg-[#8B4513]" />
          <h2 className="font-semibold text-gray-800">Required Documents</h2>
        </div>

        <div className="space-y-5">
          {documents.map((doc, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="font-medium">{doc.type}</span>
                  {doc.mandatory && (
                    <span className="text-red-500 text-xs ml-2">* Mandatory</span>
                  )}
                </div>
                {!isSubmitted && (
                  <label className="bg-[#8B4513] text-white px-3 py-1 rounded cursor-pointer text-sm hover:bg-[#7a3b0e]">
                    Add
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files && handleUpload(index, e.target.files[0])
                      }
                    />
                  </label>
                )}
              </div>

              {doc.files.length > 0 ? (
                <div className="space-y-2">
                  {doc.files.map((file, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-gray-50 p-2 rounded"
                    >
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {file.mimeType} • {file.uploadedAt}
                        </p>
                      </div>
                      {!isSubmitted && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteFile(index, i)}
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
          ))}
        </div>
      </div>

      {/* ── Action Buttons ────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3">

        {/* Incomplete — only visible before submitted */}
        {!isSubmitted && (
          <Button
            variant="outline"
            onClick={() => setShowIncompleteModal(true)}
            disabled={savedId === null}
            title={savedId === null ? "Save the request first" : ""}
          >
            Incomplete
          </Button>
        )}

        {/* Save — only editable before submitted */}
        {!isSubmitted && (
          <Button
            className="bg-gray-600 text-white hover:bg-gray-700"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving…</>
            ) : (
              "Save"
            )}
          </Button>
        )}

        {/* Submit */}
        {!isSubmitted && (
          <Button
            className="bg-[#8B4513] text-white hover:bg-[#7a3b0e]"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Submitting…</>
            ) : (
              "Submit"
            )}
          </Button>
        )}

        {/* After submit — show back button */}
        {isSubmitted && (
          <Button variant="outline" onClick={() => router.back()}>
            Back to Directory
          </Button>
        )}
      </div>

      {/* ── Change Status (View Mode) ───────────────────────────────────────── */}
      {isSubmitted && availableStatuses.length > 0 && (
        <div className="bg-white p-5 rounded-xl shadow-sm border mt-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-6 bg-red-600" />
            <h2 className="font-semibold text-gray-800">Admin Actions</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">Change Status to:</span>
            {availableStatuses.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                onClick={() => handleChangeStatus(s)}
                disabled={isChangingStatus}
              >
                {isChangingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : s.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ── Incomplete Reason Modal ───────────────────────────────────────── */}
      {showIncompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[460px] rounded-xl border bg-white shadow-2xl">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-xl font-bold text-gray-800">Mark as Incomplete</h2>
              <p className="text-sm text-gray-500 mt-1">
                Please provide a reason for marking this request incomplete.
              </p>
            </div>
            <div className="px-6 py-4">
              <textarea
                value={incompleteReason}
                onChange={(e) => setIncompleteReason(e.target.value)}
                rows={4}
                className="w-full border rounded-md p-2 text-sm"
                placeholder="Enter reason…"
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-6 pb-6">
              <Button
                variant="ghost"
                onClick={() => { setShowIncompleteModal(false); setIncompleteReason(""); }}
                disabled={isMarkingIncomplete}
              >
                Cancel
              </Button>
              <Button
                className="bg-gray-700 text-white hover:bg-gray-800"
                onClick={handleMarkIncomplete}
                disabled={isMarkingIncomplete}
              >
                {isMarkingIncomplete ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving…</>
                ) : (
                  "Confirm"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast notification ────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border bg-white px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2 text-sm text-gray-800">
            {toast.ok
              ? <CheckCircle2 size={16} className="text-green-600" />
              : <AlertCircle size={16} className="text-red-600" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}