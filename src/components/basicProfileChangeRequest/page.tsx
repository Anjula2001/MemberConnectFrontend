"use client";

import React, { useState } from 'react';
import { ArrowLeft, UploadCloud } from 'lucide-react';
import { z } from "zod";

export const profileSchema = z.object({
  dob: z.string().min(1, "Date of birth is required"),
  nic: z.string().min(10, "Invalid NIC"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  email: z.string().email("Invalid email address"),
  mobile: z.string()
    .min(10, "Mobile number must be 10 digits")
    .regex(/^[0-9]+$/, "Only digits allowed"),
});

export default function ProfileChangeDetail() {
  const INITIAL_MEMBER_DATA = {
    dob: "1985-05-20",
    nic: "851401234V",
    gender: "Male",
    language: "-",
    address: "123, Galle Road, Colombo 03",
    mobile: "0771234567",
    email: "john.doe@example.com",
    designation: "Teacher",
    occupation: "Permanent"
  };

  const [formData, setFormData] = useState({ ...INITIAL_MEMBER_DATA, language: 'English' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    const schemaShape = (profileSchema.shape as any);
    
    if (schemaShape[field]) {
      const result = schemaShape[field].safeParse(value);
      
      if (!result.success) {
        const errorMessage = result.error.errors?.[0]?.message || "Invalid input";
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

  const handleSubmit = () => {
    const result = profileSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const fieldName = err.path[0]?.toString();
        if (fieldName) {
          fieldErrors[fieldName] = err.message;
        }
      });
      setErrors(fieldErrors);
      alert("Please fix the highlighted errors before submitting.");
    } else {
      alert("Form submitted successfully!");
      console.log("Validated Data:", result.data);
    }
  };

  return (
    <div className="bg-[#F9FAFB] min-h-screen p-4 md:p-8 font-sans text-gray-900">
      
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#8B3205]">Basic Profile Change Request</h1>
            <p className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded mt-1 inline-block">
              Member: Johnathan Doe (MB-2023001)
            </p>
          </div>
        </div>
        <button 
          onClick={handleSubmit}
          className="bg-[#8B3205] text-white px-6 py-2 rounded-lg flex items-center gap-2 font-semibold shadow-md hover:bg-[#722904]"
        >
          💾 Submit Request
        </button>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-bold text-[#8B3205] mb-1">Change Details</h2>
          <p className="text-sm text-gray-400 mb-8">Review current vs new values</p>

          <div className="space-y-6">
            <ComparisonRow 
              label="DATE OF BIRTH" 
              current={INITIAL_MEMBER_DATA.dob} 
              isInput type="date"
              value={formData.dob} 
              onChange={(val) => handleFieldChange("dob", val)} 
              error={errors.dob} 
            />
            
            <ComparisonRow 
              label="NIC NUMBER" 
              current={INITIAL_MEMBER_DATA.nic} 
              isInput
              value={formData.nic} 
              onChange={(val) => handleFieldChange("nic", val)} 
              error={errors.nic} 
            />

            <ComparisonRow 
              label="MOBILE NUMBER" 
              current={INITIAL_MEMBER_DATA.mobile} 
              isInput
              value={formData.mobile} 
              onChange={(val) => handleFieldChange("mobile", val)} 
              error={errors.mobile} 
            />

            <ComparisonRow 
              label="PERMANENT ADDRESS" 
              current={INITIAL_MEMBER_DATA.address} 
              isInput
              value={formData.address} 
              onChange={(val) => handleFieldChange("address", val)} 
              error={errors.address} 
            />

            <ComparisonRow 
              label="EMAIL ADDRESS" 
              current={INITIAL_MEMBER_DATA.email} 
              isInput
              value={formData.email} 
              onChange={(val) => handleFieldChange("email", val)} 
              error={errors.email} 
            />
          </div>
        </div>

        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-bold text-[#8B3205] mb-6">Documents</h2>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer text-center">
            <UploadCloud className="w-10 h-10 text-gray-300 mb-4" />
            <p className="text-gray-400 text-sm font-medium">Upload supporting documents here</p>
          </div>
        </div>
      </div>
    </div>
  );
}


interface ComparisonRowProps {
  label: string;
  current: string | number;
  value: string | number;
  onChange: (val: string) => void;
  isInput?: boolean;
  type?: string;
  error?: string; 
}

function ComparisonRow({ label, current, value, onChange, isInput, type = "text", error }: ComparisonRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-gray-50 pb-4 mb-2">
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label} (CURRENT)</label>
        <p className="text-gray-800 font-medium">{current}</p>
      </div>

      <div>
        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${error ? 'text-red-500' : 'text-blue-600'}`}>
          {label} (NEW)
        </label>
        
        {isInput && (
          <input
            type={type}
            className={`w-full p-2 border rounded text-sm outline-none transition-all ${
              error ? "border-red-500 ring-1 ring-red-100 bg-red-50" : "border-gray-200 focus:ring-1 focus:ring-blue-400"
            }`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}

        {error && (
          <p className="text-[11px] text-red-600 mt-1 font-medium italic flex items-center gap-1">
            <span>⚠️</span> {error}
          </p>
        )}
      </div>
    </div>
  );
}