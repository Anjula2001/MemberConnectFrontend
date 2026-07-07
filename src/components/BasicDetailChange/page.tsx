"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { z } from "zod";
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { getMemberById } from '@/lib/api/member';

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

type ProfileData = {
  dob: string;
  nic: string;
  gender: string;
  address: string;
  mobile: string;
  email: string;
  language?: string;
  designation?: string;
  occupation?: string;
};

export default function BasicDetailChange({ editId, memberId }: { editId?: string; memberId?: string }) {
  const router = useRouter();
  const isEditMode = Boolean(editId);

  const INITIAL_MEMBER_DATA: ProfileData = {
    dob: "1985-05-20",
    nic: "851401234V",
    gender: "Male",
    address: "123, Galle Road, Colombo 03",
    mobile: "0771234567",
    email: "john.doe@example.com",
    language: 'English',
    designation: 'Teacher',
    occupation: 'Permanent',
  };

  const STATUS_OPTIONS = [
    { value: 'ADDED_TO_BOARD_APPROVAL_LIST', label: 'Added to Board Approval List' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'PENDING', label: 'Pending' },
  ];

  const [mounted, setMounted] = useState(false);
  const [memberName, setMemberName] = useState<string | null>(null);
  const [currentData, setCurrentData] = useState<ProfileData>(INITIAL_MEMBER_DATA);
  const [formData, setFormData] = useState<ProfileData>({ ...INITIAL_MEMBER_DATA });
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
          const response = await axios.get(`http://localhost:8080/api/v2/getRequest/${editId}`);
          const data = response.data.data || response.data;

          if (data) {
            const mapped = {
              dob: data.newBirthDate || INITIAL_MEMBER_DATA.dob,
              nic: data.newNIC || INITIAL_MEMBER_DATA.nic,
              gender: data.newGender || INITIAL_MEMBER_DATA.gender,
              address: data.newPermanentPrivateAddress || INITIAL_MEMBER_DATA.address,
              mobile: data.newMobileNumber || INITIAL_MEMBER_DATA.mobile,
              email: data.newEmailAddress || INITIAL_MEMBER_DATA.email,
              language: data.newPreferredLanguage || INITIAL_MEMBER_DATA.language,
              designation: data.newDesignation || INITIAL_MEMBER_DATA.designation,
              occupation: data.newNatureOfOccupation || INITIAL_MEMBER_DATA.occupation,
            };
            setCurrentData(mapped);
            setFormData(mapped);
            setSelectedStatus(data.status || data.newStatus || '');
          }
        } else if (memberId) {
          const data = await getMemberById(Number(memberId));
          const mapped = {
            dob: data.dateOfBirth ?? INITIAL_MEMBER_DATA.dob,
            nic: data.nic ?? data.identificationNumber ?? INITIAL_MEMBER_DATA.nic,
            gender: data.gender ?? INITIAL_MEMBER_DATA.gender,
            address: data.permanentPrivateAddress ?? INITIAL_MEMBER_DATA.address,
            mobile: data.mobileNumber ?? INITIAL_MEMBER_DATA.mobile,
            email: data.emailAddress ?? INITIAL_MEMBER_DATA.email,
            language: data.preferredLanguage ?? INITIAL_MEMBER_DATA.language,
            designation: data.designation ?? INITIAL_MEMBER_DATA.designation,
            occupation: data.natureOfOccupation ?? INITIAL_MEMBER_DATA.occupation,
          };
          setCurrentData(mapped);
          setFormData(mapped);
          setMemberName(data.fullName ?? data.nameWithInitials ?? null);
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

  const handleSubmit = async () => {
    if (!validateBeforeSubmit()) return;

    setIsSubmitting(true);

    // Build payload with every new field value so the backend gets current data as new if user did not change it.
    const payload: Record<string, unknown> = {
      newBirthDate: formData.dob,
      newNIC: formData.nic,
      newGender: formData.gender,
      newPermanentPrivateAddress: formData.address,
      newMobileNumber: formData.mobile,
      newEmailAddress: formData.email,
      newPreferredLanguage: formData.language,
      newDesignation: formData.designation,
      newNatureOfOccupation: formData.occupation,
    };

    if (isEditMode) {
      if (Object.keys(payload).length === 0) {
        alert('No changes provided. Please update at least one field or cancel.');
        setIsSubmitting(false);
        return;
      }
    }

    // Status and memberId
    if (isEditMode) {
      if (selectedStatus) payload.newStatus = selectedStatus;
    } else {
      payload.newStatus = 'SUBMITTED_FOR_APPROVAL';
      payload.createdDate = formatLocalDateTime(new Date());
    }
    if (memberId) payload.memberId = memberId;

    try {
      if (isEditMode) {
        await axios.put(`http://localhost:8080/api/v2/updateRequest/${editId}`, payload);
        alert("Updated!");
      } else {
        await axios.post('http://localhost:8080/api/v2/saveRequests', payload);
        alert("Saved!");
      }
      router.push('/membership/profile-changes');
    } catch (error: unknown) {
      // Try to extract a useful message from the error object
      let msg: string | undefined;
      if (typeof error === 'object' && error !== null) {
        type ErrorResponse = { response?: { data?: { message?: string; error?: string } } };
        const errObj = error as ErrorResponse;
        msg = errObj.response?.data?.message || errObj.response?.data?.error;
      }
      alert('Error: ' + (msg || 'Server Error'));
    } finally {
      setIsSubmitting(false);
    }
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
            {isEditMode ? `Update Request PCR-${editId}` : "New Profile Change Request"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {isEditMode && (
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-lg bg-white px-4 py-2 text-sm"
            >
              <option value="">Change status</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#8B3205] text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-[#722904] transition-all"
          >
            {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
            {isEditMode ? "💾 Update" : "💾 Submit"}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="max-w-6xl mx-auto mb-4 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          ⚠️ {loadError}
        </div>
      )}

      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
        <ComparisonRow label="DATE OF BIRTH" current={currentData.dob} value={formData.dob} isInput type="date" onChange={(v: string) => handleFieldChange("dob", v)} error={errors.dob} required={!Boolean(currentData.dob)} />
        <ComparisonRow label="NIC NUMBER" current={currentData.nic} value={formData.nic} isInput onChange={(v: string) => handleFieldChange("nic", v)} error={errors.nic} required={!Boolean(currentData.nic)} />
        <ComparisonRow label="GENDER" current={currentData.gender} value={formData.gender} isInput onChange={(v: string) => handleFieldChange("gender", v)} error={errors.gender} required={!Boolean(currentData.gender)} options={["Male", "Female"]} />
        <ComparisonRow label="PREFERRED LANGUAGE" current={currentData.language || ''} value={formData.language || ''} isInput onChange={(v: string) => handleFieldChange("language", v)} error={errors.language} required={!Boolean(currentData.language)} options={["Sinhala","Tamil","English"]} />
        <ComparisonRow label="DESIGNATION" current={currentData.designation || ''} value={formData.designation || ''} isInput onChange={(v: string) => handleFieldChange("designation", v)} error={errors.designation} required={!Boolean(currentData.designation)} />
        <ComparisonRow label="NATURE OF OCCUPATION" current={currentData.occupation || ''} value={formData.occupation || ''} isInput onChange={(v: string) => handleFieldChange("occupation", v)} error={errors.occupation} required={!Boolean(currentData.occupation)} options={["Permanent","Probation","Temporary","Casual"]} />
        <ComparisonRow label="MOBILE" current={currentData.mobile} value={formData.mobile} isInput onChange={(v: string) => handleFieldChange("mobile", v)} error={errors.mobile} required={!Boolean(currentData.mobile)} />
        <ComparisonRow label="ADDRESS" current={currentData.address} value={formData.address} isInput onChange={(v: string) => handleFieldChange("address", v)} error={errors.address} required={!Boolean(currentData.address)} />
        <ComparisonRow label="EMAIL" current={currentData.email} value={formData.email} isInput onChange={(v: string) => handleFieldChange("email", v)} error={errors.email} required={!Boolean(currentData.email)} />
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
  options?: string[];
  required?: boolean;
}

// 4. ComparisonRow Sub-component
function ComparisonRow({ label, current, value, onChange, isInput, type = "text", error, required = false, options }: ComparisonRowProps) {
  return (
    <div className="grid grid-cols-2 gap-12 border-b border-gray-50 pb-4">
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label} (CURRENT)</label>
        <p className="text-gray-800 font-medium">{current || <span className="text-gray-400">— no value</span>}</p>
      </div>
      <div>
        <label className={`text-[10px] font-bold uppercase tracking-wider ${error ? 'text-red-500' : 'text-blue-600'}`}>
          {label} (NEW){required && <span className="text-red-500"> *</span>}
        </label>
        {options && options.length > 0 ? (
          <select
            required={required}
            value={value || ""}
            onChange={(e) => onChange?.(e.target.value)}
            className={`w-full p-2 border rounded text-sm transition-all outline-none ${error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-1 focus:ring-blue-400'}`}
          >
            <option value="">Select</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            required={required}
            className={`w-full p-2 border rounded text-sm transition-all outline-none ${error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-1 focus:ring-blue-400'}`}
            value={value || ""}
            onChange={(e) => onChange?.(e.target.value)}
          />
        )}
        {error && <p className="text-[11px] text-red-600 mt-1 font-medium italic">⚠️ {error}</p>}
      </div>
    </div>
  );
}