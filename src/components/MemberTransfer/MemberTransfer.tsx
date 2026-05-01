"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2, UploadCloud } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "../ui/button";
import {
  memberTransferSchema,
  type MemberTransferFormData,
} from "@/lib/validators/membertransfer.schema";

type DocumentFileItem = {
  file: File;
  documentType: string;
  uploadedAt?: string;
  id?: number;
};

type RequiredDocType = {
  id: number;
  documentType: string;
  displayName: string;
  mandatory: boolean;
};

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

type MemberTransferRecord = {
  id?: number;
  requestId?: string;
  status?: string;
  incompleteReason?: string;
  decisionReason?: string;
  designationNew?: string;
  natureOfOccupationNew?: string;
  workingLocationTypeNew?: string;
  educationalDistrictNew?: string;
  educationalZoneNew?: string;
  workingLocationNew?: string;
  workingLocationAddressNew?: string;
  computerNoNameNew?: string;
  salaryPayingOfficeNew?: string;
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

const defaultDesignationOptions = [
  "Teacher",
  "Principal",
  "Lecturer",
  "Administrator",
];

const defaultNatureOfOccupationOptions = [
  "Permanent",
  "Probation",
  "Temporary",
  "Casual",
];

const formatDisplayValue = (value: any): string => {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(formatDisplayValue).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    return (
      value.name ||
      value.label ||
      value.value ||
      value.designation ||
      value.occupation ||
      value.address ||
      value.locationAddress ||
      value.fullName ||
      value.displayName ||
      value.id ||
      ""
    );
  }

  return String(value);
};

