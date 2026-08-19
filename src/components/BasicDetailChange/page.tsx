"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { z } from "zod";
import axios from 'axios';
import { apiClient } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { getMemberById } from '@/lib/api/member';
import DocumentUploadCard from '@/src/components/membership/DocumentUploadCard';
import { useToast } from '@/lib/toast-context';

// 1. Schema Definition
// This Zod schema validates the profile change request fields before submission.
// It ensures the user enters valid personal profile data for the basic detail change form.
export const profileSchema = z.object({
  dob: z.string().min(1, "Date of birth is required"),
  nic: z.string().min(10, "NIC must be at least 10 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  email: z.string().email("Invalid email address"),
  mobile: z.string().min(10, "Mobile number must be 10 digits").regex(/^[0-9]+$/, "Only digits allowed"),
});

/**
 * The value sent to and stored by the backend is the enum constant (MALE, SINHALA,
 * PERMANENT); the label is what the user reads. These were previously plain title-case
 * strings, so a stored "MALE" matched no option and the dropdown fell back to its
 * "Select" placeholder — the value looked empty even though it was set.
 */
const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

const LANGUAGE_OPTIONS = [
  { value: 'ENGLISH', label: 'English' },
  { value: 'SINHALA', label: 'Sinhala' },
  { value: 'TAMIL', label: 'Tamil' },
];

const OCCUPATION_OPTIONS = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'PROBATION', label: 'Probation' },
  { value: 'TEMPORARY', label: 'Temporary' },
  { value: 'CASUAL', label: 'Casual' },
];

type ProfileData = {
  dob: string;
  nic: string;
  gender: string;
  address: string;
  privateTelephone?: string;
  mobile: string;
  email: string;
  language?: string;
  designation?: string;
  occupation?: string;
};

