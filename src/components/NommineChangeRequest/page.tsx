'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// --- 1. Zod Schema Definition ---
const nomineeSchema = z.object({
  newNomineeName: z.string().min(3, "Full name is required (min 3 characters)"),
  relationship: z.string().min(1, "Please select a relationship"),
  nic: z.string().min(10, "NIC/ID must be at least 10 characters"),
  address: z.string().min(5, "Address is too short"),
});

interface SectionCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function NomineeChangeRequest({ editId }: { editId?: string }) {
  const router = useRouter();
  const isEditMode = Boolean(editId);

  const INTIAL_NOMINEE_DATA = {
    newNomineeName: 'Vihanga',
    relationship: '',
    nic: '',
    address: ''
  };

  const [mounted, setMounted] = useState(false);

  // --- 2. State Management ---
  const [formData, setFormData] = useState({ ...INTIAL_NOMINEE_DATA, Language: 'English' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    if (editId) {
      const fetchRequest = async () => {
        setLoadingRequest(true);
        try {
          const response = await axios.get(`http://localhost:8080/api/v3/getnommineById/${editId}`);
          const data = response.data.data || response.data;

          if (data) {
            setFormData({
              newNomineeName: data.newNommineName || data.newNomineeName || "",
              relationship: data.newRelationship || data.relationship || "",
              nic: data.newNomineeNIC || data.nic || "",
              address: data.newNomineeAddress || data.address || "",
              Language: 'English'
            });
          }
        } catch (err: any) {
          console.error("API Error details:", err.response || err);
          const status = err.response?.status;
          const url = `http://localhost:8080/api/v3/getnommineById/${editId}`;
          const msg = `Failed to fetch ${url} (Status: ${status}). Please check your Spring Boot console for exact parameter mismatch errors.`;
          setLoadError(msg);
        } finally {
          setLoadingRequest(false);
        }
      };
      fetchRequest();
    }
  }, [editId]);

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
    const payload = {
      newnommineeName: formData.newNomineeName,
      relationship: formData.relationship,
      nic: formData.nic,
      address: formData.address,

    };

    try {
      if (isEditMode) {
        await axios.put(`http://localhost:8080/api/v3/updateNommine/${editId}`, payload);
        alert("Nominee change request updated successfully!");
        router.push('/membership/profile-changes');
      } else {
        await axios.post('http://localhost:8080/api/v3/saveNommine', payload);
        alert("Nominee change request submitted successfully!");
      }
    } catch (error: any) {
      console.error(error);
      alert("Submission failed: " + (error.response?.data?.message || "Server error"));
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
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#8A4C27]">
                {isEditMode ? "Edit Nominee Change Request" : "New Nominee Change Request"}
              </h1>
              <span className="bg-[#EAEBED] px-2 py-0.5 rounded text-[12px] text-slate-600 font-mono inline-block mt-1">
                Johnathan Doe (MB-2023001)
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-6 py-2 rounded-lg flex items-center gap-2 font-semibold transition-colors ${isSubmitting ? 'bg-slate-400' : 'bg-[#8A4C27] hover:bg-[#733F20]'
                } text-white`}
            >
              <Send size={18} /> {isSubmitting ? "Updating..." : "Submit Request"}
            </button>
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
            <ReadonlyField label="Nominee Name" value="Not Set" />
            <ReadonlyField label="Relationship" value="Not Set" />
            <ReadonlyField label="NIC / ID" value="Not Set" />
            <ReadonlyField label="Address" value="Not Set" />
          </div>
        </SectionCard>

        {/* Section 2: New Nominee Details */}
        <SectionCard title="New Nominee Details" subtitle="Enter updated nominee information">
          <div className="space-y-5">

            <InputField
              label="Nominee Full Name *"
              placeholder="Enter nominee's full name"
              value={formData.newNomineeName}
              onChange={(val: string) => handleFieldChange('newNomineeName', val)}
              error={errors.newNomineeName}
            />

            <div className="flex flex-col gap-2">
              <label className={`text-sm font-semibold ${errors.relationship ? 'text-red-500' : 'text-slate-700'}`}>Relationship *</label>
              <div className="relative">
                <select
                  value={formData.relationship}
                  onChange={(e) => handleFieldChange('relationship', e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-lg border appearance-none bg-white focus:outline-none transition-all ${errors.relationship ? 'border-red-500 ring-1 ring-red-50' : 'border-slate-200 focus:border-[#8A4C27]'
                    }`}
                >
                  <option value="">Select relationship</option>
                  <option value="spouse">Spouse</option>
                  <option value="child">Child</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
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
          <div className="w-full border-2 border-dashed border-slate-200 rounded-xl py-10 bg-slate-50 flex justify-center items-center hover:bg-white hover:border-[#8A4C27]/30 transition-all cursor-pointer group">
            <span className="text-slate-400 italic text-sm group-hover:text-slate-500">Document upload functionality (Mock)</span>
          </div>
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