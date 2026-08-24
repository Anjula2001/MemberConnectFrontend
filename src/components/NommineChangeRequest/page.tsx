'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { resolveMember } from '@/lib/api/member';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import { hasRole, PROFILE_CHANGE_EDIT_ROLES } from '@/lib/permissions';
import DocumentUploadCard from '@/src/components/membership/DocumentUploadCard';

// --- 1. Zod Schema Definition ---
// Validates the nominee change request payload before sending to the backend.
// This schema matches the backend DTO field names used by the nominee change API.
const nomineeSchema = z.object({
  newnommineName: z.string().min(3, "Full name is required (min 3 characters)"),
  relationship: z.string().min(1, "Please select a relationship"),
  nic: z.string().min(10, "NIC/ID must be at least 10 characters"),
  address: z.string().min(5, "Address is too short"),
});

interface SectionCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function NomineeChangeRequest({ editId, memberId }: { editId?: string; memberId?: string }) {
  const router = useRouter();
  // The shared toast used across the app (member creation, admin screens). The
  // browser's alert() was an unstyled OS dialog that also blocked the page.
  const { addToast } = useToast();
  const { user } = useAuth();

  // Re-opening a submitted request is not an SRS function — MMC18 forbids editing a
  // submitted record outright — so it is held to the roles that can decide one.
  //
  // There is deliberately no Approve/Reject here: MMC25 places the decision on the
  // Nominee Change Approval List, not on the request.
  const canEdit = hasRole(user?.role, PROFILE_CHANGE_EDIT_ROLES);
  const isEditMode = Boolean(editId);

  const [memberName, setMemberName] = useState<string | null>(null);
  const EMPTY_NOMINEE = {
    newnommineName: '',
    relationship: '',
    nic: '',
    address: '',
  };

  const [currentData, setCurrentData] = useState({ ...EMPTY_NOMINEE });
  const [relationships, setRelationships] = useState<{ id: number; name: string }[]>([]);

  const [mounted, setMounted] = useState(false);