export default function BasicDetailChange({ editId, memberId }: { editId?: string; memberId?: string }) {
  const router = useRouter();
  const { addToast } = useToast();
  const isEditMode = Boolean(editId);

  const EMPTY_PROFILE: ProfileData = {
    dob: "", nic: "", gender: "", address: "", privateTelephone: "",
    mobile: "", email: "", language: "", designation: "", occupation: "",
  };

  const [mounted, setMounted] = useState(false);
  const [memberName, setMemberName] = useState<string | null>(null);
  const [currentData, setCurrentData] = useState<ProfileData>(EMPTY_PROFILE);
  const [formData, setFormData] = useState<ProfileData>({ ...EMPTY_PROFILE });
  // The membership number (MEM-2026-001). Distinct from the memberId route param,
  // which is the Member table's numeric primary key — sending that as the request's
  // memberId is what produced rows the list could not resolve a member for.
  const [membershipNo, setMembershipNo] = useState<string | null>(null);
  const [memberNic, setMemberNic] = useState<string | null>(null);
  const [memberInitials, setMemberInitials] = useState<string | null>(null);
  const [submissionLocation, setSubmissionLocation] = useState<string | null>(null);
  const [requestNo, setRequestNo] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // MMC04: only a request awaiting approval can be decided.
  const isPending =
    selectedStatus === 'SUBMITTED_FOR_APPROVAL' || selectedStatus === 'ADDED_TO_BOARD_APPROVAL_LIST';
  // MMC01 locks a submitted record. Editing it in place is enabled here at the product
  // owner's direction: the fields stay read-only until Edit is pressed, and re-submitting
  // sends the request back to Submitted for Approval so it re-enters the approval queue
  // rather than keeping a decision that no longer matches its contents.
  const [isEditing, setIsEditing] = useState(false);
  const isLocked = isEditMode && !isEditing;

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [existingStoragePath, setExistingStoragePath] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Fetch Data if Edit Mode or Member Detail Mode
  useEffect(() => {
    if (!editId && !memberId) return;

    const fetchData = async () => {
      setLoadingRequest(true);
      setLoadError(null);

      try {
        if (editId) {
          const response = await apiClient.get(`/api/v2/getRequest/${editId}`);
          const data = response.data.data || response.data;

          if (data) {
            setFormData({
              dob: data.newBirthDate ?? "",
              nic: data.newNIC ?? "",
              gender: data.newGender ?? "",
              address: data.newPermanentPrivateAddress ?? "",
              privateTelephone: data.newPrivateTelephone ?? "",
              mobile: data.newMobileNumber ?? "",
              email: data.newEmailAddress ?? "",
              language: data.newPreferredLanguage ?? "",
              designation: data.newDesignation ?? "",
              occupation: data.newNatureOfOccupation ?? "",
            });
            // The Current Value column is the snapshot stored when the request was
            // raised, not the member's values as they stand today.
            setCurrentData({
              dob: data.oldBirthDate ?? "",
              nic: data.oldNIC ?? "",
              gender: data.oldGender ?? "",
              address: data.oldPermanentPrivateAddress ?? "",
              privateTelephone: data.oldPrivateTelephone ?? "",
              mobile: data.oldMobileNumber ?? "",
              email: data.oldEmailAddress ?? "",
              language: data.oldPreferredLanguage ?? "",
              designation: data.oldDesignation ?? "",
              occupation: data.oldNatureOfOccupation ?? "",
            });
            setMembershipNo(data.memberId ?? null);
            setMemberName(data.memberFullName ?? null);
            setMemberInitials(data.memberNameWithInitials ?? null);
            setMemberNic(data.memberNic ?? null);
            setRequestNo(data.requestNo ?? null);
            setSelectedStatus(data.status ?? '');
            if (data.documentStoragePath) {
              setExistingUrl(`/api/documents/file/${data.documentStoragePath}`);
              setExistingFileName(data.documentFileName || data.documentType || 'Supporting Document');
              setExistingStoragePath(data.documentStoragePath);
            }
          }
        } else if (memberId) {
          const data = await getMemberById(Number(memberId));
          const mapped: ProfileData = {
            dob: data.dateOfBirth ?? "",
            nic: data.nic ?? data.identificationNumber ?? "",
            gender: data.gender ?? "",
            address: data.permanentPrivateAddress ?? "",
            privateTelephone: data.privateTelephone ?? "",
            mobile: data.mobileNumber ?? "",
            email: data.emailAddress ?? "",
            language: data.preferredLanguage ?? "",
            designation: data.designation ?? "",
            occupation: data.natureOfOccupation ?? "",
          };
          setCurrentData(mapped);
          // MMC01: "The fields in the New Value section will be populated with the
          // existing values by default."
          setFormData(mapped);
          setMembershipNo(data.memberId ?? null);
          setMemberName(data.fullName ?? data.nameWithInitials ?? null);
          setMemberInitials(data.nameWithInitials ?? null);
          setMemberNic(data.nic ?? null);
          setSubmissionLocation(data.submissionLocation ?? data.educationalDistrict ?? null);
        }
      } catch (err: unknown) {
        setLoadError("Could not load data. Check backend connection.");
      } finally {
        setLoadingRequest(false);
      }
    };

    fetchData();
  }, [editId, memberId]);

  // 3. SAFE Handle Change (Prevents Crash)
  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // 4. Submit updated request to the backend
  // Maps frontend form field names to the backend DTO and handles both create and edit flows.
  const validateBeforeSubmit = () => {
    const newErrors: Record<string, string> = {};
    // If current value is missing, the new value is mandatory.
    if (!currentData.dob && !formData.dob) newErrors.dob = 'Date of birth is required';
    if (!currentData.nic) {
      if (!formData.nic) newErrors.nic = 'NIC is required';
      else if (String(formData.nic).trim().length < 10) newErrors.nic = 'NIC must be at least 10 characters';
    }
    if (!currentData.address && !formData.address) newErrors.address = 'Address is required';
    if (!currentData.email) {
      if (!formData.email) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email address';
    }
    if (!currentData.mobile) {
      if (!formData.mobile) newErrors.mobile = 'Mobile is required';
      else if (!/^[0-9]{10}$/.test(String(formData.mobile))) newErrors.mobile = 'Mobile number must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatLocalDateTime = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const handleSubmit = async (overrideStatus?: string) => {
    if (!validateBeforeSubmit()) return;

    setIsSubmitting(true);

    const nextStatus = overrideStatus ?? selectedStatus;
    const formDataPayload = new FormData();
    if (isEditMode) {
      if (editId) formDataPayload.append("editId", editId);
      if (nextStatus) {
        formDataPayload.append("status", nextStatus);
      }
    } else {
      // The backend stamps the request number, requested date and status on submit.
    }

    if (membershipNo) formDataPayload.append("memberId", membershipNo);
    if (submissionLocation) formDataPayload.append("submissionLocation", submissionLocation);

    formDataPayload.append("dob", formData.dob);
    formDataPayload.append("nic", formData.nic);
    formDataPayload.append("gender", formData.gender);
    formDataPayload.append("address", formData.address);
    if (formData.privateTelephone) formDataPayload.append("privateTelephone", formData.privateTelephone);
    formDataPayload.append("mobile", formData.mobile);
    formDataPayload.append("email", formData.email);
    if (formData.language) formDataPayload.append("language", formData.language);
    if (formData.designation) formDataPayload.append("designation", formData.designation);
    if (formData.occupation) formDataPayload.append("occupation", formData.occupation);

    if (selectedFile) {
      formDataPayload.append("file", selectedFile);
    } else if (existingStoragePath) {
      formDataPayload.append("documentStoragePath", existingStoragePath);
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      await axios.post('/api/profile-change/upload', formDataPayload, {
        headers: {
          'Content-Type': 'multipart/form-data',
          // The route handler forwards this to the backend, which requires it.
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (isEditMode) {
        setIsEditing(false);
        setSelectedStatus('SUBMITTED_FOR_APPROVAL');
        addToast("Request updated and sent back for approval.", "default");
      } else {
        addToast("Profile change request submitted successfully!", "default");
      }
      router.push('/membership/profile-changes');
    } catch (error: unknown) {
      let msg: string | undefined;
      if (axios.isAxiosError(error)) {
        msg = error.response?.data?.message || error.response?.data?.error || error.message;
      } else if (error instanceof Error) {
        msg = error.message;
      }
      addToast(msg || 'Server Error', 'destructive');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * MMC04 approve / reject.
   *
   * A single backend call sets the status, copies the approved values onto the Member
   * Profile, writes the audit row and notifies the member — all in one transaction.
   * This used to be two calls from the browser: update the member, then update the
   * request. That was not atomic, and it addressed the member endpoint by the
   * membership number ("MEM-2026-001") where a numeric id was expected, so
   * Number(memberId) was NaN and every approval failed.
   */
  const submitDecision = async (decision: 'APPROVE' | 'REJECT', reason?: string) => {
    if (!editId) return;

    setIsSubmitting(true);
    try {
      await apiClient.put(`/api/v2/requests/${editId}/decision`, {
        decision,
        rejectReason: reason ?? null,
      });
      addToast(
        decision === 'APPROVE'
          ? 'Request approved. The member profile has been updated.'
          : 'Request rejected. The member profile was not changed.',
        'default'
      );
      router.push('/membership/profile-changes');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The decision could not be saved.';
      addToast(message, 'destructive');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveRequest = () => submitDecision('APPROVE');

  const handleRejectRequest = async () => {
    const trimmed = rejectReason.trim();
    if (!trimmed) return;
    setShowRejectModal(false);
    setRejectReason('');
    await submitDecision('REJECT', trimmed);
  };


  if (!mounted) return null;

  if (loadingRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <Loader2 className="animate-spin w-10 h-10 text-[#8B3205]" />
      </div>
    );
  }

  return (
    <div className="bg-[#F9FAFB] min-h-screen p-8">
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-[#8B3205]">
            {isEditMode ? `Basic Profile Change Request ${requestNo ?? 'NEW'}` : "New Profile Change Request"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {selectedStatus && (
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#8B3205]">
              {selectedStatus.replace(/_/g, ' ')}
            </span>
          )}
          {isEditMode && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={isSubmitting}
              className="border border-[#8B3205] text-[#8B3205] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#8B3205]/5 transition-all disabled:opacity-60"
            >
              ✏️ Edit
            </button>
          )}
          {isEditMode && isEditing && (
            <>
              <button
                type="button"
                onClick={() => { setIsEditing(false); setErrors({}); }}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="bg-[#8B3205] text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-[#722904] transition-all disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
                💾 Submit
              </button>
            </>
          )}
          {isEditMode && !isEditing && isPending && (
            <>
              <button
                type="button"
                onClick={handleApproveRequest}
                disabled={isSubmitting}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-all disabled:opacity-60"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={isSubmitting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-all disabled:opacity-60"
              >
                Reject
              </button>
            </>
          )}
          {!isEditMode && (
            <button
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
              className="bg-[#8B3205] text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-[#722904] transition-all disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
              💾 Submit
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="max-w-6xl mx-auto mb-4 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          ⚠️ {loadError}
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[460px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <h2 className="text-xl font-semibold text-[#8B3205]">Reject this request</h2>
              <button type="button" onClick={() => setShowRejectModal(false)} className="text-gray-500">✕</button>
            </div>
            <div className="px-5 pb-5 pt-3">
              <p className="text-sm text-gray-500 mb-3">
                The member profile will not be changed. The reason is sent to the member.
              </p>
              <label className="text-sm font-medium text-gray-700" htmlFor="reject-reason">Reason</label>
              <textarea
                id="reject-reason"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this request is being rejected"
                className="mt-1.5 w-full rounded-lg border border-gray-300 p-2.5 text-sm"
              />
              <div className="mt-5 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-gray-700">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleRejectRequest()}
                  disabled={!rejectReason.trim() || isSubmitting}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
                >
                  Reject request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(membershipNo || memberName) && (
        <div className="max-w-6xl mx-auto mb-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Member ID</p>
            <p className="font-mono font-medium text-gray-800">{membershipNo ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Name with Initials</p>
            <p className="font-medium text-gray-800">{memberInitials ?? memberName ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">NIC</p>
            <p className="font-medium text-gray-800">{memberNic ?? '—'}</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
        <ComparisonRow disabled={isLocked} label="DATE OF BIRTH" current={currentData.dob} value={formData.dob} isInput type="date" onChange={(v: string) => handleFieldChange("dob", v)} error={errors.dob} required={!Boolean(currentData.dob)} />
        <ComparisonRow disabled={isLocked} label="NIC NUMBER" current={currentData.nic} value={formData.nic} isInput onChange={(v: string) => handleFieldChange("nic", v)} error={errors.nic} required={!Boolean(currentData.nic)} />
        <ComparisonRow disabled={isLocked} label="GENDER" current={currentData.gender} value={formData.gender} isInput onChange={(v: string) => handleFieldChange("gender", v)} error={errors.gender} required={!Boolean(currentData.gender)} options={GENDER_OPTIONS} />
        <ComparisonRow disabled={isLocked} label="PREFERRED LANGUAGE" current={currentData.language || ''} value={formData.language || ''} isInput onChange={(v: string) => handleFieldChange("language", v)} error={errors.language} required={!Boolean(currentData.language)} options={LANGUAGE_OPTIONS} />
        <ComparisonRow disabled={isLocked} label="DESIGNATION" current={currentData.designation || ''} value={formData.designation || ''} isInput onChange={(v: string) => handleFieldChange("designation", v)} error={errors.designation} required={!Boolean(currentData.designation)} />
        <ComparisonRow disabled={isLocked} label="NATURE OF OCCUPATION" current={currentData.occupation || ''} value={formData.occupation || ''} isInput onChange={(v: string) => handleFieldChange("occupation", v)} error={errors.occupation} required={!Boolean(currentData.occupation)} options={OCCUPATION_OPTIONS} />
        <ComparisonRow disabled={isLocked} label="PRIVATE TELEPHONE" current={currentData.privateTelephone || ''} value={formData.privateTelephone || ''} isInput onChange={(v: string) => handleFieldChange("privateTelephone", v)} error={errors.privateTelephone} />
        <ComparisonRow disabled={isLocked} label="MOBILE" current={currentData.mobile} value={formData.mobile} isInput onChange={(v: string) => handleFieldChange("mobile", v)} error={errors.mobile} required={!Boolean(currentData.mobile)} />
        <ComparisonRow disabled={isLocked} label="ADDRESS" current={currentData.address} value={formData.address} isInput onChange={(v: string) => handleFieldChange("address", v)} error={errors.address} required={!Boolean(currentData.address)} />
        <ComparisonRow disabled={isLocked} label="EMAIL" current={currentData.email} value={formData.email} isInput onChange={(v: string) => handleFieldChange("email", v)} error={errors.email} required={!Boolean(currentData.email)} />

        <div className="pt-6 border-t border-gray-100">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            SUPPORTING DOCUMENT
          </label>
          <div className="max-w-md">
            <DocumentUploadCard
              label="Supporting Document"
              existingUrl={existingUrl}
              existingFileName={existingFileName}
              onFileSelected={(file) => {
                setSelectedFile(file);
                setExistingUrl(null);
                setExistingFileName(null);
                setExistingStoragePath(null);
              }}
              onDelete={async () => {
                setSelectedFile(null);
                setExistingUrl(null);
                setExistingFileName(null);
                setExistingStoragePath(null);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ComparisonRowProps {
  label: string;
  current: string;
  value: string;
  onChange: (value: string) => void;
  isInput?: boolean;
  type?: string;
  error?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  /** MMC01: fields are read-only once the request has been submitted. */
  disabled?: boolean;
}

// 4. ComparisonRow Sub-component
function ComparisonRow({ label, current, value, onChange, isInput, type = "text", error, required = false, options, disabled = false }: ComparisonRowProps) {
  return (
    <div className="grid grid-cols-2 gap-12 border-b border-gray-50 pb-4">
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label} (CURRENT)</label>
        <p className="text-gray-800 font-medium">
          {current
            ? (options?.find((o) => o.value === current)?.label ?? current)
            : <span className="text-gray-400">— no value</span>}
        </p>
      </div>
      <div>
        <label className={`text-[10px] font-bold uppercase tracking-wider ${error ? 'text-red-500' : 'text-blue-600'}`}>
          {label} (NEW){required && <span className="text-red-500"> *</span>}
        </label>
        {options && options.length > 0 ? (
          <select
            required={required}
            disabled={disabled}
            value={value || ""}
            onChange={(e) => onChange?.(e.target.value)}
            className={`w-full p-2 border rounded text-sm transition-all outline-none ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-1 focus:ring-blue-400'}`}
          >
            <option value="">Select</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            required={required}
            disabled={disabled}
            className={`w-full p-2 border rounded text-sm transition-all outline-none ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-1 focus:ring-blue-400'}`}
            value={value || ""}
            onChange={(e) => onChange?.(e.target.value)}
          />
        )}
        {error && <p className="text-[11px] text-red-600 mt-1 font-medium italic">⚠️ {error}</p>}
      </div>
    </div>
  );
}