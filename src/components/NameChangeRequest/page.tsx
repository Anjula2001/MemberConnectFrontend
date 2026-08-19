'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { z } from "zod";
import { useRouter } from 'next/navigation';
import { getMemberById } from '@/lib/api/member';

export const nameChangeSchema = z.object({
  newTitle: z.string().min(1, "Title is required"),
  newNameWithInitials: z.string().min(3, "Name with initials must be at least 3 characters"),
  newFullName: z.string().min(3, "Full name must be at least 3 characters"),
  newNameInPayroll: z.string().min(3, "Name in payroll must be at least 3 characters"),
});

interface InputGroupProps {
  label: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  error?: string;
}

const InputGroup = ({
  label,
  value,
  placeholder,
  disabled = false,
  onChange,
  error
}: InputGroupProps) => (
  // Reusable form input component used to render current and new name fields.
  // It supports disabled display of current values and inline error styling for validation.
  <div className="flex flex-col gap-2">
    <label className={`text-[11px] font-bold tracking-wider uppercase ${error ? 'text-red-500' : 'text-gray-500'}`}>
      {label}
    </label>
    <input
      type="text"
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`px-4 py-3 rounded-md border text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-800/20 transition-all ${disabled
        ? 'bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500'
        : error ? 'border-red-500 bg-red-50 focus:ring-red-400' : 'border-gray-200 focus:ring-1 focus:ring-blue-400'
        }`}
    />
    {error && <p className="text-[11px] text-red-600 mt-1 font-medium italic">⚠️ {error}</p>}
  </div>
);