  // --- 2. State Management ---
  // currentData stores the nominee information currently on file.
  // formData stores the requested updated nominee values that the user can edit.
  const [formData, setFormData] = useState({ ...EMPTY_NOMINEE });
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  // The membership number (MEM-2026-001). Distinct from the memberId route param,
  // which is the Member table's numeric primary key - sending that as the request's
  // memberId is what produced rows the list could not resolve a member for.
  const [membershipNo, setMembershipNo] = useState<string | null>(null);
  const [memberInitials, setMemberInitials] = useState<string | null>(null);
  const [memberNic, setMemberNic] = useState<string | null>(null);
  const [submissionLocation, setSubmissionLocation] = useState<string | null>(null);
  // MMC18 locks a submitted record. Editing it in place is enabled at the product
  // owner's direction; re-submitting returns the request to Submitted for Approval so
  // it re-enters the approval-list queue.
  const [isEditing, setIsEditing] = useState(false);
  // MMC18's supporting document. existingStoragePath is the S3 key already on the
  // request; it is sent back unchanged on an ordinary edit so the file is not dropped.
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [existingStoragePath, setExistingStoragePath] = useState<string | null>(null);
  const [requestNo, setRequestNo] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // MMC18: "Once submitted, the user cannot edit the record."
  const isLocked = Boolean(requestStatus) && requestStatus !== 'NEW' && !isEditing;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get('/api/masters/nominee-relationships')
      .then((res) => setRelationships(res.data ?? []))
      .catch(() => setRelationships([]));
  }, []);

  useEffect(() => {
    setMounted(true);

    const fetchRequest = async () => {
      if (!editId && !memberId) return;

      setLoadingRequest(true);
      setLoadError(null);

      try {
        if (editId) {
          const response = await apiClient.get(`/api/v3/getnommineById/${editId}`);
          const data = response.data.data || response.data;

          if (data) {
            setFormData({
              newnommineName: data.newnommineName || "",
              relationship: data.relationship || "",
              nic: data.nic || "",
              address: data.address || "",
            });
            // The Current Value column is the snapshot stored when the request was
            // raised. It used to be re-read from the member on every view, so an
            // already-approved request compared against itself and showed no change.
            setCurrentData({
              newnommineName: data.oldNommineName || "",
              relationship: data.oldRelationship || "",
              nic: data.oldNic || "",
              address: data.oldAddress || "",
            });
            setRequestStatus(data.status ?? null);
            setRequestNo(data.requestNo ?? null);
            setMembershipNo(data.memberId ?? null);
            setMemberName(data.memberFullName ?? null);
            setMemberInitials(data.memberNameWithInitials ?? null);
            setMemberNic(data.memberNic ?? null);

            if (data.documentStoragePath) {
              setExistingStoragePath(data.documentStoragePath);
              setExistingFileName(data.documentFileName ?? data.documentStoragePath);
              // Served by the backend from S3; the file is never publicly exposed.
              setExistingUrl(`/api/documents/file/${data.documentStoragePath}`);
            }
          }
        } else if (memberId) {
          const member = await resolveMember(memberId);
          const nomineeData = {
            newnommineName: member.nomineeFullName || member.nameWithInitials || member.fullName || "",
            relationship: member.nomineeRelationship || "",
            nic: member.identificationNumber || member.nic || "",
            address: member.nomineeAddress || member.permanentPrivateAddress || "",
          };
          setCurrentData(nomineeData);
          // MMC18: the New Value section defaults to the current values.
          setFormData(nomineeData);
          setMembershipNo(member.memberId ?? null);
          setMemberName(member.fullName || member.nameWithInitials || null);
          setMemberInitials(member.nameWithInitials ?? null);
          setMemberNic(member.nic ?? null);
          setSubmissionLocation(member.submissionLocation ?? member.educationalDistrict ?? null);
        }
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : "Could not load this nominee change request.");
      } finally {
        setLoadingRequest(false);
      }
    };
    fetchRequest();
  }, [editId, memberId]);

  // --- 3. Real-time Validation Logic ---
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    const schemaShape = (nomineeSchema.shape as any);

    if (schemaShape[field]) {
      const result = schemaShape[field].safeParse(value);

      if (!result.success) {
        const errorMessage = result.error.issues?.[0]?.message || "Invalid input";
        setErrors(prev => ({ ...prev, [field]: errorMessage }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  };

  // --- 4. Submit to Backend ---
  /**
   * Leaves the screen for wherever it was opened from.
   *
   * The button had no onClick at all, so it did nothing. An explicit destination is
   * used rather than router.back(): this screen is opened from two places, and history
   * has no entry to return to when a request is opened directly by URL or after a
   * refresh — which is exactly the case when reviewing a created request.
   */
  const handleBack = () => {
    if (isEditMode) {
      // Opened from the All Member Profile Change Requests list.
      router.push('/membership/profile-changes');
      return;
    }
    // Opened from the member's profile Actions menu.
    router.push(memberId ? `/membership/directory/${memberId}` : '/membership/directory');
  };

  // Builds the nominee change payload and sends it to the backend.
  // Edit mode reuses the same save endpoint with an Id and status if needed.
  const handleSubmit = async () => {
    const validation = nomineeSchema.safeParse(formData);

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const fieldName = issue.path[0]?.toString();
        if (fieldName) {
          fieldErrors[fieldName] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    // Data mapped to match your Spring Boot DTO
    const payload: Record<string, unknown> = {
      newnommineName: formData.newnommineName,
      relationship: formData.relationship,
      nic: formData.nic,
      address: formData.address,
    };

    if (membershipNo) {
      payload.memberId = membershipNo;
    }
    if (submissionLocation) {
      payload.submissionLocation = submissionLocation;
    }
    // No new file and no existing key means "no document"; sending the existing key
    // back tells the backend to leave the stored file alone.
    if (!selectedFile && existingStoragePath) {
      payload.documentStoragePath = existingStoragePath;
    }

    // The JSON goes as a "request" part so the backend's DTO validation still applies
    // on a multipart submit — the same shape Basic Profile uses.
    const body = new FormData();
    body.append(
      'request',
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    );
    if (selectedFile) {
      body.append('file', selectedFile);
    }

    try {
      if (isEditMode) {
        // Edits used to be re-posted to the create endpoint, relying on the id in the
        // body making save() behave as an upsert. This is the update endpoint.
        await apiClient.put(`/api/v3/updateNommineWithDocument/${editId}`, body);
        setIsEditing(false);
        setRequestStatus('SUBMITTED_FOR_APPROVAL');
        addToast("Request updated and sent back for approval.");
      } else {
        await apiClient.post('/api/v3/saveNommineWithDocument', body);
        addToast("Nominee change request submitted successfully.");
      }
      router.push('/membership/profile-changes');
    } catch (error: unknown) {
      // apiClient's interceptor already unwraps the backend message into an Error.
      const message = error instanceof Error ? error.message : "Server error";
      addToast(message || "Could not submit the request.", "destructive");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  if (loadingRequest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin text-orange-600 mb-4" />
        <p className="font-semibold text-lg">Loading Request Details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8 text-slate-800 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header Section */}
        {(membershipNo || memberName) && (
          <div className="mb-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-3">
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

        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back"
              className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#8A4C27]">
                {isEditMode ? `Nominee Change Request ${requestNo ?? 'NEW'}` : "New Nominee Change Request"}
              </h1>
              <span className="bg-[#EAEBED] px-2 py-0.5 rounded text-[12px] text-slate-600 font-mono inline-block mt-1">
                {memberName
                  ? `${memberName}${membershipNo ? ` (${membershipNo})` : ''}`
                  : "Member details unavailable"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {requestStatus && (
              <span className="rounded-full bg-[#EDE0D6] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#8A4C27]">
                {requestStatus.replace(/_/g, ' ')}
              </span>
            )}
            {isEditMode && !isEditing && canEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg border border-[#8A4C27] text-[#8A4C27] font-semibold hover:bg-[#8A4C27]/5 transition-colors disabled:opacity-60"
              >
                ✏️ Edit
              </button>
            )}
            {isEditMode && isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 font-semibold"
              >
                Cancel
              </button>
            )}
            {(!isEditMode || isEditing) && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-6 py-2 rounded-lg flex items-center gap-2 font-semibold transition-colors ${isSubmitting ? 'bg-slate-400' : 'bg-[#8A4C27] hover:bg-[#733F20]'
                  } text-white`}
              >
                {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
                {isSubmitting ? "Saving..." : "💾 Submit Request"}
              </button>
            )}
          </div>
        </header>

        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 mb-6">
            <AlertCircle size={20} />
            <p className="font-medium text-sm">{loadError}</p>
          </div>
        )}

        {/* Section 1: Current Nominee Details */}
        <SectionCard title="Current Nominee Details" subtitle="Current nominee information on record">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReadonlyField label="Nominee Name" value={currentData.newnommineName || 'Not Set'} />
            <ReadonlyField label="Relationship" value={currentData.relationship || 'Not Set'} />
            <ReadonlyField label="NIC / ID" value={currentData.nic || 'Not Set'} />
            <ReadonlyField label="Address" value={currentData.address || 'Not Set'} />
          </div>
        </SectionCard>

        {/* Section 2: New Nominee Details */}
        <SectionCard title="New Nominee Details" subtitle="Enter updated nominee information">
          <div className="space-y-5">

            <InputField
              label="Nominee Full Name *"
              placeholder="Enter nominee's full name"
              value={formData.newnommineName}
              onChange={(val: string) => handleFieldChange('newnommineName', val)}
              error={errors.newnommineName}
            />

            <div className="flex flex-col gap-2">
              <label className={`text-sm font-semibold ${errors.relationship ? 'text-red-500' : 'text-slate-700'}`}>Relationship *</label>
              <div className="relative">
                <select
                  value={formData.relationship}
                  onChange={(e) => handleFieldChange('relationship', e.target.value)}
                  disabled={isLocked}
                  className={`w-full px-4 py-2.5 rounded-lg border appearance-none bg-white focus:outline-none transition-all ${errors.relationship ? 'border-red-500 ring-1 ring-red-50' : 'border-slate-200 focus:border-[#8A4C27]'
                    }`}
                >
                  <option value="">Select relationship</option>
                  {relationships.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
              {errors.relationship && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {errors.relationship}</p>}
            </div>

            <InputField
              label="Nominee NIC / Passport / Birth Certificate No *"
              placeholder="Enter NIC or ID number"
              value={formData.nic}
              onChange={(val: string) => handleFieldChange('nic', val)}
              error={errors.nic}
            />

            <div className="flex flex-col gap-2">
              <label className={`text-sm font-semibold ${errors.address ? 'text-red-500' : 'text-slate-700'}`}>Nominee Address *</label>
              <textarea
                rows={3}
                value={formData.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                placeholder="Enter complete address"
                className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-all resize-none ${errors.address ? 'border-red-500 ring-1 ring-red-50' : 'border-slate-200 focus:border-[#8A4C27]'
                  }`}
              />
              {errors.address && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {errors.address}</p>}
            </div>
          </div>
        </SectionCard>

        {/* Section 3: Required Documents */}
        <SectionCard title="Required Documents" subtitle="Please attach the following documents">
          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-3 text-sm text-slate-600">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8A4C27]" />
              Nominee's NIC / Birth Certificate Copy
            </li>
          </ul>
          <DocumentUploadCard
            label="Nominee's NIC / Birth Certificate Copy"
            disabled={isLocked}
            existingUrl={existingUrl}
            existingFileName={existingFileName}
            onFileSelected={(file) => {
              setSelectedFile(file);
              setExistingFileName(file.name);
              // The file is uploaded with the request, not on selection, so there is
              // nothing to preview from the server until it has been submitted.
              setExistingUrl(null);
            }}
            onDelete={async () => {
              // Clearing both is what tells the backend to remove the stored document.
              setSelectedFile(null);
              setExistingUrl(null);
              setExistingFileName(null);
              setExistingStoragePath(null);
            }}
          />
        </SectionCard>
      </div>
    </div>
  );
}

const InputField = ({ label, placeholder, value, onChange, error }: any) => (
  <div className="flex flex-col gap-2">
    <label className={`text-sm font-semibold ${error ? 'text-red-500' : 'text-slate-700'}`}>{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-all ${error ? 'border-red-500 ring-1 ring-red-50' : 'border-slate-200 focus:border-[#8A4C27]'
        }`}
    />
    {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
  </div>
);

const SectionCard = ({ title, subtitle, children }: SectionCardProps) => (
  <section className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
    <div className="mb-6">
      <h2 className="text-xl font-bold text-[#8A4C27]">{title}</h2>
      <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
    </div>
    {children}
  </section>
);

const ReadonlyField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-slate-400 uppercase tracking-tight">{label}</label>
    <div className="w-full px-4 py-2.5 rounded-md bg-[#E9E9E9] text-slate-700 font-medium">
      {value}
    </div>
  </div>
);