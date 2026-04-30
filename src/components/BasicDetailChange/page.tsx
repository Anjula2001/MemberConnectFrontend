"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { z } from "zod";
import axios from 'axios';
import { useRouter } from 'next/navigation';

// 1. Schema Definition
export const profileSchema = z.object({
  dob: z.string().min(1, "Date of birth is required"),
  nic: z.string().min(10, "NIC must be at least 10 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  email: z.string().email("Invalid email address"),
  mobile: z.string().min(10, "Mobile number must be 10 digits").regex(/^[0-9]+$/, "Only digits allowed"),
});

export default function BasicDetailChange({ editId }: { editId?: string }) {
  const router = useRouter();
  const isEditMode = Boolean(editId);

  const INITIAL_MEMBER_DATA = {
    dob: "1985-05-20",
    nic: "851401234V",
    gender: "Male",
    address: "123, Galle Road, Colombo 03",
    mobile: "0771234567",
    email: "john.doe@example.com",
  };

  const [formData, setFormData] = useState({ ...INITIAL_MEMBER_DATA });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 2. Fetch Data if Edit Mode
  useEffect(() => {
    if (!editId) return;

    const fetchRequest = async () => {
      setLoadingRequest(true);
      setLoadError(null);
      try {
        const response = await axios.get(`http://localhost:8080/api/v2/getRequest/${editId}`);
        const data = response.data.data || response.data;

        if (data) {
          // MAP BACKEND TO FRONTEND
          setFormData({
            dob: data.newBirthDate || INITIAL_MEMBER_DATA.dob,
            nic: data.newNIC || INITIAL_MEMBER_DATA.nic,
            gender: data.newGender || INITIAL_MEMBER_DATA.gender,
            address: data.newPermanentPrivateAddress || INITIAL_MEMBER_DATA.address,
            mobile: data.newMobileNumber || INITIAL_MEMBER_DATA.mobile,
            email: data.newEmailAddress || INITIAL_MEMBER_DATA.email,
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

  // 3. SAFE Handle Change (Prevents Crash)
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    const schemaShape = (profileSchema as any).shape;
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
    const result = profileSchema.safeParse(formData);
    if (!result.success) return;

    setIsSubmitting(true);
    const payload = {
      newBirthDate: formData.dob,
      newNIC: formData.nic,
      newGender: formData.gender,
      newPermanentPrivateAddress: formData.address,
      newMobileNumber: formData.mobile,
      newEmailAddress: formData.email,
      newPreferredLanguage: "English",
      newNatureOfOccupation: "Permanent"
    };

    try {
      if (isEditMode) {
        await axios.put(`http://localhost:8080/api/v2/updateRequest/${editId}`, payload);
        alert("Updated!");
      } else {
        await axios.post('http://localhost:8080/api/v2/saveRequests', payload);
        alert("Saved!");
      }
      router.push('/membership/profile-changes');
    } catch (error: any) {
      alert("Error: " + (error.response?.data?.message || "Server Error"));
    } finally {
      setIsSubmitting(false);
    }
  };

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
            {isEditMode ? `Update Request PCR-${editId}` : "New Profile Change Request"}
          </h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-[#8B3205] text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-[#722904] transition-all"
        >
          {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
          {isEditMode ? "💾 Update" : "💾 Submit"}
        </button>
      </div>

      {loadError && (
        <div className="max-w-6xl mx-auto mb-4 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          ⚠️ {loadError}
        </div>
      )}

      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
        <ComparisonRow label="DATE OF BIRTH" current={INITIAL_MEMBER_DATA.dob} value={formData.dob} isInput type="date" onChange={(v: string) => handleFieldChange("dob", v)} error={errors.dob} />
        <ComparisonRow label="NIC NUMBER" current={INITIAL_MEMBER_DATA.nic} value={formData.nic} isInput onChange={(v: string) => handleFieldChange("nic", v)} error={errors.nic} />
        <ComparisonRow label="MOBILE" current={INITIAL_MEMBER_DATA.mobile} value={formData.mobile} isInput onChange={(v: string) => handleFieldChange("mobile", v)} error={errors.mobile} />
        <ComparisonRow label="ADDRESS" current={INITIAL_MEMBER_DATA.address} value={formData.address} isInput onChange={(v: string) => handleFieldChange("address", v)} error={errors.address} />
        <ComparisonRow label="EMAIL" current={INITIAL_MEMBER_DATA.email} value={formData.email} isInput onChange={(v: string) => handleFieldChange("email", v)} error={errors.email} />
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
}

// 4. ComparisonRow Sub-component
function ComparisonRow({ label, current, value, onChange, isInput, type = "text", error }: ComparisonRowProps) {
  return (
    <div className="grid grid-cols-2 gap-12 border-b border-gray-50 pb-4">
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label} (CURRENT)</label>
        <p className="text-gray-800 font-medium">{current}</p>
      </div>
      <div>
        <label className={`text-[10px] font-bold uppercase tracking-wider ${error ? 'text-red-500' : 'text-blue-600'}`}>
          {label} (NEW)
        </label>
        <input
          type={type}
          className={`w-full p-2 border rounded text-sm transition-all outline-none ${error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-1 focus:ring-blue-400'}`}
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
        />
        {error && <p className="text-[11px] text-red-600 mt-1 font-medium italic">⚠️ {error}</p>}
      </div>
    </div>
  );
}