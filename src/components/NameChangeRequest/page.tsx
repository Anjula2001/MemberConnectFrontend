'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import axios from 'axios';
import { z } from "zod";
import { useRouter } from 'next/navigation';

export const nameChangeSchema = z.object({
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

export default function NameChangeRequest({ editId }: { editId?: string }) {
  const router = useRouter();
  const isEditMode = Boolean(editId);

  const INITIAL_MEMBER_DATA = {
    newNameWithInitials: "J. Doe",
    newFullName: "Johnathan Doe",
    newNameInPayroll: "J. Doe",
  };

  const [formData, setFormData] = useState({
    newNameWithInitials: "",
    newFullName: "",
    newNameInPayroll: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;

    const fetchRequest = async () => {
      setLoadingRequest(true);
      setLoadError(null);
      try {
        const response = await axios.get(`http://localhost:8080/api5/namechange/getnamebyid/${editId}`);
        const data = response.data.data || response.data;

        if (data) {
          setFormData({
            newNameWithInitials: data.newNameWithInitials || "",
            newFullName: data.newFullName || "",
            newNameInPayroll: data.newNameAsInPayroll || data.newNameInPayroll || "",
          });
        }
      } catch (err: any) {
        setLoadError("Could not load data. Check backend connection.");
      } finally {
        setLoadingRequest(false);
      }
    };
    fetchRequest();
  }, [editId]);

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

  const handleSubmit = async () => {
    const result = nameChangeSchema.safeParse(formData);
    if (!result.success) return;

    setIsSubmitting(true);

    const payload = {
      newNameWithInitials: formData.newNameWithInitials,
      newFullName: formData.newFullName,
      newNameAsInPayroll: formData.newNameInPayroll,
      newNameInPayroll: formData.newNameInPayroll,
    };

    try {
      if (isEditMode) {
        await axios.put(`http://localhost:8080/api5/namechange/updatenamechange/${editId}`, payload);
        alert("Updated successfully!");
      } else {
        await axios.post('http://localhost:8080/api5/namechange/savenamechange', payload);
        alert("Request submitted successfully to MemberConnect!");
      }
      router.push('/membership/profile-changes');
    } catch (error: any) {
      console.error("Error submitting name change request:", error);
      const errorMessage = error.response?.data?.message || "An unexpected error occurred. Please try again.";
      alert(`Failed to submit request: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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
              {isEditMode ? `Update Name Change Request NCR-${editId}` : "New Name Change Request"}
            </h1>
            <span className="bg-gray-200 px-2 py-0.5 rounded text-[12px] text-gray-600 font-mono inline-block mt-1">
              Johnathan Doe (MB-2023001)
            </span>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-2 bg-orange-800 text-white rounded-md hover:bg-orange-900 flex items-center gap-2 font-medium transition-colors"
        >
          {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
          {isEditMode ? "💾 Update Request" : "💾 Submit Request"}
        </button>
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
            <InputGroup label="NAME WITH INITIALS (CURRENT)" value={INITIAL_MEMBER_DATA.newNameWithInitials} disabled />
            <InputGroup
              label="NAME WITH INITIALS (NEW) *"
              placeholder="J. Doe"
              value={formData.newNameWithInitials}
              onChange={(v) => handleFieldChange('newNameWithInitials', v)}
              error={errors.newNameWithInitials}
            />

            <InputGroup label="FULL NAME (CURRENT)" value={INITIAL_MEMBER_DATA.newFullName} disabled />
            <InputGroup
              label="FULL NAME (NEW) *"
              placeholder="Johnathan Doe"
              value={formData.newFullName}
              onChange={(v) => handleFieldChange('newFullName', v)}
              error={errors.newFullName}
            />

            <InputGroup label="NAME IN PAYROLL (CURRENT)" value={INITIAL_MEMBER_DATA.newNameInPayroll} disabled />
            <InputGroup
              label="NAME IN PAYROLL (NEW) *"
              placeholder="J. Doe"
              value={formData.newNameInPayroll}
              onChange={(v) => handleFieldChange('newNameInPayroll', v)}
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