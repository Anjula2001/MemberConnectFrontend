"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import {
  memberTransferSchema,
  type MemberTransferFormData,
} from "@/lib/validators/membertransfer.schema";
import { Button } from "../ui/button";
import Document from "../UniSholarships/Document"; 

type MemberTransferOldValues = {
  fullName: string;
  dateOfBirth: string;
  nicNumber: string;
  gender: string;
  preferredLanguage: string;
  permanentAddress: string;
  privateTelephone: string;
  mobileNumber: string;
  emailAddress: string;
  designation: string;
  natureOfOccupation: string;
  workingLocationType: string;
  workingLocation: string;
  educationalZone: string;
  educationalDistrict: string;
  computerNoName: string;
  salaryPayingOffice: string;
};

export default function ChangeMemberTransferForm() {
  const [loading, setLoading] = useState(true);
  const [oldValues, setOldValues] = useState<MemberTransferOldValues | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<MemberTransferFormData>({
    resolver: zodResolver(memberTransferSchema),
    mode: "onChange",
  });

  useEffect(() => {
    const fetchOldValues = async () => {
      const data: MemberTransferOldValues = {
        fullName: "K.H.G.L.S. Kumari",
        dateOfBirth: "1985-05-20",
        nicNumber: "851401234V",
        gender: "Female",
        preferredLanguage: "English",
        permanentAddress: "123, Galle Road, Colombo 03",
        privateTelephone: "0112345678",
        mobileNumber: "0771234567",
        emailAddress: "info@example.com",
        designation: "Teacher",
        natureOfOccupation: "Permanent",
        workingLocationType: "School",
        workingLocation: "Royal College",
        educationalZone: "Colombo South",
        educationalDistrict: "Colombo",
        computerNoName: "PC-001",
        salaryPayingOffice: "Zonal Education Office",
      };

      setOldValues(data);

      reset({
        designationNew: data.designation,
        natureOfOccupationNew: data.natureOfOccupation,
        workingLocationTypeNew: data.workingLocationType,
        workingLocationNew: data.workingLocation,
        educationalZoneNew: data.educationalZone,
        educationalDistrictNew: data.educationalDistrict,
        computerNoNameNew: data.computerNoName,
        salaryPayingOfficeNew: data.salaryPayingOffice,
      });

      setLoading(false);
    };

    fetchOldValues();
  }, [reset]);

  const onSubmit = (data: MemberTransferFormData) => {
    console.log("SUBMIT:", data);
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!oldValues) return <div className="p-6 text-red-600">Error loading data</div>;

  return (
    <div className="mx-auto max-w-5xl px-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#953002]">
            Member Transfer
          </h1>
          <p className="text-sm text-gray-500">Change Details</p>
        </div>

        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={!isValid}
          className="bg-[#953002] text-white hover:bg-[#7a2500]"
        >
          Submit
        </Button>
      </div>

      {/* ===================== SECTION 1: FORM ===================== */}
      <section className="rounded-lg border bg-white p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          <FieldPair oldLabel="FULL NAME" oldValue={oldValues.fullName} newLabel="FULL NAME" newValue={oldValues.fullName} disabled />
          <FieldPair oldLabel="DATE OF BIRTH" oldValue={oldValues.dateOfBirth} newLabel="DATE OF BIRTH" newValue={oldValues.dateOfBirth} disabled />
          <FieldPair oldLabel="NIC NUMBER" oldValue={oldValues.nicNumber} newLabel="NIC NUMBER" newValue={oldValues.nicNumber} disabled />
          <FieldPair oldLabel="GENDER" oldValue={oldValues.gender} newLabel="GENDER" newValue={oldValues.gender} disabled />

          {/* DESIGNATION */}
          <EditableSelect
            label="DESIGNATION"
            oldValue={oldValues.designation}
            register={register("designationNew")}
            error={errors.designationNew?.message}
            options={["Teacher", "Principal", "Lecturer", "Administrator"]}
          />

          {/* NATURE */}
          <EditableSelect
            label="NATURE OF OCCUPATION"
            oldValue={oldValues.natureOfOccupation}
            register={register("natureOfOccupationNew")}
            error={errors.natureOfOccupationNew?.message}
            options={["Permanent", "Probation", "Temporary", "Casual"]}
          />

          {/* LOCATION TYPE */}
          <EditableSelect
            label="WORKING LOCATION TYPE"
            oldValue={oldValues.workingLocationType}
            register={register("workingLocationTypeNew")}
            error={errors.workingLocationTypeNew?.message}
            options={["School", "Office", "Institute"]}
          />

          {/* TEXT FIELDS */}
          <EditableInput label="WORKING LOCATION" oldValue={oldValues.workingLocation} register={register("workingLocationNew")} error={errors.workingLocationNew?.message} />
          <EditableInput label="EDUCATIONAL ZONE" oldValue={oldValues.educationalZone} register={register("educationalZoneNew")} error={errors.educationalZoneNew?.message} />
          <EditableInput label="EDUCATIONAL DISTRICT" oldValue={oldValues.educationalDistrict} register={register("educationalDistrictNew")} error={errors.educationalDistrictNew?.message} />
          <EditableInput label="COMPUTER NO" oldValue={oldValues.computerNoName} register={register("computerNoNameNew")} error={errors.computerNoNameNew?.message} />

          {/* SALARY */}
          <EditableSelect
            label="SALARY PAYING OFFICE"
            oldValue={oldValues.salaryPayingOffice}
            register={register("salaryPayingOfficeNew")}
            error={errors.salaryPayingOfficeNew?.message}
            options={[
              "Zonal Education Office",
              "Provincial Education Office",
              "Ministry of Education",
            ]}
          />

        </div>
      </section>

      {/* ===================== SECTION 2: DOCUMENT ===================== */}
      <section className="rounded-lg border bg-white p-6 space-y-4">
        <h3 className="text-lg font-semibold text-[#953002]">
          Documents
        </h3>

        <div className="border border-dashed rounded-lg p-6 text-center text-gray-500">
          <Document />
        </div>
      </section>

    </div>
  );
}

/* ---------------- Components ---------------- */

function FieldPair({ oldLabel, oldValue, newLabel, newValue, disabled = true }: any) {
  return (
    <>
      <div>
        <label className="text-xs text-gray-500">{oldLabel} (Current)</label>
        <Input value={oldValue} disabled />
      </div>
      <div>
        <label className="text-xs text-blue-600">{newLabel} (New)</label>
        <Input value={newValue} disabled={disabled} readOnly />
      </div>
    </>
  );
}

function EditableInput({ label, oldValue, register, error }: any) {
  return (
    <>
      <div>
        <label className="text-xs text-gray-500">{label} (Current)</label>
        <Input value={oldValue} disabled />
      </div>
      <div>
        <label className="text-xs text-blue-600">{label} (New)</label>
        <Input {...register} />
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </>
  );
}

function EditableSelect({ label, oldValue, register, error, options }: any) {
  return (
    <>
      <div>
        <label className="text-xs text-gray-500">{label} (Current)</label>
        <Input value={oldValue} disabled />
      </div>
      <div>
        <label className="text-xs text-blue-600">{label} (New)</label>
        <select {...register} className="w-full border rounded-md h-10 px-2">
          <option value="">Select</option>
          {options.map((o: string) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </>
  );
}