export default function NameChangeRequest({ editId, memberId }: { editId?: string; memberId?: string }) {
  const router = useRouter();
  const isEditMode = Boolean(editId);

  // memberName is used for the page header display.
  // currentData holds the member's current name values, while formData holds the requested values.
  const [memberName, setMemberName] = useState<string | null>(null);
  const EMPTY_NAMES = {
    newTitle: "",
    newNameWithInitials: "",
    newFullName: "",
    newNameInPayroll: "",
  };

  const [currentData, setCurrentData] = useState({ ...EMPTY_NAMES });

  const [mounted, setMounted] = useState(false);
  const [titles, setTitles] = useState<{ id: number; name: string }[]>([]);
  // MMC05: "The fields in the New Value section will be populated with the existing
  // values by default." formData is seeded from the member, not left blank.
  const [formData, setFormData] = useState({ ...EMPTY_NAMES });
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [requestNo, setRequestNo] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // MMC05: "Once submitted, the user cannot edit the record."
  const isLocked = Boolean(requestStatus) && requestStatus !== 'NEW';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    apiClient
      .get('/api/masters/titles')
      .then((res) => setTitles(res.data ?? []))
      .catch(() => setTitles([]));
  }, []);

  // 2. Load initial form data.
  // In edit mode, load the existing request and map it into the form.
  // In create mode, load the member record and show current values.
  useEffect(() => {
    if (editId) {
      const fetchRequest = async () => {
        setLoadingRequest(true);
        setLoadError(null);
        try {
          const response = await apiClient.get(`/api5/namechange/getnamebyid/${editId}`);
          const data = response.data.data || response.data;

          if (data) {
            const requestData = {
              newTitle: data.newTitle || "",
              newNameWithInitials: data.newNameWithInitials || "",
              newFullName: data.newFullName || "",
              newNameInPayroll: data.newNameAsInPayroll || "",
            };
            setFormData(requestData);
            setCurrentData(requestData);
            setRequestStatus(data.status ?? null);
            setRequestNo(data.requestNo ?? null);
          }
        } catch (err: unknown) {
          setLoadError(err instanceof Error ? err.message : "Could not load this name change request.");
        } finally {
          setLoadingRequest(false);
        }
      };
      fetchRequest();
    } else if (memberId) {
      const fetchMember = async () => {
        setLoadingRequest(true);
        setLoadError(null);
        try {
          const member = await getMemberById(Number(memberId));
          const memberData = {
            newTitle: member.title || "",
            newNameWithInitials: member.nameWithInitials || "",
            newFullName: member.fullName || "",
            newNameInPayroll: member.nameAsInPayroll || "",
          };
          setCurrentData(memberData);
          // MMC05: the New Value section defaults to the current values.
          setFormData(memberData);
          setMemberName(member.fullName || member.nameWithInitials || null);
        } catch (err: unknown) {
          setLoadError(err instanceof Error ? err.message : "Unable to load member data for name change.");
        } finally {
          setLoadingRequest(false);
        }
      };
      fetchMember();
    }
  }, [editId, memberId]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    const schemaShape = (nameChangeSchema as any).shape;
    const fieldSchema = schemaShape ? schemaShape[field] : null;

    if (fieldSchema) {
      const result = fieldSchema.safeParse(value);
      if (!result.success) {
        setErrors(prev => ({ ...prev, [field]: result.error.issues[0].message }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  };

  // 4. Submit name change request
  // The payload is mapped to the backend API fields and the route changes for update vs create.
  const handleSubmit = async () => {
    const result = nameChangeSchema.safeParse(formData);
    if (!result.success) return;

    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      newTitle: formData.newTitle,
      newNameWithInitials: formData.newNameWithInitials,
      newFullName: formData.newFullName,
      newNameAsInPayroll: formData.newNameInPayroll,
    };

    if (memberId) payload.memberId = memberId;

    try {
      if (isEditMode) {
        await apiClient.put(`/api5/namechange/updatenamechange/${editId}`, payload);
        alert("Updated successfully!");
      } else {
        await apiClient.post('/api5/namechange/savenamechange', payload);
        alert("Request submitted successfully to MemberConnect!");
      }
      router.push('/membership/profile-changes');
    } catch (error: unknown) {
      // apiClient's interceptor already unwraps the backend message into an Error.
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
      alert(`Failed to submit request: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  if (loadingRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin w-10 h-10 text-orange-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-800">
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-orange-900 leading-tight">
              {isEditMode ? `Name Change Request ${requestNo ?? 'NEW'}` : "New Name Change Request"}
            </h1>
            <span className="bg-gray-200 px-2 py-0.5 rounded text-[12px] text-gray-600 font-mono inline-block mt-1">
              {memberName
                ? `${memberName} (${memberId})`
                : currentData.newFullName || "Member details unavailable"
              }
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {requestStatus && (
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-900">
              {requestStatus.replace(/_/g, ' ')}
            </span>
          )}
          {!isLocked && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-orange-800 text-white rounded-md hover:bg-orange-900 flex items-center gap-2 font-medium transition-colors disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
              {isEditMode ? "💾 Update Request" : "💾 Submit Request"}
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="max-w-5xl mx-auto mb-4 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          ⚠️ {loadError}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        <section className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-orange-900 mb-1">Name Details</h2>
          <p className="text-gray-500 text-sm mb-8 font-medium">Update member name details (marriage, deed poll, etc.)</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <InputGroup label="TITLE (CURRENT)" value={currentData.newTitle} disabled />
            <div className="flex flex-col gap-2">
              <label className={`text-[11px] font-bold tracking-wider uppercase ${errors.newTitle ? 'text-red-500' : 'text-gray-500'}`}>
                TITLE (NEW) *
              </label>
              <select
                value={formData.newTitle}
                onChange={(e) => handleFieldChange('newTitle', e.target.value)}
                disabled={isLocked}
                className={`px-4 py-3 rounded-md border bg-white text-gray-700 focus:outline-none transition-all ${
                  isLocked
                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500'
                    : errors.newTitle
                      ? 'border-red-500 bg-red-50 focus:ring-red-400'
                      : 'border-gray-200 focus:ring-1 focus:ring-blue-400'
                }`}
              >
                <option value="">Select title</option>
                {titles.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              {errors.newTitle && <p className="text-[11px] text-red-600 mt-1 font-medium italic">⚠️ {errors.newTitle}</p>}
            </div>

            <InputGroup label="NAME WITH INITIALS (CURRENT)" value={currentData.newNameWithInitials} disabled />
            <InputGroup
              label="NAME WITH INITIALS (NEW) *"
              placeholder="J. Doe"
              value={formData.newNameWithInitials}
              onChange={(v) => handleFieldChange('newNameWithInitials', v)}
              disabled={isLocked}
              error={errors.newNameWithInitials}
            />

            <InputGroup label="FULL NAME (CURRENT)" value={currentData.newFullName} disabled />
            <InputGroup
              label="FULL NAME (NEW) *"
              placeholder="Johnathan Doe"
              value={formData.newFullName}
              onChange={(v) => handleFieldChange('newFullName', v)}
              disabled={isLocked}
              error={errors.newFullName}
            />

            <InputGroup label="NAME IN PAYROLL (CURRENT)" value={currentData.newNameInPayroll} disabled />
            <InputGroup
              label="NAME IN PAYROLL (NEW) *"
              placeholder="J. Doe"
              value={formData.newNameInPayroll}
              onChange={(v) => handleFieldChange('newNameInPayroll', v)}
              disabled={isLocked}
              error={errors.newNameInPayroll}
            />
          </div>
        </section>

        <section className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-orange-900 mb-1">Required Documents</h2>
          <p className="text-gray-500 text-sm mb-6 font-medium">Please attach the following documents</p>

          <ul className="space-y-4 mb-8">
            {[
              "Marriage Certificate / Deed Poll (if applicable)",
              "Updated NIC / Passport",
              "Letter from Employer (if name changed in payroll)"
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                <div className="w-2 h-2 bg-orange-800 rounded-full shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <div className="w-full border-2 border-dashed border-gray-200 rounded-lg py-12 flex flex-col justify-center items-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
            <p className="text-gray-400 italic text-sm group-hover:text-gray-500">Document upload functionality (Mock)</p>
          </div>
        </section>
      </div>
    </div>
  );
}