export default function ChangeMemberTransferForm() {
  const HARDCODED_MEMBER_ID = 8;

  const router = useRouter();
  const searchParams = useSearchParams();

  const requestKey = searchParams.get("requestId");
  const mode = searchParams.get("mode");
  const [requestId, setRequestId] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [oldValues, setOldValues] =
    useState<MemberTransferOldValues | null>(null);

  const [member, setMember] = useState<any>(null);
  const [loadedRecord, setLoadedRecord] =
    useState<MemberTransferRecord | null>(null);


  const [memberTransferRequestNo, setMemberTransferRequestNo] = useState("");

  const [status, setStatus] = useState<
    | "NEW"
    | "INCOMPLETE"
    | "SUBMITTED_FOR_COMMITTEE_APPROVAL"
    | "APPROVED"
    | "REJECTED"
  >("NEW");

  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [documentFiles, setDocumentFiles] = useState<DocumentFileItem[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [requiredDocumentTypes, setRequiredDocumentTypes] = useState<
    RequiredDocType[]
  >([]);

  const [designationOptions, setDesignationOptions] = useState<string[]>(
    defaultDesignationOptions
  );
  const [natureOfOccupationOptions, setNatureOfOccupationOptions] = useState<
    string[]
  >(defaultNatureOfOccupationOptions);
  const [workingLocationTypes, setWorkingLocationTypes] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [workingLocations, setWorkingLocations] = useState<any[]>([]);
  const [salaryOptions, setSalaryOptions] = useState<string[]>([]);
  const [isZoneEnabled, setIsZoneEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const isExistingRequest = Boolean(requestKey);
  const isSubmitted = status === "SUBMITTED_FOR_COMMITTEE_APPROVAL";
  const isEditableStatus = status === "NEW" || status === "INCOMPLETE";
  const isEditMode = isExistingRequest && mode === "edit" && isEditableStatus;
  const isViewMode = isExistingRequest && !isEditMode;
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

  const selectedWorkingLocationType = watch("workingLocationTypeNew");
  const selectedDistrict = watch("educationalDistrictNew");
  const selectedZone = watch("educationalZoneNew");
  const selectedWorkingLocation = watch("workingLocationNew");

  const whiteInputClass =
    "bg-white [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:inherit] [&:-webkit-autofill]:[caret-color:inherit]";

  const normalizeOptions = (items: any[], fallback: string[]) => {
    const options = items
      .map((item) => String(formatDisplayValue(item)).trim())
      .filter(Boolean);

    return options.length > 0 ? options : fallback;
  };

  useEffect(() => {
    const fetchRequiredDocumentTypes = async () => {
      try {
        const res = await fetch(
          "http://localhost:8080/api/required-document-types/MEMBER_TRANSFER"
        );

        if (!res.ok) throw new Error("Failed to load document types");

        const data = await res.json();
        setRequiredDocumentTypes(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchRequiredDocumentTypes();
  }, []);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [typesRes, districtsRes, designationsRes, occupationsRes] = await Promise.all([
          fetch("http://localhost:8080/api/masters/working-location-types"),
          fetch("http://localhost:8080/api/masters/districts"),
          fetch("http://localhost:8080/api/masters/designations"),
          fetch("http://localhost:8080/api/masters/nature-of-occupations"),
        ]);

        const [typesData, districtsData, designationsData, occupationsData] =
          await Promise.all([
            typesRes.ok ? typesRes.json() : Promise.resolve([]),
            districtsRes.ok ? districtsRes.json() : Promise.resolve([]),
            designationsRes.ok ? designationsRes.json() : Promise.resolve([]),
            occupationsRes.ok ? occupationsRes.json() : Promise.resolve([]),
          ]);

        setWorkingLocationTypes(typesData);
        setDistricts(districtsData);
        setDesignationOptions(
          normalizeOptions(designationsData, defaultDesignationOptions)
        );
        setNatureOfOccupationOptions(
          normalizeOptions(occupationsData, defaultNatureOfOccupationOptions)
        );
      } catch (error) {
        console.error("Failed to load master data:", error);
        setDesignationOptions(defaultDesignationOptions);
        setNatureOfOccupationOptions(defaultNatureOfOccupationOptions);
      }
    };

    fetchMasters();
  }, []);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/members/${HARDCODED_MEMBER_ID}`
        );

        if (!res.ok) throw new Error("Failed to load member");

        const data = await res.json();
        setMember(data);

        setOldValues({
          fullName: formatDisplayValue(data.fullName || data.name),
          dateOfBirth: formatDisplayValue(data.dateOfBirth || data.dob),
          nicNumber: formatDisplayValue(data.nicNumber || data.nic),
          gender: formatDisplayValue(data.gender),
          preferredLanguage: formatDisplayValue(
            data.preferredLanguage || data.language
          ),
          permanentAddress: formatDisplayValue(
            data.permanentPrivateAddress || data.address
          ),
          privateTelephone: formatDisplayValue(
            data.privateTelephone || data.telephone
          ),
          mobileNumber: formatDisplayValue(data.mobileNumber || data.mobile),
          emailAddress: formatDisplayValue(data.emailAddress || data.email),
          designation: formatDisplayValue(data.designation),
          natureOfOccupation: formatDisplayValue(data.natureOfOccupation),
          workingLocationType: formatDisplayValue(data.workingLocationType),
          workingLocation: formatDisplayValue(data.workingLocation),
          educationalZone: formatDisplayValue(data.educationalZone),
          educationalDistrict: formatDisplayValue(data.educationalDistrict),
          computerNoName: formatDisplayValue(data.computerNoName || data.computerNo),
          salaryPayingOffice: formatDisplayValue(data.salaryPayingOffice),
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
    if (!requestKey) {
      setLoadedRecord(null);
      return;
    }

    const fetchRequest = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/member-transfers");

        if (!res.ok) throw new Error("Failed to load member transfer request");

        const data: MemberTransferRecord[] = await res.json();

        const found = data.find((item) => {
          const idMatches = String(item.id) === requestKey;
          const requestMatches = item.requestId === requestKey;
          return idMatches || requestMatches;
        });

        if (!found) throw new Error("Member transfer request not found");

        setLoadedRecord(found);
      } catch (error) {
        console.error("Failed to load member transfer request:", error);
        setLoadedRecord(null);
      }
    };

    fetchRequest();
  }, [requestKey]);

  useEffect(() => {
    if (!loadedRecord) return;

    reset({
      designationNew: loadedRecord.designationNew || "",
      natureOfOccupationNew: loadedRecord.natureOfOccupationNew || "",
      workingLocationTypeNew: loadedRecord.workingLocationTypeNew || "",
      educationalDistrictNew: loadedRecord.educationalDistrictNew || "",
      educationalZoneNew: loadedRecord.educationalZoneNew || "",
      workingLocationNew: loadedRecord.workingLocationNew || "",
      workingLocationAddressNew:
        loadedRecord.workingLocationAddressNew || "",
      computerNoNameNew: loadedRecord.computerNoNameNew || "",
      salaryPayingOfficeNew: loadedRecord.salaryPayingOfficeNew || "",
    });

    setRequestId(
      loadedRecord.requestId || (loadedRecord.id ? String(loadedRecord.id) : null)
    );
    setMemberTransferRequestNo(loadedRecord.requestId || "");
    setStatus((loadedRecord.status as any) || "NEW");
  }, [loadedRecord, reset]);

  useEffect(() => {
    if (!requestId) {
      setUploadedDocuments([]);
      return;
    }

    const fetchUploadedDocuments = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/uploaded-documents/by-request?requestId=${encodeURIComponent(
            String(requestId)
          )}`
        );

        if (!res.ok) {
          setUploadedDocuments([]);
          return;
        }

        const docs = await res.json();
        setUploadedDocuments(Array.isArray(docs) ? docs : []);
      } catch (error) {
        console.error("Failed to load documents:", error);
        setUploadedDocuments([]);
      }
    };

    fetchUploadedDocuments();
  }, [requestId]);

  useEffect(() => {
    if (!selectedWorkingLocationType) {
      setIsZoneEnabled(true);
      return;
    }

    // Dropdown stores type.name as the form value — match by name
    const foundType = workingLocationTypes.find(
      (type: any) => String(type.name) === String(selectedWorkingLocationType)
    );

    // API returns camelCase 'usesZone', not snake_case 'uses_zone'
    const usesZone = foundType ? Boolean(foundType.usesZone) : true;

    setIsZoneEnabled(usesZone);

    setValue("educationalDistrictNew", "");
    setValue("educationalZoneNew", usesZone ? "" : "NA");
    setValue("workingLocationNew", "");
    setValue("workingLocationAddressNew", "");
    setValue("salaryPayingOfficeNew", "");

    setZones([]);
    setWorkingLocations([]);
    setSalaryOptions([]);
  }, [selectedWorkingLocationType, workingLocationTypes, setValue]);

  useEffect(() => {
    if (!selectedDistrict) {
      setZones([]);
      return;
    }

    setValue("educationalZoneNew", isZoneEnabled ? "" : "NA");
    setValue("workingLocationNew", "");
    setValue("workingLocationAddressNew", "");
    setValue("salaryPayingOfficeNew", "");

    setWorkingLocations([]);
    setSalaryOptions([]);

    if (!isZoneEnabled) return;

    const fetchZones = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/masters/educational-zones?district=${encodeURIComponent(
            selectedDistrict
          )}`
        );

        if (!res.ok) {
          setZones([]);
          return;
        }

        const data = await res.json();
        setZones(data);
      } catch (error) {
        console.error("Failed to load zones:", error);
        setZones([]);
      }
    };

    fetchZones();
  }, [selectedDistrict, isZoneEnabled, setValue]);

  useEffect(() => {
    setValue("workingLocationNew", "");
    setValue("workingLocationAddressNew", "");
    setValue("salaryPayingOfficeNew", "");
    setSalaryOptions([]);

    if (!selectedWorkingLocationType || !selectedDistrict) {
      setWorkingLocations([]);
      return;
    }

    if (isZoneEnabled && !selectedZone) {
      setWorkingLocations([]);
      return;
    }

    const fetchWorkingLocations = async () => {
      try {
        // Resolve the numeric type ID from the selected name
        const foundType = workingLocationTypes.find(
          (t: any) => String(t.name) === String(selectedWorkingLocationType)
        );
        const typeId = foundType ? String(foundType.id) : selectedWorkingLocationType;

        const params = new URLSearchParams();
        params.append("type", typeId);
        params.append("district", selectedDistrict);

        if (isZoneEnabled && selectedZone) {
          params.append("zone", selectedZone);
        }

        const res = await fetch(
          `http://localhost:8080/api/masters/working-locations?${params.toString()}`
        );

        if (!res.ok) {
          setWorkingLocations([]);
          return;
        }

        const data = await res.json();
        setWorkingLocations(data);
      } catch (error) {
        console.error("Failed to load working locations:", error);
        setWorkingLocations([]);
      }
    };

    fetchWorkingLocations();
  }, [
    selectedWorkingLocationType,
    selectedDistrict,
    selectedZone,
    isZoneEnabled,
    setValue,
  ]);

  useEffect(() => {
    if (!selectedWorkingLocation) return;

    const found = workingLocations.find(
      (loc: any) =>
        String(loc.name || loc.label || loc.id) === String(selectedWorkingLocation)
    );

    if (found) {
      setValue(
        "workingLocationAddressNew",
        found.address || found.locationAddress || ""
      );

      if (found.salaryPayingOffice) {
        setValue("salaryPayingOfficeNew", found.salaryPayingOffice);
        setSalaryOptions([found.salaryPayingOffice]);
      }

      return;
    }

    const fetchLocationDetails = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/working-locations/${encodeURIComponent(
            selectedWorkingLocation
          )}`
        );

        if (!res.ok) return;

        const data = await res.json();

        setValue(
          "workingLocationAddressNew",
          data.address || data.locationAddress || ""
        );

        if (data.salaryPayingOffice) {
          setValue("salaryPayingOfficeNew", data.salaryPayingOffice);
          setSalaryOptions([data.salaryPayingOffice]);
        }
      } catch (error) {
        console.error("Failed to load location details:", error);
      }
    };

    fetchLocationDetails();
  }, [selectedWorkingLocation, workingLocations, setValue]);

  const uploadDocuments = async (savedRequestId: string | number) => {
    const uploadedItems: DocumentFileItem[] = [];

    for (const file of documentFiles) {
      const formData = new FormData();

      formData.append("file", file.file);
      formData.append("documentType", file.documentType);
      formData.append("requestId", String(savedRequestId));

      const response = await fetch(
        "http://localhost:8080/api/uploaded-documents/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Document upload failed");
      }

      const savedDoc = await response.json();

      uploadedItems.push({
        ...file,
        id: savedDoc.id,
        uploadedAt: savedDoc.uploadedAt,
      });
    }

    setDocumentFiles(uploadedItems);
  };

  const onSubmit = async (data: MemberTransferFormData) => {
    const confirmSubmit = window.confirm(
      "After submitting, this request cannot be edited. Do you want to continue?"
    );
    if (!confirmSubmit) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        memberId: HARDCODED_MEMBER_ID,
      };

      const res = await fetch("http://localhost:8080/api/member-transfers/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Submit failed (${res.status}): ${text}`);
      }

      const saved = await res.json();
      const savedId = saved.memberTransferRequestID || saved.requestId || saved.id;

      // Upload documents if any
      if (documentFiles.length > 0 && savedId) {
        await uploadDocuments(savedId);
      }

      setRequestId(savedId);
      setMemberTransferRequestNo(saved.requestId || saved.memberTransferRequestID || "");
      setStatus(saved.status || "SUBMITTED_FOR_COMMITTEE_APPROVAL");

      setPopupMessage("Request submitted successfully!");
      setShowPopup(true);
    } catch (error: any) {
      console.error("Submit failed:", error);
      setPopupMessage(error.message || "Failed to submit request");
      setShowPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnterEditMode = () => {
    if (!requestKey) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("requestId", requestKey);
    params.set("mode", "edit");

    router.replace(`?${params.toString()}`);
  };

  const updateTransferStatus = (
    nextStatus: typeof status,
    reason?: string
  ) => {
    setStatus(nextStatus);

    setLoadedRecord((prev) =>
      prev
        ? {
          ...prev,
          status: nextStatus,
          decisionReason:
            nextStatus === "REJECTED" ? reason || "" : prev.decisionReason,
        }
        : prev
    );
  };

  const handleApproveTransfer = async () => {
    if (!requestId) return;

    const confirmApprove = window.confirm("Approve this member transfer?");

    if (!confirmApprove) return;

    try {
      const res = await fetch(
        `http://localhost:8080/api/member-transfers/approve/${requestId}`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        setPopupMessage("Failed to approve request");
        setShowPopup(true);
        return;
      }

      const updated = await res.json();

      updateTransferStatus(updated.status || "APPROVED");
      setPopupMessage("Member transfer approved successfully");
      setShowPopup(true);
    } catch (error) {
      console.error("Approve failed:", error);
      setPopupMessage("Failed to approve request");
      setShowPopup(true);
    }
  };

  const handleRejectTransfer = () => {
    if (!requestId) return;

    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmRejectTransfer = async () => {
    if (!requestId || rejectReason.trim() === "") return;

    try {
      const res = await fetch(
        `http://localhost:8080/api/member-transfers/reject/${requestId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decisionReason: rejectReason.trim() }),
        }
      );

      if (!res.ok) {
        setPopupMessage("Failed to reject request");
        setShowPopup(true);
        return;
      }

      const updated = await res.json();

      updateTransferStatus(updated.status || "REJECTED", rejectReason.trim());
      setShowRejectModal(false);
      setPopupMessage("Member transfer rejected successfully");
      setShowPopup(true);
    } catch (error) {
      console.error("Reject failed:", error);
      setPopupMessage("Failed to reject request");
      setShowPopup(true);
    }
  };

  const mandatoryDocumentTypes = requiredDocumentTypes
    .filter((doc) => doc.mandatory)
    .map((doc) => doc.documentType);

  const hasAllMandatoryDocuments = mandatoryDocumentTypes.every(
    (type) =>
      documentFiles.some((doc) => doc.documentType === type) ||
      uploadedDocuments.some((doc) => doc.documentType === type)
  );

  const statusReason =
    status === "INCOMPLETE"
      ? loadedRecord?.incompleteReason || ""
      : status === "REJECTED"
        ? loadedRecord?.decisionReason || ""
        : "";

  const pageTitle = isExistingRequest ? "Member Transfer" : "New Member Transfer";
  const canReviewSubmission =
    isViewMode && status === "SUBMITTED_FOR_COMMITTEE_APPROVAL";

  if (loading) return <div className="p-6">Loading...</div>;

  if (!oldValues) {
    return <div className="p-6 text-red-600">Error loading data</div>;
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#953002]">
              {pageTitle}
              {memberTransferRequestNo && `: ${memberTransferRequestNo}`}
            </h2>

            <p className="mt-2 flex items-center gap-8 text-sm text-gray-600">
              <span>
                Member: {member?.fullName} ({member?.memberId})
              </span>

              {(isExistingRequest) && (
                <span className="font-semibold text-blue-600">
                  Status: <span>{status}</span>
                  {statusReason && (
                    <span className="ml-2 font-normal text-red-600">
                      ({statusReason})
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            {isViewMode && isEditableStatus && (
              <Button type="button" variant="outline" onClick={handleEnterEditMode}>
                Edit
              </Button>
            )}

            {!isViewMode && !isSubmitted && (
              <Button
                type="submit"
                disabled={!isValid || !hasAllMandatoryDocuments || isSubmitting}
                className="bg-[#953002] text-white hover:bg-[#7a2500] disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              Personal Details
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldPair
                oldLabel="Full Name"
                oldValue={oldValues.fullName}
                newLabel="Full Name"
                newValue={oldValues.fullName}
              />

              <FieldPair
                oldLabel="Date of Birth"
                oldValue={oldValues.dateOfBirth}
                newLabel="Date of Birth"
                newValue={oldValues.dateOfBirth}
              />

              <FieldPair
                oldLabel="NIC Number"
                oldValue={oldValues.nicNumber}
                newLabel="NIC Number"
                newValue={oldValues.nicNumber}
              />

              <FieldPair
                oldLabel="Gender"
                oldValue={oldValues.gender}
                newLabel="Gender"
                newValue={oldValues.gender}
              />
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              Occupation Details
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <EditableSelect
                label="Designation"
                oldValue={oldValues.designation}
                register={register("designationNew")}
                error={errors.designationNew?.message}
                options={designationOptions}
                disabled={isInputsDisabled}
              />

              <EditableSelect
                label="Nature of Occupation"
                oldValue={oldValues.natureOfOccupation}
                register={register("natureOfOccupationNew")}
                error={errors.natureOfOccupationNew?.message}
                options={natureOfOccupationOptions}
                disabled={isInputsDisabled}
              />

              <EditableSelect
                label="Working Location Type"
                oldValue={oldValues.workingLocationType}
                register={register("workingLocationTypeNew")}
                error={errors.workingLocationTypeNew?.message}
                options={workingLocationTypes.map(
                  (type: any) => type.name || type.label || type.id
                )}
                disabled={isInputsDisabled}
              />

              <EditableSelect
                label="Educational District"
                oldValue={oldValues.educationalDistrict}
                register={register("educationalDistrictNew")}
                error={errors.educationalDistrictNew?.message}
                options={districts.map(
                  (district: any) => district.name || district.label || district.id
                )}
                disabled={
                  !selectedWorkingLocationType || isInputsDisabled}
              />

              <EditableSelect
                label="Educational Zone"
                oldValue={oldValues.educationalZone}
                register={register("educationalZoneNew")}
                error={errors.educationalZoneNew?.message}
                options={
                  isZoneEnabled
                    ? zones.map((zone: any) => zone.name || zone.label || zone.id)
                    : ["NA"]
                }
                disabled={
                  !isZoneEnabled ||
                  !selectedDistrict ||
                  isInputsDisabled
                }
              />

              <EditableSelect
                label="Working Location"
                oldValue={oldValues.workingLocation}
                register={register("workingLocationNew")}
                error={errors.workingLocationNew?.message}
                options={workingLocations.map(
                  (location: any) =>
                    location.name || location.label || location.id
                )}
                disabled={
                  !selectedWorkingLocationType ||
                  !selectedDistrict ||
                  (isZoneEnabled && !selectedZone) ||
                  isInputsDisabled
                }
              />

              <EditableInput
                label="Working Location Address"
                oldValue={oldValues.permanentAddress}
                register={register("workingLocationAddressNew")}
                error={errors.workingLocationAddressNew?.message}
                value={watch("workingLocationAddressNew")}
                disabled
              />

              <EditableInput
                label="Computer No"
                oldValue={oldValues.computerNoName}
                register={register("computerNoNameNew")}
                error={errors.computerNoNameNew?.message}
                disabled={isInputsDisabled}
              />

              <EditableSelect
                label="Salary Paying Office"
                oldValue={oldValues.salaryPayingOffice}
                register={register("salaryPayingOfficeNew")}
                error={errors.salaryPayingOfficeNew?.message}
                options={
                  salaryOptions.length > 0
                    ? salaryOptions
                    : [
                      "Zonal Education Office",
                      "Provincial Education Office",
                      "Ministry of Education",
                    ]
                }
                disabled={
                  !selectedWorkingLocation || isInputsDisabled
                }
              />
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              Supporting Documents
            </h3>

            <div className="space-y-4">
              {!isInputsDisabled && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Document Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedDocumentType}
                      onChange={(e) => setSelectedDocumentType(e.target.value)}
                      className="h-10 w-full rounded-md border px-3 text-sm"
                    >
                      <option value="">Select Document Type</option>
                      {requiredDocumentTypes.map((type) => (
                        <option key={type.id} value={type.documentType}>
                          {type.displayName} {type.mandatory ? "(Mandatory)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label
                    className={`flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm ${selectedDocumentType
                      ? "cursor-pointer text-gray-500 hover:bg-gray-50"
                      : "cursor-not-allowed bg-gray-50 text-gray-400"
                      }`}
                  >
                    <input
                      type="file"
                      className="hidden"
                      disabled={!selectedDocumentType}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file || !selectedDocumentType) return;
                        setDocumentFiles((prev) => [
                          ...prev,
                          {
                            file,
                            documentType: selectedDocumentType,
                            uploadedAt: new Date().toISOString(),
                          },
                        ]);
                        e.target.value = "";
                      }}
                    />
                    <UploadCloud className="mb-2 h-8 w-8 text-[#953002]" />
                    <p>
                      {selectedDocumentType
                        ? "Click to upload selected document"
                        : "Select a document type first"}
                    </p>
                  </label>
                </>
              )}

              {isInputsDisabled && (
                <div className="rounded-lg border border-dashed bg-gray-50 p-6 text-center text-sm text-gray-500">
                  {isSubmitted
                    ? "Document upload is disabled after submission."
                    : "Cannot upload files in view mode."}
                </div>
              )}

              {documentFiles.length > 0 && (
                <div className="overflow-x-auto rounded border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-3 py-2">Document Type</th>
                        <th className="px-3 py-2">File Name</th>
                        <th className="px-3 py-2">Uploaded Time</th>
                        {!isInputsDisabled && <th className="px-3 py-2">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {documentFiles.map((item, index) => (
                        <tr key={`${item.file.name}-${index}`} className="border-t">
                          <td className="px-3 py-2">
                            {requiredDocumentTypes.find(
                              (t) => t.documentType === item.documentType
                            )?.displayName || item.documentType}
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-700">
                            {item.file.name}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {item.uploadedAt
                              ? new Date(item.uploadedAt).toLocaleString()
                              : "—"}
                          </td>
                          {!isInputsDisabled && (
                            <td className="px-3 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() =>
                                  setDocumentFiles((prev) =>
                                    prev.filter((_, i) => i !== index)
                                  )
                                }
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                      <p className="mt-1 text-xs text-gray-600">
                        {doc.fileName || "Unnamed file"}
                      </p>

                      {doc.uploadedAt && (
                        <p className="mt-1 text-xs text-gray-500">
                          Uploaded:{" "}
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 inline-flex items-center justify-center rounded-md bg-[#953002] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#7a2500]"
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {canReviewSubmission && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                className="bg-green-100 text-green-600 hover:bg-green-200"
                onClick={handleApproveTransfer}
              >
                Approve
              </Button>

              <Button
                type="button"
                className="bg-red-100 text-red-600 hover:bg-red-200"
                onClick={handleRejectTransfer}
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      </form>

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold text-[#953002]">
              POPUP MESSAGE
            </h3>

            <p className="mb-5 text-sm text-black">{popupMessage}</p>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => setShowPopup(false)}
                className="bg-[#953002] text-white hover:bg-[#7a2500]"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-[#953002]">
              Reject Member Transfer
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              Enter the reason for rejection.
            </p>

            <div className="mt-4">
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                className="min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#953002] focus:ring-2 focus:ring-[#953002]/20"
                placeholder="Reason for rejection"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="bg-red-100 text-red-600 hover:bg-red-200"
                onClick={handleConfirmRejectTransfer}
                disabled={rejectReason.trim() === ""}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FieldPair({
  oldLabel,
  oldValue,
  newLabel,
  newValue,
}: {
  oldLabel: string;
  oldValue: string;
  newLabel: string;
  newValue: string;
}) {
  return (
    <>
      <div>
        <label className="mb-1 block text-sm text-gray-600">
          {oldLabel} Current
        </label>
        <Input value={formatDisplayValue(oldValue)} disabled />
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600">
          {newLabel} New
        </label>
        <Input value={formatDisplayValue(newValue)} disabled readOnly />
      </div>
    </>
  );
}

function EditableInput({
  label,
  oldValue,
  register,
  error,
  value,
  disabled = false,
}: any) {
  return (
    <>
      <div>
        <label className="mb-1 block text-sm text-gray-600">
          {label} Current
        </label>
        <Input value={formatDisplayValue(oldValue)} disabled />
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600">
          {label} New
        </label>

        {typeof value !== "undefined" ? (
          <Input value={formatDisplayValue(oldValue)} disabled={disabled} readOnly />
        ) : (
          <Input {...register} disabled={disabled} value={formatDisplayValue(oldValue)} />
        )}

        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    </>
  );
}

function EditableSelect({
  label,
  oldValue,
  register,
  error,
  options = [],
  disabled = false,
}: any) {
  const selectId = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return (
    <>
      <div>
        <label className="mb-1 block text-sm text-gray-600">
          {label} Current
        </label>
        <Input value={formatDisplayValue(oldValue)} disabled />
      </div>

      <div>
        <label htmlFor={selectId} className="mb-1 block text-sm text-gray-600">
          {label} New
        </label>

        <select
          id={selectId}
          {...register}
          disabled={disabled}
          className="h-10 w-full rounded-md border px-3 text-sm disabled:bg-gray-100"
        >
          <option value="">{formatDisplayValue(oldValue)}</option>

          {options.map((option: string) => (
            <option key={formatDisplayValue(option)} value={formatDisplayValue(option)}>
              {formatDisplayValue(option)}
            </option>
          ))}
        </select>

        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    </>
  );
}