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
    defaultValues: {
      designationNew: "",
      natureOfOccupationNew: "",
      workingLocationTypeNew: "",
      workingLocationNew: "",
      educationalZoneNew: "",
      educationalDistrictNew: "",
      computerNoNameNew: "",
      salaryPayingOfficeNew: "",
    },
  });

  useEffect(() => {
    const fetchOldValues = async () => {
      try {
        // Replace this mock with your backend API call
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
      } catch (error) {
        console.error("Failed to load member transfer data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOldValues();
  }, [reset]);

  const onSubmit = (data: MemberTransferFormData) => {
    if (!oldValues) return;

    const payload = {
      oldValues,
      newValues: {
        fullNameNew: oldValues.fullName,
        dateOfBirthNew: oldValues.dateOfBirth,
        nicNumberNew: oldValues.nicNumber,
        genderNew: oldValues.gender,
        preferredLanguageNew: oldValues.preferredLanguage,
        permanentAddressNew: oldValues.permanentAddress,
        privateTelephoneNew: oldValues.privateTelephone,
        mobileNumberNew: oldValues.mobileNumber,
        emailAddressNew: oldValues.emailAddress,
        designationNew: data.designationNew,
        natureOfOccupationNew: data.natureOfOccupationNew,
        workingLocationTypeNew: data.workingLocationTypeNew,
        workingLocationNew: data.workingLocationNew,
        educationalZoneNew: data.educationalZoneNew,
        educationalDistrictNew: data.educationalDistrictNew,
        computerNoNameNew: data.computerNoNameNew,
        salaryPayingOfficeNew: data.salaryPayingOfficeNew,
      },
    };

    console.log("SUBMIT MEMBER TRANSFER:", payload);

    // Example:
    // await fetch("/api/member-transfer", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(payload),
    // });
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!oldValues) {
    return <div className="p-6 text-red-600">Failed to load member data.</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#953002]">Member Transfer</h1>
          <br/>
          <p className="text-sm text-gray-500">Change Details</p>
        </div>

        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={!isValid}
          className="bg-[#953002] text-white hover:bg-[#7a2500] disabled:opacity-50"
        >
          Submit
        </Button>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FieldPair
            oldLabel="FULL NAME (CURRENT)"
            oldValue={oldValues.fullName}
            newLabel="FULL NAME (NEW)"
            newValue={oldValues.fullName}
            disabled
          />

          <FieldPair
            oldLabel="DATE OF BIRTH (CURRENT)"
            oldValue={oldValues.dateOfBirth}
            newLabel="DATE OF BIRTH (NEW)"
            newValue={oldValues.dateOfBirth}
            disabled
          />

          <FieldPair
            oldLabel="NIC NUMBER (CURRENT)"
            oldValue={oldValues.nicNumber}
            newLabel="NIC NUMBER (NEW)"
            newValue={oldValues.nicNumber}
            disabled
          />

          <FieldPair
            oldLabel="GENDER (CURRENT)"
            oldValue={oldValues.gender}
            newLabel="GENDER (NEW)"
            newValue={oldValues.gender}
            disabled
          />

          <FieldPair
            oldLabel="PREFERRED LANGUAGE (CURRENT)"
            oldValue={oldValues.preferredLanguage}
            newLabel="PREFERRED LANGUAGE (NEW)"
            newValue={oldValues.preferredLanguage}
            disabled
          />

          <FieldPair
            oldLabel="PERMANENT ADDRESS (CURRENT)"
            oldValue={oldValues.permanentAddress}
            newLabel="PERMANENT ADDRESS (NEW)"
            newValue={oldValues.permanentAddress}
            disabled
          />

          <FieldPair
            oldLabel="PRIVATE TELEPHONE (CURRENT)"
            oldValue={oldValues.privateTelephone}
            newLabel="PRIVATE TELEPHONE (NEW)"
            newValue={oldValues.privateTelephone}
            disabled
          />

          <FieldPair
            oldLabel="MOBILE NUMBER (CURRENT)"
            oldValue={oldValues.mobileNumber}
            newLabel="MOBILE NUMBER (NEW)"
            newValue={oldValues.mobileNumber}
            disabled
          />

          <FieldPair
            oldLabel="EMAIL ADDRESS (CURRENT)"
            oldValue={oldValues.emailAddress}
            newLabel="EMAIL ADDRESS (NEW)"
            newValue={oldValues.emailAddress}
            disabled
          />

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-gray-500">
              DESIGNATION (CURRENT)
            </label>
            <Input value={oldValues.designation} disabled />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-blue-700">
              DESIGNATION (NEW)
            </label>
            <select
              {...register("designationNew")}
              className="h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Select designation</option>
              <option value="Teacher">Teacher</option>
              <option value="Principal">Principal</option>
              <option value="Lecturer">Lecturer</option>
              <option value="Administrator">Administrator</option>
            </select>
            {errors.designationNew && (
              <p className="text-sm text-red-500">
                {errors.designationNew.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-gray-500">
              NATURE OF OCCUPATION (CURRENT)
            </label>
            <Input value={oldValues.natureOfOccupation} disabled />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-blue-700">
              NATURE OF OCCUPATION (NEW)
            </label>
            <select
              {...register("natureOfOccupationNew")}
              className="h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Select nature of occupation</option>
              <option value="Permanent">Permanent</option>
              <option value="Probation">Probation</option>
              <option value="Temporary">Temporary</option>
              <option value="Casual">Casual</option>
            </select>
            {errors.natureOfOccupationNew && (
              <p className="text-sm text-red-500">
                {errors.natureOfOccupationNew.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-gray-500">
              WORKING LOCATION TYPE (CURRENT)
            </label>
            <Input value={oldValues.workingLocationType} disabled />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-blue-700">
              WORKING LOCATION TYPE (NEW)
            </label>
            <select
              {...register("workingLocationTypeNew")}
              className="h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Select working location type</option>
              <option value="School">School</option>
              <option value="Office">Office</option>
              <option value="Institute">Institute</option>
            </select>
            {errors.workingLocationTypeNew && (
              <p className="text-sm text-red-500">
                {errors.workingLocationTypeNew.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-gray-500">
              WORKING LOCATION (CURRENT)
            </label>
            <Input value={oldValues.workingLocation} disabled />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-blue-700">
              WORKING LOCATION (NEW)
            </label>
            <Input {...register("workingLocationNew")} />
            {errors.workingLocationNew && (
              <p className="text-sm text-red-500">
                {errors.workingLocationNew.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-gray-500">
              EDUCATIONAL ZONE (CURRENT)
            </label>
            <Input value={oldValues.educationalZone} disabled />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-blue-700">
              EDUCATIONAL ZONE (NEW)
            </label>
            <Input {...register("educationalZoneNew")} />
            {errors.educationalZoneNew && (
              <p className="text-sm text-red-500">
                {errors.educationalZoneNew.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-gray-500">
              EDUCATIONAL DISTRICT (CURRENT)
            </label>
            <Input value={oldValues.educationalDistrict} disabled />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-blue-700">
              EDUCATIONAL DISTRICT (NEW)
            </label>
            <Input {...register("educationalDistrictNew")} />
            {errors.educationalDistrictNew && (
              <p className="text-sm text-red-500">
                {errors.educationalDistrictNew.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-gray-500">
              COMPUTER NO IN PAYSLIP (CURRENT)
            </label>
            <Input value={oldValues.computerNoName} disabled />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-blue-700">
              COMPUTER NO IN PAYSLIP (NEW)
            </label>
            <Input {...register("computerNoNameNew")} />
            {errors.computerNoNameNew && (
              <p className="text-sm text-red-500">
                {errors.computerNoNameNew.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-gray-500">
              SALARY PAYING OFFICE (CURRENT)
            </label>
            <Input value={oldValues.salaryPayingOffice} disabled />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-blue-700">
              SALARY PAYING OFFICE (NEW)
            </label>
            <select
              {...register("salaryPayingOfficeNew")}
              className="h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Select salary paying office</option>
              <option value="Zonal Education Office">Zonal Education Office</option>
              <option value="Provincial Education Office">Provincial Education Office</option>
              <option value="Ministry of Education">Ministry of Education</option>
              <option value="Divisional Education Office">Divisional Education Office</option>
            </select>
            {errors.salaryPayingOfficeNew && (
              <p className="text-sm text-red-500">
                {errors.salaryPayingOfficeNew.message}
              </p>
            )}
          </div>
        </div>
        <br />

        <section className="space-y-6 rounded-lg border bg-white p-6">

        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
            <Document />
        </div>
        </section>
      </div>
      
    </div>
  );
}


type FieldPairProps = {
  oldLabel: string;
  oldValue: string;
  newLabel: string;
  newValue: string;
  disabled?: boolean;
};

function FieldPair({
  oldLabel,
  oldValue,
  newLabel,
  newValue,
  disabled = true,
}: FieldPairProps) {
  return (
    <>
      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase text-gray-500">
          {oldLabel}
        </label>
        <Input value={oldValue} disabled />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase text-blue-700">
          {newLabel}
        </label>
        <Input value={newValue} disabled={disabled} readOnly />
      </div>
    </>
  );
}