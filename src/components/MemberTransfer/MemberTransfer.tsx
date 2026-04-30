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
import Document, { DocumentFileItem, RequiredDocType } from "../UniSholarships/Document"; 
import { useSearchParams } from "next/dist/client/components/navigation";

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

const emptyOldValues: MemberTransferOldValues = {
  fullName: "",
  dateOfBirth: "",
  nicNumber: "",
  gender: "",
  preferredLanguage: "",
  permanentAddress: "",
  privateTelephone: "",
  mobileNumber: "",
  emailAddress: "",
  designation: "",
  natureOfOccupation: "",
  workingLocationType: "",
  workingLocation: "",
  educationalZone: "",
  educationalDistrict: "",
  computerNoName: "",
  salaryPayingOffice: "",
};

export default function ChangeMemberTransferForm() {
  const HARDCODED_MEMBER_ID = 8;
  const [loading, setLoading] = useState(true);
  const [oldValues, setOldValues] = useState<MemberTransferOldValues | null>(null);

  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [documentFiles, setDocumentFiles] = useState<DocumentFileItem[]>([]);
  const [requiredDocumentTypes, setRequiredDocumentTypes] = useState<RequiredDocType[]>([]);
  const [member, setMember] = useState<any>(null);
  const [requestId, setRequestId] = useState<any>(null);
 
  const searchParams = useSearchParams();
  const requestKey = searchParams.get("requestId") ;
  const mode = searchParams.get("mode") ;

  const [status, setStatus] = useState<
      | "SUBMITTED_FOR_COMMITTEE_APPROVAL"
      | "SUBMITTED_FOR_DEVIATION_BOARD_APPROVAL"
      | "SUBMITTED_FOR_NORMAL_BOARD_APPROVAL"
      | "APPROVED"
      | "REJECTED"
    >("SUBMITTED_FOR_COMMITTEE_APPROVAL");
  const [isSaved, setIsSaved] = useState(false);

  const isSubmitted = status === "SUBMITTED_FOR_COMMITTEE_APPROVAL";

  const isViewMode =  Boolean(requestKey);
  const isInputsDisabled = isViewMode || isSubmitted;

  

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<MemberTransferFormData>({
    resolver: zodResolver(memberTransferSchema),
    mode: "onChange",
  });

  // Watch form values we need to react to
  const selectedWorkingLocationType = watch("workingLocationTypeNew");
  const selectedDistrict = watch("educationalDistrictNew");
  const selectedZone = watch("educationalZoneNew");
  const selectedWorkingLocation = watch("workingLocationNew");

  // Master data for dynamic selects
  const [workingLocationTypes, setWorkingLocationTypes] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [workingLocations, setWorkingLocations] = useState<any[]>([]);
  const [salaryOptions, setSalaryOptions] = useState<string[]>([]);
  const [isZoneEnabled, setIsZoneEnabled] = useState<boolean>(true);

  useEffect(() => {
    const fetchRequiredDocumentTypes = async () => {
      const res = await fetch(
        "http://localhost:8080/api/required-document-types/MEMBER_TRANSFER"
      );
      const data = await res.json();
      setRequiredDocumentTypes(data);
    };

    fetchRequiredDocumentTypes();
  }, []);

  // Fetch master data: working location types and districts
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [typesRes, districtsRes] = await Promise.all([
          fetch("http://localhost:8080/api/masters/working-location-types"),
          fetch("http://localhost:8080/api/masters/districts"),
      
        ]);

        if (typesRes.ok) setWorkingLocationTypes(await typesRes.json());
        if (districtsRes.ok) setDistricts(await districtsRes.json());
      } catch (err) {
        console.warn("Failed to load master data", err);
      }
    };

    fetchMasters();
  }, []);

  // When selectedWorkingLocationType changes: determine if zone is used and clear dependent fields
  useEffect(() => {
    if (!selectedWorkingLocationType) return;

    const foundType = workingLocationTypes.find(
      (t: any) => String(t.code || t.id) === String(selectedWorkingLocationType) || t.name === selectedWorkingLocationType
    );

    const usesZone = foundType ? Boolean(foundType.usesZone) : true;
    setIsZoneEnabled(usesZone);

    // Clear dependent fields when type changes
    setValue("educationalDistrictNew", "");
    setValue("educationalZoneNew", usesZone ? "" : "NA");
    setZones([]);
    setValue("workingLocationNew", "");
    setValue<any>("workingLocationAddressNew", "");
    setValue("salaryPayingOfficeNew", "");
    setWorkingLocations([]);
  }, [selectedWorkingLocationType, workingLocationTypes, setValue]);

  // When district changes: fetch zones for district and clear dependent fields
  useEffect(() => {
    if (!selectedDistrict) {
      setZones([]);
      return;
    }

    const fetchZones = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/masters/educational-zones?district=${encodeURIComponent(selectedDistrict)}`
        );
        if (res.ok) {
          const data = await res.json();
          setZones(data);
        } else {
          setZones([]);
        }
      } catch (err) {
        console.warn("Failed to load zones", err);
        setZones([]);
      }
    };

    // clear dependent values
    setValue("educationalZoneNew", "");
    setValue("workingLocationNew", "");
    setValue<any>("workingLocationAddressNew", "");
    setValue("salaryPayingOfficeNew", "");
    setWorkingLocations([]);

    if (isZoneEnabled) fetchZones();
  }, [selectedDistrict, isZoneEnabled, setValue]);

  // When zone or workingLocationType or district changes, fetch working locations filtered
  useEffect(() => {
    const fetchWorkingLocations = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedWorkingLocationType) params.append("type", selectedWorkingLocationType);
        if (selectedDistrict) params.append("district", selectedDistrict);
        if (isZoneEnabled && selectedZone) params.append("zone", selectedZone);

        const res = await fetch(
          `http://localhost:8080/api/masters/working-locations?${params.toString()}`
        );
        if (res.ok) {
          const data = await res.json();
          setWorkingLocations(data);
        } else {
          setWorkingLocations([]);
        }
      } catch (err) {
        console.warn("Failed to load working locations", err);
        setWorkingLocations([]);
      }
    };

    // Clear dependent values when zone/type/district change
    setValue("workingLocationNew", "");
    setValue<any>("workingLocationAddressNew", "");
    setValue("salaryPayingOfficeNew", "");
    setSalaryOptions([]);

    // Only fetch if we have a working type and district
    if (selectedWorkingLocationType && selectedDistrict) fetchWorkingLocations();
  }, [selectedWorkingLocationType, selectedDistrict, selectedZone, isZoneEnabled, setValue]);

  // When a working location is selected: autofill address and salary paying office
  useEffect(() => {
    if (!selectedWorkingLocation) return;

    const found = workingLocations.find(
      (w: any) => String(w.id) === String(selectedWorkingLocation) || w.name === selectedWorkingLocation
    );

      if (found) {
      setValue<any>("workingLocationAddressNew", found.address || found.locationAddress || "");
      // autofill salary paying office but leave editable
      if (found.salaryPayingOffice) {
        setValue("salaryPayingOfficeNew", found.salaryPayingOffice);
        setSalaryOptions([found.salaryPayingOffice]);
      }
    } else {
      // fallback: try fetch details
      (async () => {
        try {
          const res = await fetch(`http://localhost:8080/api/working-locations/${encodeURIComponent(selectedWorkingLocation)}`);
          if (res.ok) {
            const det = await res.json();
            setValue<any>("workingLocationAddressNew", det.address || det.locationAddress || "");
            if (det.salaryPayingOffice) {
              setValue("salaryPayingOfficeNew", det.salaryPayingOffice);
              setSalaryOptions([det.salaryPayingOffice]);
            }
          }
        } catch (err) {
          console.warn("Failed to load location details", err);
        }
      })();
    }
  }, [selectedWorkingLocation, workingLocations, setValue]);

  // Load member details 
  useEffect(() => {
    const fetchMember = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/members/${HARDCODED_MEMBER_ID}`
        );

        if (!res.ok) {
          throw new Error("Failed to load member");
        }

        const data = await res.json();
        setMember(data);

        setOldValues({
          fullName: data.fullName || data.name || "",
          dateOfBirth: data.dateOfBirth || data.dob || "",
          nicNumber: data.nicNumber || data.nic || "",
          gender: data.gender || "",
          preferredLanguage: data.preferredLanguage || data.language || "",
          permanentAddress: data.permanentAddress || data.address || "",
          privateTelephone: data.privateTelephone || data.telephone || "",
          mobileNumber: data.mobileNumber || data.mobile || "",
          emailAddress: data.emailAddress || data.email || "",
          designation: data.designation || "",
          natureOfOccupation: data.natureOfOccupation || "",
          workingLocationType: data.workingLocationType || "",
          workingLocation: data.workingLocation || "",
          educationalZone: data.educationalZone || "",
          educationalDistrict: data.educationalDistrict || "",
          computerNoName: data.computerNoName || data.computerNo || "",
          salaryPayingOffice: data.salaryPayingOffice || "",
        });
      } catch (error) {
        console.error("Failed to load member:", error);
        setOldValues(emptyOldValues);
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, []);

  useEffect(() => {
    setRequestId(requestKey);
  }, [requestKey]);

  useEffect(() => {
      if (!requestId) {
        setUploadedDocuments([]);
        return;
      }
  
      const fetchUploadedDocuments = async () => {
        try {
          const res = await fetch(
            `http://localhost:8080/api/uploaded-documents/by-request?requestId=${encodeURIComponent(
              requestId
            )}`
          );
  
          if (!res.ok) {
            console.warn("Failed to load documents:", res.status);
            setUploadedDocuments([]);
            return;
          }
  
          const docs = await res.json();
          console.log("Loaded documents:", docs);
          setUploadedDocuments(Array.isArray(docs) ? docs : []);
        } catch (error) {
          console.error("Failed to load documents:", error);
          setUploadedDocuments([]);
        }
      };
  
      fetchUploadedDocuments();
    }, [requestId]);


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
            options={workingLocationTypes.map((t: any) => t.name || t.label || t.id)}
          />

          {/* TEXT FIELDS */}
          <EditableSelect
            label="EDUCATIONAL DISTRICT"
            oldValue={oldValues.educationalDistrict}
            register={register("educationalDistrictNew")}
            error={errors.educationalDistrictNew?.message}
            options={districts.map((d: any) => d.name || d.label || d.id)}
          />

          <EditableSelect
            label="EDUCATIONAL ZONE"
            oldValue={oldValues.educationalZone}
            register={register("educationalZoneNew")}
            error={errors.educationalZoneNew?.message}
            options={isZoneEnabled ? zones.map((z: any) => z.name || z.label || z.id) : ["NA"]}
            disabled={!isZoneEnabled}
          />

          <EditableSelect
            label="WORKING LOCATION"
            oldValue={oldValues.workingLocation}
            register={register("workingLocationNew")}
            error={errors.workingLocationNew?.message}
            options={workingLocations.map((w: any) => w.name || w.label || w.id)}
          />

          <EditableInput
            label="WORKING LOCATION ADDRESS"
            oldValue={oldValues.permanentAddress}
            register={register("workingLocationAddressNew")}
            error={errors.workingLocationAddressNew?.message}
            value={watch("workingLocationAddressNew")}
            disabled
          />
          <EditableInput label="COMPUTER NO" oldValue={oldValues.computerNoName} register={register("computerNoNameNew")} error={errors.computerNoNameNew?.message} />

          {/* SALARY */}
          <EditableSelect
            label="SALARY PAYING OFFICE"
            oldValue={oldValues.salaryPayingOffice}
            register={register("salaryPayingOfficeNew")}
            error={errors.salaryPayingOfficeNew?.message}
            options={salaryOptions.length > 0 ? salaryOptions : [
              "Zonal Education Office",
              "Provincial Education Office",
              "Ministry of Education",
            ]}
          />

        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
          <h3 className="mb-4 text-xl font-bold text-[#953002]">
              Supporting Documents
          </h3>
      
          <div className="rounded-lg border border-dashed p-6 text-left text-sm text-gray-500">
            <Document
                requestId={requestId}
                disabled={isInputsDisabled}
                isSaved={isSaved}
                isSubmitted={isSubmitted}
                files={documentFiles}
                setFiles={setDocumentFiles}
                documentTypes={requiredDocumentTypes}
           />
          </div>
        </section>
      
        {uploadedDocuments.length > 0 && (
            <section className="rounded-lg border bg-white p-4">
              <h3 className="mb-4 text-xl font-bold text-[#953002]">
                Uploaded Documents
              </h3>
      
                    <div className="space-y-3">
                      {uploadedDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-start justify-between rounded-md border border-gray-200 bg-gray-50 p-3"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">
                              {doc.documentType || "Document"}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {doc.fileName || "Unnamed file"}
                            </p>
                            {doc.uploadedAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-3 inline-flex items-center justify-center rounded-md bg-[#953002] text-white px-3 py-1 text-xs font-medium hover:bg-[#7a2500] transition-colors"
                            >
                              View
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
    </div>
  );
}


function FieldPair({ oldLabel, oldValue, newLabel, newValue, disabled = true }: any) {
  return (
    <>
      <div>
        <label className="text-xs text-blue-600">{oldLabel} (Current)</label>
        <Input value={oldValue} disabled />
      </div>
      <div>
        <label className="text-xs text-blue-600">{newLabel} (New)</label>
        <Input value={newValue} disabled={disabled} readOnly />
      </div>
    </>
  );
}

function EditableInput({ label, oldValue, register, error, value, disabled = false }: any) {
  return (
    <>
      <div>
        <label className="text-xs text-blue-600">{label} (Current)</label>
        <Input value={oldValue} disabled />
      </div>
      <div>
        <label className="text-xs text-blue-600">{label} (New)</label>
        {typeof value !== "undefined" ? (
          <Input value={value} disabled={disabled} readOnly />
        ) : (
          <Input {...register} />
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </>
  );
}

function EditableSelect({ label, oldValue, register, error, options, disabled = false }: any) {
  const selectId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <>
      <div>
        <label className="text-xs text-blue-600">{label} (Current)</label>
        <Input value={oldValue} disabled />
      </div>
      <div>
        <label htmlFor={selectId} className="mb-1 block text-xs text-blue-600">
          {label} (New)
        </label>
        <select
          id={selectId}
          {...register}
          disabled={disabled}
          className="h-10 w-full rounded-md border px-3 text-sm"
        >
          <option value="">Select</option>
          {options.map((o: string) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </>
  );
}