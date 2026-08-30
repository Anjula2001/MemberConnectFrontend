"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2, UploadCloud, Check, AlertCircle, Info } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { memberTransferSchema, type MemberTransferFormData, } from "@/lib/validators/membertransfer.schema";
import { authFetch } from "@/lib/api/authFetch";
import { useAuth } from "@/lib/auth-context";
import { canApproveTransfer, canChangeTransferStatus } from "@/lib/permissions";

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
  permanentPrivateAddress: string;
  privateTelephone: string;
  mobileNumber: string;
  emailAddress: string;
  designation: string;
  natureOfOccupation: string;
  workingLocationType: string;
  workingLocation: string;
  workingLocationAddress: string;
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
  member?: any;

  designationNew?: string;
  natureOfOccupationNew?: string;
  workingLocationTypeNew?: string;
  educationalDistrictNew?: string;
  educationalZoneNew?: string;
  workingLocationNew?: string;
  workingLocationAddressNew?: string;
  computerNoNameNew?: string;
  salaryPayingOfficeNew?: string;

  newDesignationId?: number | string;
  newNatureOfOccupationId?: number | string;
  newWorkingLocationTypeId?: number | string;
  newEducationalDistrictId?: number | string;
  newEducationalZoneId?: number | string | null;
  newWorkingLocationId?: number | string;
  newWorkingLocationAddress?: string;
  newComputerNoInPayslip?: string;
  newSalaryPayingOffice?: string;

  newDesignation?: { id?: number; name?: string };
  newNatureOfOccupation?: { id?: number; name?: string };
  newWorkingLocationType?: { id?: number; name?: string; usesZone?: boolean };
  newEducationalDistrict?: { id?: number; name?: string };
  newEducationalZone?: { id?: number; name?: string };
  newWorkingLocation?: {
    id?: number;
    name?: string;
    address?: string;
    salaryPayingOffice?: string;
    educationalDistrict?: { id?: number; name?: string };
    educationalZone?: { id?: number; name?: string };
  };

  // Snapshot of member's values at the time of request creation
  currentDesignation?: string;
  currentNatureOfOccupation?: string;
  currentWorkingLocationType?: string;
  currentEducationalDistrict?: string;
  currentEducationalZone?: string;
  currentWorkingLocation?: string;
  currentWorkingLocationAddress?: string;
  currentComputerNoInPayslip?: string;
  currentSalaryPayingOffice?: string;
};

type OptionItem = {
  id: string;
  name: string;
  raw?: any;
};

const emptyOldValues: MemberTransferOldValues = {
  fullName: "",
  dateOfBirth: "",
  nicNumber: "",
  gender: "",
  preferredLanguage: "",
  permanentPrivateAddress: "",
  privateTelephone: "",
  mobileNumber: "",
  emailAddress: "",
  designation: "",
  natureOfOccupation: "",
  workingLocationType: "",
  workingLocation: "",
  workingLocationAddress: "",
  educationalZone: "",
  educationalDistrict: "",
  computerNoName: "",
  salaryPayingOffice: "",
};

// Utility to format various value types for display
const formatDisplayValue = (value: any): string => {
  if (value === null || typeof value === "undefined") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(formatDisplayValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return String(
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

// Convert array of items to OptionItem format for dropdowns
const toOptionItems = (items: any[]): OptionItem[] => {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const id = item?.id ?? item?.value ?? item;
      const name = item?.name ?? item?.label ?? item?.displayName ?? item?.designation ?? item?.occupation ?? item;

      return {
        id: String(id ?? ""),
        name: formatDisplayValue(name),
        raw: item,
      };
    })
    .filter((item) => item.id !== "" && item.name !== "");
};

// Find option ID by name from a list of options
const findOptionIdByName = (options: OptionItem[], name: string) => {
  const found = options.find((option) => option.name === name || String(option.raw?.name) === name);
  return found ? found.id : "";
};

// Convert value to nullable number for API compatibility
const toNullableNumber = (value: any) => {
  if (value === "" || value === null || typeof value === "undefined" || value === "NA") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

export default function ChangeMemberTransferForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // MMC30 seats the decision with the District Office, restored on 2026-08-27: an
  // authorised District Office officer decides a transfer, and nobody at Head Office
  // does. MMC29's status change reaches an authorised officer at either office. Both
  // are per-account rather than per-role, so these take the user and not the role. The
  // server enforces the same split independently; these only decide what is offered.
  const canApprove = canApproveTransfer(user);
  const canSetInactive = canChangeTransferStatus(user);

  const requestKey = searchParams.get("requestId");
  const memberId = searchParams.get("memberId") || "";
  const mode = searchParams.get("mode");
  const [requestId, setRequestId] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [oldValues, setOldValues] = useState<MemberTransferOldValues | null>(null);

  const [member, setMember] = useState<any>(null);
  const [loadedRecord, setLoadedRecord] = useState<MemberTransferRecord | null>(null);

  const [memberTransferRequestNo, setMemberTransferRequestNo] = useState("");

  const [status, setStatus] = useState<"NEW" | "INCOMPLETE" | "SUBMITTEDFORAPPROVAL" | "APPROVED" | "REJECTED" | "INACTIVE">("NEW");

  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState<"INACTIVE" | "">("");
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [documentFiles, setDocumentFiles] = useState<DocumentFileItem[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [requiredDocumentTypes, setRequiredDocumentTypes] = useState<RequiredDocType[]>([]);

  const [designationOptions, setDesignationOptions] = useState<OptionItem[]>([]);
  const [natureOfOccupationOptions, setNatureOfOccupationOptions] = useState<OptionItem[]>([]);
  const [workingLocationTypes, setWorkingLocationTypes] = useState<OptionItem[]>([]);
  const [districts, setDistricts] = useState<OptionItem[]>([]);
  const [zones, setZones] = useState<OptionItem[]>([]);
  const [workingLocations, setWorkingLocations] = useState<OptionItem[]>([]);
  const [salaryOptions, setSalaryOptions] = useState<string[]>([]);
  const [isZoneEnabled, setIsZoneEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keepCurrentDistrict, setKeepCurrentDistrict] = useState(false);

  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<MemberTransferFormData | null>(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Request already awaiting approval for this member, if any. A second one would
  // compete with it, so a new request is refused while it is outstanding.
  const [inFlightRequestId, setInFlightRequestId] = useState<string | null>(null);

  const isExistingRequest = Boolean(requestKey);
  const isBlockedByInFlightRequest = !isExistingRequest && inFlightRequestId !== null;

  // A request awaiting approval, or one that was rejected, may be made Inactive.
  // Nothing else moves: an approved transfer is already written onto the member's
  // profile, and an inactive request is closed.
  const STATUS_CHANGE_TARGETS: Record<string, ("INACTIVE")[]> = {
    SUBMITTEDFORAPPROVAL: ["INACTIVE"],
    REJECTED: ["INACTIVE"],
  };
  const availableStatusTargets = STATUS_CHANGE_TARGETS[status] || [];
  const isSubmitted = status === "SUBMITTEDFORAPPROVAL";
  const isEditableStatus = status === "NEW" || status === "INCOMPLETE";
  const isEditMode = isExistingRequest && mode === "edit" && isEditableStatus;
  const isViewMode = isExistingRequest && !isEditMode;
  const isInputsDisabled = isViewMode || isSubmitted;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isValid }, } = useForm<MemberTransferFormData>({
    resolver: zodResolver(memberTransferSchema),
    mode: "onChange",
    defaultValues: {
      designationNew: "",
      natureOfOccupationNew: "",
      workingLocationTypeNew: "",
      educationalDistrictNew: "",
      educationalZoneNew: "",
      workingLocationNew: "",
      workingLocationAddressNew: "",
      computerNoNameNew: "",
      salaryPayingOfficeNew: "",
    } as any,
  });

  const selectedWorkingLocationType = watch("workingLocationTypeNew");
  const selectedDistrict = watch("educationalDistrictNew");
  const selectedZone = watch("educationalZoneNew");
  const selectedWorkingLocation = watch("workingLocationNew");

  const foundWorkingLocationType = useMemo(() => {
    return workingLocationTypes.find((type) => type.id === String(selectedWorkingLocationType));
  }, [workingLocationTypes, selectedWorkingLocationType]);

  const showKeepCurrentDistrict = useMemo(() => {
    return foundWorkingLocationType
      ? (foundWorkingLocationType.name.toLowerCase() === "other" || foundWorkingLocationType.raw?.keepCurrentDistrict === true)
      : false;
  }, [foundWorkingLocationType]);

  const isKeepDistrict = useMemo(() => {
    if (!loadedRecord) return false;
    const locDistrictId = loadedRecord.newWorkingLocation?.educationalDistrict?.id;
    const reqDistrictId = loadedRecord.newEducationalDistrictId;
    return Boolean(
      locDistrictId &&
      reqDistrictId &&
      String(locDistrictId) !== String(reqDistrictId)
    );
  }, [loadedRecord]);

  //get mandatory Document in DB
  useEffect(() => {
    const fetchRequiredDocumentTypes = async () => {
      try {
        const res = await authFetch("http://localhost:8080/api/required-document-types/MEMBER_TRANSFER");
        if (!res.ok) throw new Error("Failed to load document types");
        const data = await res.json();
        setRequiredDocumentTypes(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchRequiredDocumentTypes();
  }, []);

  // Check if all mandatory documents are uploaded
  const areMandatoryDocsUploaded = useMemo(() => {
    if (requiredDocumentTypes.length === 0) return true;

    const mandatoryTypes = requiredDocumentTypes.filter((t) => t.mandatory);
    if (mandatoryTypes.length === 0) return true;

    return mandatoryTypes.every((type) => {
      const isStaged = documentFiles.some((d) => d.documentType === type.documentType);
      const isUploaded = uploadedDocuments.some(
        (d) => d.requiredDocumentId === type.id || d.documentType === type.documentType
      );
      return isStaged || isUploaded;
    });
  }, [requiredDocumentTypes, uploadedDocuments, documentFiles]);

  const handleDeleteUploadedDocument = async (docId: number) => {
    const targetId = memberTransferRequestNo || requestId || loadedRecord?.requestId || requestKey;
    if (!targetId) return;
    try {
      const res = await authFetch(
        `http://localhost:8080/api/uploaded-documents/${docId}?requestId=${encodeURIComponent(String(targetId))}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        setPopupMessage("Failed to delete uploaded document");
        setShowPopup(true);
        return;
      }

      setUploadedDocuments((prev) => prev.filter((d) => d.id !== docId));
      setPopupMessage("Document deleted successfully");
      setShowPopup(true);
    } catch (error) {
      console.error("Delete uploaded document failed:", error);
      setPopupMessage("Failed to delete uploaded document");
      setShowPopup(true);
    }
  };

  //Get Working location type,distric,designation and nature of occupation in DB
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [typesRes, districtsRes, designationsRes, occupationsRes] = await Promise.all([
          authFetch("http://localhost:8080/api/masters/working-location-types"),
          authFetch("http://localhost:8080/api/masters/districts"),
          authFetch("http://localhost:8080/api/masters/designations"),
          authFetch("http://localhost:8080/api/masters/nature-of-occupations"),
        ]);

        const [typesData, districtsData, designationsData, occupationsData] = await Promise.all([
          typesRes.ok ? typesRes.json() : Promise.resolve([]),
          districtsRes.ok ? districtsRes.json() : Promise.resolve([]),
          designationsRes.ok ? designationsRes.json() : Promise.resolve([]),
          occupationsRes.ok ? occupationsRes.json() : Promise.resolve([]),
        ]);

        setWorkingLocationTypes(toOptionItems(typesData));
        setDistricts(toOptionItems(districtsData));
        setDesignationOptions(toOptionItems(designationsData));
        setNatureOfOccupationOptions(toOptionItems(occupationsData));
      } catch (error) {
        console.error("Failed to load master data:", error);
      }
    };

    fetchMasters();
  }, []);

  //Get member details
  useEffect(() => {
    const targetMemberId = memberId || loadedRecord?.member?.memberId;
    if (!targetMemberId) return;

    const hasSnapshot = Boolean(
      loadedRecord &&
      (
        loadedRecord.currentDesignation != null ||
        loadedRecord.currentWorkingLocationType != null ||
        loadedRecord.currentEducationalDistrict != null ||
        loadedRecord.currentWorkingLocation != null
      )
    );

    const fetchMember = async () => {
      try {
        const res = await authFetch(`http://localhost:8080/api/members/by-member-id/${targetMemberId}`);
        if (!res.ok) throw new Error("Failed to load member");

        const data = await res.json();
        setMember(data);

        if (!hasSnapshot) {
          setOldValues({
            fullName: formatDisplayValue(data.fullName),
            dateOfBirth: formatDisplayValue(data.dateOfBirth),
            nicNumber: formatDisplayValue(data.nic),
            gender: formatDisplayValue(data.gender),
            preferredLanguage: formatDisplayValue(data.preferredLanguage),
            permanentPrivateAddress: formatDisplayValue(data.permanentPrivateAddress),
            privateTelephone: formatDisplayValue(data.privateTelephone),
            mobileNumber: formatDisplayValue(data.mobileNumber),
            emailAddress: formatDisplayValue(data.emailAddress),
            designation: formatDisplayValue(data.designation),
            natureOfOccupation: formatDisplayValue(data.natureOfOccupation),
            workingLocationType: formatDisplayValue(data.workingLocationType),
            workingLocation: formatDisplayValue(data.workingLocation),
            workingLocationAddress: formatDisplayValue(data.workingLocationAddress),
            educationalZone: formatDisplayValue(data.educationalZone),
            educationalDistrict: formatDisplayValue(data.educationalDistrict),
            computerNoName: formatDisplayValue(data.computerNoInPayslip),
            salaryPayingOffice: formatDisplayValue(data.salaryPayingOffice),
          });
        }
      } catch (error) {
        console.error("Failed to load member:", error);
        if (!hasSnapshot) {
          setOldValues(emptyOldValues);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [memberId, loadedRecord?.member?.memberId]);

  //When viewing an existing request that has snapshot data, populate oldValues
  useEffect(() => {
    if (!loadedRecord) return;
    const hasSnapshot = Boolean(
      loadedRecord.currentDesignation != null ||
      loadedRecord.currentWorkingLocationType != null ||
      loadedRecord.currentEducationalDistrict != null ||
      loadedRecord.currentWorkingLocation != null
    );
    if (!hasSnapshot) return;

    setOldValues((prev) => ({
      // Personal details come from the live member, NOT from `prev`.
      //
      // Reading them off `prev` left every one of them blank. The member fetch above
      // deliberately skips setOldValues when the request carries a snapshot — it
      // defers to this effect — so on a snapshot request nothing ever writes the
      // personal fields into oldValues, and `prev?.fullName ?? ""` resolves to "" on
      // the first run and stays that way. The member was loaded the whole time; it
      // simply was not the thing being read. Hence Occupation Details filling from
      // the snapshot while Full Name, Date of Birth, NIC and Gender stayed empty.
      //
      // `prev` is kept only as the fallback for the render that happens before the
      // member arrives, since this effect re-runs once it does.
      fullName: member ? formatDisplayValue(member.fullName) : (prev?.fullName ?? ""),
      dateOfBirth: member ? formatDisplayValue(member.dateOfBirth) : (prev?.dateOfBirth ?? ""),
      nicNumber: member ? formatDisplayValue(member.nic) : (prev?.nicNumber ?? ""),
      gender: member ? formatDisplayValue(member.gender) : (prev?.gender ?? ""),
      preferredLanguage: member ? formatDisplayValue(member.preferredLanguage) : (prev?.preferredLanguage ?? ""),
      permanentPrivateAddress: member
        ? formatDisplayValue(member.permanentPrivateAddress)
        : (prev?.permanentPrivateAddress ?? ""),
      privateTelephone: member ? formatDisplayValue(member.privateTelephone) : (prev?.privateTelephone ?? ""),
      mobileNumber: member ? formatDisplayValue(member.mobileNumber) : (prev?.mobileNumber ?? ""),
      emailAddress: member ? formatDisplayValue(member.emailAddress) : (prev?.emailAddress ?? ""),
      // Transfer-related fields: use the saved snapshot
      designation: formatDisplayValue(loadedRecord.currentDesignation),
      natureOfOccupation: formatDisplayValue(loadedRecord.currentNatureOfOccupation),
      workingLocationType: formatDisplayValue(loadedRecord.currentWorkingLocationType),
      workingLocation: formatDisplayValue(loadedRecord.currentWorkingLocation),
      workingLocationAddress: formatDisplayValue(loadedRecord.currentWorkingLocationAddress),
      educationalZone: formatDisplayValue(loadedRecord.currentEducationalZone),
      educationalDistrict: formatDisplayValue(loadedRecord.currentEducationalDistrict),
      computerNoName: formatDisplayValue(loadedRecord.currentComputerNoInPayslip),
      salaryPayingOffice: formatDisplayValue(loadedRecord.currentSalaryPayingOffice),
    }));
    setLoading(false);
    // `member` is a real dependency: it arrives from its own fetch after this effect
    // has already run once, and the personal fields above are read from it.
  }, [loadedRecord, member]);


  useEffect(() => {
    if (!oldValues || isExistingRequest) return;

    reset({
      designationNew: findOptionIdByName(designationOptions, oldValues.designation),
      natureOfOccupationNew: findOptionIdByName(natureOfOccupationOptions, oldValues.natureOfOccupation),
      workingLocationTypeNew: findOptionIdByName(workingLocationTypes, oldValues.workingLocationType),
      educationalDistrictNew: findOptionIdByName(districts, oldValues.educationalDistrict),
      educationalZoneNew: "",
      workingLocationNew: "",
      workingLocationAddressNew: "",
      computerNoNameNew: oldValues.computerNoName || "",
      salaryPayingOfficeNew: oldValues.salaryPayingOffice || "",
    } as any);
  }, [
    oldValues,
    isExistingRequest,
    designationOptions,
    natureOfOccupationOptions,
    workingLocationTypes,
    districts,
    reset,
  ]);

  //Fetch existing request details when requestKey changes 
  useEffect(() => {
    if (!requestKey) {
      setLoadedRecord(null);
      return;
    }

    const fetchRequest = async () => {
      try {
        const res = await authFetch("http://localhost:8080/api/member-transfers");
        if (!res.ok) throw new Error("Failed to load member transfer request");

        const data: MemberTransferRecord[] = await res.json();
        const found = data.find((item) => String(item.id) === requestKey || item.requestId === requestKey);

        if (!found) throw new Error("Member transfer request not found");
        setLoadedRecord(found);
      } catch (error) {
        console.error("Failed to load member transfer request:", error);
        setLoadedRecord(null);
      }
    };

    fetchRequest();
  }, [requestKey]);

  // Refuse a new request up front when one is already awaiting approval, rather
  // than letting the form be filled in and refused on submit
  useEffect(() => {
    if (requestKey) {
      setInFlightRequestId(null);
      return;
    }

    const targetMemberId = memberId || member?.memberId;
    if (!targetMemberId) return;

    const checkInFlightRequest = async () => {
      try {
        const res = await authFetch(
          `http://localhost:8080/api/member-transfers/in-flight/${encodeURIComponent(targetMemberId)}`
        );
        if (!res.ok) return;

        const data = await res.json();
        if (!data?.hasInFlight) {
          setInFlightRequestId(null);
          return;
        }

        setInFlightRequestId(data.requestId || "");
        setPopupMessage(
          `Member ${targetMemberId} already has transfer request ${data.requestId} awaiting approval.` +
          ` A new transfer request cannot be raised until that one is approved or rejected.`
        );
        setShowPopup(true);
      } catch (error) {
        console.error("Failed to check for an existing member transfer request:", error);
      }
    };

    checkInFlightRequest();
  }, [requestKey, memberId, member?.memberId]);

  // Populate form when loadedRecord changes 
  useEffect(() => {
    if (!loadedRecord) return;

    setKeepCurrentDistrict(isKeepDistrict);

    const locDistrictId = loadedRecord.newWorkingLocation?.educationalDistrict?.id;
    reset({
      designationNew: String(loadedRecord.newDesignationId || ""),
      natureOfOccupationNew: String(loadedRecord.newNatureOfOccupationId || ""),
      workingLocationTypeNew: String(loadedRecord.newWorkingLocationTypeId || ""),
      educationalDistrictNew: isKeepDistrict && locDistrictId
        ? String(locDistrictId)
        : String(loadedRecord.newEducationalDistrictId || ""),
      educationalZoneNew: String(loadedRecord.newEducationalZoneId || ""),
      workingLocationNew: String(loadedRecord.newWorkingLocationId || ""),
      workingLocationAddressNew: loadedRecord.newWorkingLocationAddress || "",
      computerNoNameNew: loadedRecord.newComputerNoInPayslip || loadedRecord.computerNoNameNew || "",
      salaryPayingOfficeNew: loadedRecord.newSalaryPayingOffice || loadedRecord.salaryPayingOfficeNew || "",
    } as any);

    setRequestId(loadedRecord.requestId || (loadedRecord.id ? String(loadedRecord.id) : null));
    setMemberTransferRequestNo(loadedRecord.requestId || "");
    setStatus((loadedRecord.status as any) || "NEW");
  }, [loadedRecord, isKeepDistrict, reset]);

  //Fetch uploaded documents based on Request ID
  useEffect(() => {
    if (!requestId) {
      setUploadedDocuments([]);
      return;
    }

    const fetchUploadedDocuments = async () => {
      try {
        const res = await authFetch(
          `http://localhost:8080/api/uploaded-documents/by-request?requestId=${encodeURIComponent(String(requestId))}`
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

  //Select Zone after select Working Location Type
  useEffect(() => {
    if (!selectedWorkingLocationType) {
      setIsZoneEnabled(true);
      return;
    }

    const foundType = workingLocationTypes.find((type) => type.id === String(selectedWorkingLocationType));
    const usesZone = foundType ? Boolean(foundType.raw?.usesZone) : true;

    setIsZoneEnabled(usesZone);

    const isOther = foundType ? (foundType.name.toLowerCase() === "other" || foundType.raw?.keepCurrentDistrict === true) : false;
    if (!isOther) {
      setKeepCurrentDistrict(false);
    }

    setValue("educationalDistrictNew", "" as any);
    setValue("educationalZoneNew", (usesZone ? "" : "NA") as any);
    setValue("workingLocationNew", "" as any);
    setValue("workingLocationAddressNew", "" as any);
    setValue("salaryPayingOfficeNew", "" as any);

    setZones([]);
    setWorkingLocations([]);
    setSalaryOptions([]);
  }, [selectedWorkingLocationType, workingLocationTypes, setValue]);

  //Select District after select Working Location Type
  useEffect(() => {
    if (!selectedDistrict) {
      setZones([]);
      return;
    }

    setValue("educationalZoneNew", (isZoneEnabled ? "" : "NA") as any);
    setValue("workingLocationNew", "" as any);
    setValue("workingLocationAddressNew", "" as any);
    setValue("salaryPayingOfficeNew", "" as any);

    setWorkingLocations([]);
    setSalaryOptions([]);

    if (!isZoneEnabled) return;

    const fetchZones = async () => {
      try {
        const res = await authFetch(
          `http://localhost:8080/api/masters/educational-zones?district=${encodeURIComponent(String(selectedDistrict))}`
        );

        if (!res.ok) {
          setZones([]);
          return;
        }

        const data = await res.json();
        setZones(toOptionItems(data));
      } catch (error) {
        console.error("Failed to load zones:", error);
        setZones([]);
      }
    };

    fetchZones();
  }, [selectedDistrict, isZoneEnabled, setValue]);

  //Select Working Location after select District and Zone
  useEffect(() => {
    setValue("workingLocationNew", "" as any);
    setValue("workingLocationAddressNew", "" as any);
    setValue("salaryPayingOfficeNew", "" as any);
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
        const params = new URLSearchParams();
        params.append("type", String(selectedWorkingLocationType));
        params.append("district", String(selectedDistrict));

        if (isZoneEnabled && selectedZone) {
          params.append("zone", String(selectedZone));
        }

        const res = await authFetch(`http://localhost:8080/api/masters/working-locations?${params.toString()}`);

        if (!res.ok) {
          setWorkingLocations([]);
          return;
        }

        const data = await res.json();
        setWorkingLocations(toOptionItems(data));
      } catch (error) {
        console.error("Failed to load working locations:", error);
        setWorkingLocations([]);
      }
    };

    fetchWorkingLocations();
  }, [selectedWorkingLocationType, selectedDistrict, selectedZone, isZoneEnabled, setValue]);

  //Select Working Location details after select Working Location
  useEffect(() => {
    if (!selectedWorkingLocation) return;

    const found = workingLocations.find((loc) => loc.id === String(selectedWorkingLocation));

    if (found) {
      const address = found.raw?.address || found.raw?.locationAddress || "";
      const salaryPayingOffice = found.raw?.salaryPayingOffice || "";

      setValue("workingLocationAddressNew", address as any);

      if (salaryPayingOffice) {
        setValue("salaryPayingOfficeNew", salaryPayingOffice as any);
        setSalaryOptions([salaryPayingOffice]);
      }

      return;
    }

    const fetchLocationDetails = async () => {
      try {
        const res = await authFetch(`http://localhost:8080/api/working-locations/${encodeURIComponent(String(selectedWorkingLocation))}`);
        if (!res.ok) return;

        const data = await res.json();
        setValue("workingLocationAddressNew", (data.address || data.locationAddress || "") as any);

        if (data.salaryPayingOffice) {
          setValue("salaryPayingOfficeNew", data.salaryPayingOffice as any);
          setSalaryOptions([data.salaryPayingOffice]);
        }
      } catch (error) {
        console.error("Failed to load location details:", error);
      }
    };

    fetchLocationDetails();
  }, [selectedWorkingLocation, workingLocations, setValue]);

  //Handle form submission for both new and existing requests
  const onSubmit = (data: MemberTransferFormData) => {
    if (isBlockedByInFlightRequest) {
      setPopupMessage(
        `Member ${memberId || member?.memberId} already has transfer request ${inFlightRequestId}` +
        ` awaiting approval. A new transfer request cannot be raised until that one is approved or rejected.`
      );
      setShowPopup(true);
      return;
    }

    setPendingFormData(data);
    setShowSubmitConfirmModal(true);
  };

  const executeSubmit = async () => {
    setShowSubmitConfirmModal(false);
    if (!pendingFormData) return;
    const data = pendingFormData;

    setIsSubmitting(true);
    try {
      // Find option ID of the current district name
      const currentDistrictName = oldValues?.educationalDistrict;
      const currentDistrictOption = districts.find(
        (d) => d.name === currentDistrictName || d.raw?.name === currentDistrictName
      );
      const currentDistrictId = currentDistrictOption ? currentDistrictOption.id : null;

      const payload = {
        memberId: member?.id,
        requestedDate: new Date().toISOString().slice(0, 10),

        newWorkingLocationTypeId: toNullableNumber((data as any).workingLocationTypeNew),
        newEducationalDistrictId: keepCurrentDistrict && showKeepCurrentDistrict && currentDistrictId
          ? toNullableNumber(currentDistrictId)
          : toNullableNumber((data as any).educationalDistrictNew),
        newEducationalZoneId: toNullableNumber((data as any).educationalZoneNew),
        newWorkingLocationId: toNullableNumber((data as any).workingLocationNew),
        newDesignationId: toNullableNumber((data as any).designationNew),
        newNatureOfOccupationId: toNullableNumber((data as any).natureOfOccupationNew),

        newWorkingLocationAddress: (data as any).workingLocationAddressNew || "",
        newSalaryPayingOffice: (data as any).salaryPayingOfficeNew || "",
        newComputerNoInPayslip: (data as any).computerNoNameNew || "",
      };

      console.log("FORM DATA:", data);
      console.log("DTO PAYLOAD:", payload);

      const res = await authFetch("http://localhost:8080/api/member-transfers/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        let message = `Submit failed (${res.status})`;

        try {
          const body = JSON.parse(text);
          if (body?.message) message = body.message;
        } catch {
          if (text) message = text;
        }

        // 409 means another request for this member reached approval first
        if (res.status === 409) {
          setInFlightRequestId("");
        }

        throw new Error(message);
      }

      const saved = await res.json();
      const savedId = saved.memberTransferRequestID || saved.requestId || saved.id;

      setRequestId(savedId);
      setMemberTransferRequestNo(saved.requestId || saved.memberTransferRequestID || "");
      setStatus(saved.status || "SUBMITTED_FOR_COMMITTEE_APPROVAL");

      // Upload queued documents now that we have a saved request ID
      if (documentFiles.length > 0 && savedId) {
        const uploadedItems: DocumentFileItem[] = [];

        for (const docFile of documentFiles) {
          const reqDoc = requiredDocumentTypes.find(
            (doc) => doc.documentType === docFile.documentType
          );

          if (!reqDoc) {
            console.error("Required document type ID not found for", docFile.documentType);
            continue;
          }

          const formData = new FormData();
          formData.append("file", docFile.file);

          const uploadRes = await authFetch(
            `http://localhost:8080/api/uploaded-documents/upload?requestId=${encodeURIComponent(
              String(savedId)
            )}&requiredDocumentId=${encodeURIComponent(reqDoc.id)}`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            console.error("Document upload failed:", uploadRes.status, errText);
            continue;
          }

          const savedDoc = await uploadRes.json();
          uploadedItems.push({
            ...docFile,
            id: savedDoc.id,
            uploadedAt: savedDoc.uploadedAt,
          });
        }

        setDocumentFiles([]);

        // Refresh the uploaded documents list from backend
        try {
          const docsRes = await authFetch(
            `http://localhost:8080/api/uploaded-documents/by-request?requestId=${encodeURIComponent(String(savedId))}`
          );
          if (docsRes.ok) {
            const docs = await docsRes.json();
            setUploadedDocuments(Array.isArray(docs) ? docs : []);
          }
        } catch (e) {
          console.error("Failed to refresh uploaded documents:", e);
        }
      }

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

  //Hadle Edit mode
  const handleEnterEditMode = () => {
    if (!requestKey) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("requestId", requestKey);
    params.set("mode", "edit");

    router.replace(`?${params.toString()}`);
  };

  //Update transfer status after approve/reject
  const updateTransferStatus = (nextStatus: typeof status, reason?: string) => {
    setStatus(nextStatus);

    setLoadedRecord((prev) =>
      prev
        ? {
          ...prev,
          status: nextStatus,
          decisionReason: nextStatus === "REJECTED" ? reason || "" : prev.decisionReason,
        }
        : prev
    );
  };

  //Handle Approve transfer
  const handleApproveTransfer = () => {
    if (!requestId) return;
    setShowApproveConfirmModal(true);
  };

  const executeApproveTransfer = async () => {
    setShowApproveConfirmModal(false);
    if (!requestId) return;

    try {
      const res = await authFetch(`http://localhost:8080/api/member-transfers/approve/${requestId}`, {
        method: "POST",
      });

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

  //Handle Reject transfer
  const handleRejectTransfer = () => {
    if (!requestId) return;
    setRejectReason("");
    setShowRejectModal(true);
  };

  //Handle Confirm Reject transfer
  const handleConfirmRejectTransfer = async () => {
    if (!requestId || rejectReason.trim() === "") return;

    try {
      const res = await authFetch(`http://localhost:8080/api/member-transfers/reject/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionReason: rejectReason.trim() }),
      });

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

  const statusReason =
    status === "REJECTED"
      ? loadedRecord?.decisionReason || ""
      : "";

  const pageTitle = isExistingRequest ? "Member Transfer" : "New Member Transfer";
  const canReviewSubmission =
    isViewMode && status === "SUBMITTEDFORAPPROVAL" && canApprove;

  // MMC30: an approved transfer that moves the member to a different District has the
  // Loan and Finance Modules told to re-file their records. Compared here the same way
  // the server compares it - a transfer that keeps the District, including one where
  // "Keep Current District" was ticked, moves nothing and shows nothing.
  const newDistrictName = isKeepDistrict
    ? loadedRecord?.newWorkingLocation?.educationalDistrict?.name
    : loadedRecord?.newEducationalDistrict?.name;

  const districtChanged = Boolean(
    newDistrictName &&
    newDistrictName.trim().toLowerCase() !==
    (loadedRecord?.currentEducationalDistrict || "").trim().toLowerCase()
  );

  const showRelocationNotice = status === "APPROVED" && districtChanged;
  const showRequestStatus = Boolean(requestId || isExistingRequest);
  const canChangeStatus = isViewMode && availableStatusTargets.length > 0 && canSetInactive;

  const formatStatusLabel = (value: string) =>
    value === "SUBMITTEDFORAPPROVAL"
      ? "Submitted for Approval"
      : value.charAt(0) + value.slice(1).toLowerCase();

  const executeStatusChange = async () => {
    if (!statusChangeTarget || isChangingStatus) return;

    const actionId = memberTransferRequestNo || requestId || loadedRecord?.requestId || requestKey;
    if (!actionId) {
      setPopupMessage("The request must be saved before its status can be changed");
      setShowPopup(true);
      return;
    }

    setIsChangingStatus(true);
    try {
      const res = await authFetch(
        `http://localhost:8080/api/member-transfers/${encodeURIComponent(String(actionId))}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: statusChangeTarget }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        let message = "Failed to change status";
        try {
          message = JSON.parse(text).message || message;
        } catch { }
        setPopupMessage(message);
        setShowPopup(true);
        return;
      }

      const updated = await res.json();
      const nextStatus = updated.status || statusChangeTarget;
      setStatus(nextStatus);
      setLoadedRecord((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      setShowStatusChangeModal(false);
      setStatusChangeTarget("");
      setPopupMessage(`Status changed to ${formatStatusLabel(nextStatus)}`);
      setShowPopup(true);
    } catch (error) {
      console.error("Status change failed:", error);
      setPopupMessage("Failed to change status");
      setShowPopup(true);
    } finally {
      setIsChangingStatus(false);
    }
  };

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

            <p className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              <span>
                Member: {member?.fullName} ({member?.memberId})
              </span>

              {showRequestStatus && (
                <span className="font-semibold text-blue-600">
                  Status: <span>{status}</span>
                  {statusReason && <span className="ml-2 font-normal text-red-600">({statusReason})</span>}
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            {canChangeStatus && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStatusChangeTarget(availableStatusTargets[0]);
                  setShowStatusChangeModal(true);
                }}
              >
                Change Status
              </Button>
            )}

            {isViewMode && isEditableStatus && (
              <Button type="button" variant="outline" onClick={handleEnterEditMode}>
                Edit
              </Button>
            )}

            {!isViewMode && !isSubmitted && (
              <Button
                type="submit"
                disabled={!isValid || isSubmitting || !areMandatoryDocsUploaded || isBlockedByInFlightRequest}
                className="bg-[#953002] text-white hover:bg-[#953002] disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">Personal Details</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ReadOnlyField label="Full Name" value={oldValues.fullName} />
              <ReadOnlyField label="Date of Birth" value={oldValues.dateOfBirth} />
              <ReadOnlyField label="NIC Number" value={oldValues.nicNumber} />
              <ReadOnlyField label="Gender" value={oldValues.gender} />
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">Occupation Details</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <EditableSelect
                label="Designation"
                oldValue={oldValues.designation}
                newValue={loadedRecord?.newDesignation?.name}
                isViewMode={isViewMode}
                register={register("designationNew")}
                error={errors.designationNew?.message}
                options={designationOptions}
                disabled={isInputsDisabled}
              />

              <EditableSelect
                label="Nature of Occupation"
                oldValue={oldValues.natureOfOccupation}
                newValue={loadedRecord?.newNatureOfOccupation?.name}
                isViewMode={isViewMode}
                register={register("natureOfOccupationNew")}
                error={errors.natureOfOccupationNew?.message}
                options={natureOfOccupationOptions}
                disabled={isInputsDisabled}
              />

              <EditableSelect
                label="Working Location Type"
                oldValue={oldValues.workingLocationType}
                newValue={loadedRecord?.newWorkingLocationType?.name}
                isViewMode={isViewMode}
                register={register("workingLocationTypeNew")}
                error={errors.workingLocationTypeNew?.message}
                options={workingLocationTypes}
                disabled={isInputsDisabled}
              />

              <EditableSelect
                label="Educational District"
                oldValue={oldValues.educationalDistrict}
                newValue={isKeepDistrict ? loadedRecord?.newWorkingLocation?.educationalDistrict?.name : loadedRecord?.newEducationalDistrict?.name}
                isViewMode={isViewMode}
                register={register("educationalDistrictNew")}
                error={errors.educationalDistrictNew?.message}
                options={districts}
                disabled={!selectedWorkingLocationType || isInputsDisabled}
                showKeepCurrentDistrict={showKeepCurrentDistrict}
                keepCurrentDistrict={keepCurrentDistrict}
                onKeepCurrentDistrictChange={setKeepCurrentDistrict}
              />

              <EditableSelect
                label="Educational Zone"
                oldValue={oldValues.educationalZone}
                newValue={loadedRecord?.newEducationalZone?.name}
                isViewMode={isViewMode}
                register={register("educationalZoneNew")}
                error={errors.educationalZoneNew?.message}
                options={isZoneEnabled ? zones : [{ id: "NA", name: "NA" }]}
                disabled={!isZoneEnabled || !selectedDistrict || isInputsDisabled}
              />

              <EditableSelect
                label="Working Location"
                oldValue={oldValues.workingLocation}
                newValue={loadedRecord?.newWorkingLocation?.name}
                isViewMode={isViewMode}
                register={register("workingLocationNew")}
                error={errors.workingLocationNew?.message}
                options={workingLocations}
                disabled={!selectedWorkingLocationType || !selectedDistrict || (isZoneEnabled && !selectedZone) || isInputsDisabled}
              />

              <EditableInput
                label="Working Location Address"
                oldValue={oldValues.workingLocationAddress}
                newValue={loadedRecord?.newWorkingLocationAddress}
                isViewMode={isViewMode}
                register={register("workingLocationAddressNew")}
                error={errors.workingLocationAddressNew?.message}
                value={watch("workingLocationAddressNew")}
                disabled
              />

              <EditableInput
                label="Computer No"
                oldValue={oldValues.computerNoName}
                newValue={loadedRecord?.newComputerNoInPayslip}
                isViewMode={isViewMode}
                register={register("computerNoNameNew")}
                error={errors.computerNoNameNew?.message}
                disabled={isInputsDisabled}
              />

              <EditableSelect
                label="Salary Paying Office"
                oldValue={oldValues.salaryPayingOffice}
                newValue={loadedRecord?.newSalaryPayingOffice}
                isViewMode={isViewMode}
                register={register("salaryPayingOfficeNew")}
                error={errors.salaryPayingOfficeNew?.message}
                options={(salaryOptions.length > 0 ? salaryOptions : [
                  "Zonal Education Office",
                  "Provincial Education Office",
                  "Ministry of Education",
                ]).map((item) => ({ id: item, name: item }))}
                disabled={!selectedWorkingLocation || isInputsDisabled}
              />
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">Supporting Documents</h3>

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
                      {requiredDocumentTypes.map((type) => {
                        const isUploaded = uploadedDocuments.some(
                          (d) => d.requiredDocumentId === type.id || d.documentType === type.documentType
                        );
                        const isStaged = documentFiles.some((d) => d.documentType === type.documentType);
                        const isAlreadyAdded = Boolean(isUploaded || isStaged);

                        return (
                          <option key={type.id} value={type.documentType} disabled={isAlreadyAdded}>
                            {type.displayName} {type.mandatory ? "(Mandatory)" : ""}{" "}
                            {isAlreadyAdded ? "(Already Added)" : ""}
                          </option>
                        );
                      })}
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
                        setSelectedDocumentType("");
                        e.target.value = "";
                      }}
                    />
                    <UploadCloud className="mb-2 h-8 w-8 text-[#953002]" />
                    <p>{selectedDocumentType ? "Click to upload selected document" : "Select a document type first"}</p>
                  </label>
                </>
              )}

              {isInputsDisabled && (
                <div className="rounded-lg border border-dashed bg-gray-50 p-6 text-center text-sm text-gray-500">
                  {isSubmitted ? "Document upload is disabled after submission." : "Cannot upload files in view mode."}
                </div>
              )}

              {documentFiles.length > 0 && (
                <div className="overflow-x-auto rounded border">
                  <Table className="border-collapse">
                    <TableHeader>
                      <TableRow className="bg-[#fafafa] hover:bg-[#fafafa]">
                        <TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">Document Type</TableHead>
                        <TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">File Name</TableHead>
                        {!isInputsDisabled && (
                          <TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase text-right">Action</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documentFiles.map((item, index) => (
                        <TableRow key={`${item.file.name}-${index}`} className="hover:bg-neutral-50">
                          <TableCell className="px-4 py-4 text-neutral-700">
                            {requiredDocumentTypes.find((t) => t.documentType === item.documentType)?.displayName || item.documentType}
                          </TableCell>
                          <TableCell className="px-4 py-4 font-medium">{item.file.name}</TableCell>
                          {!isInputsDisabled && (
                            <TableCell className="px-4 py-4 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Remove document"
                                onClick={() => setDocumentFiles((prev) => prev.filter((_, i) => i !== index))}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </section>

          {uploadedDocuments.length > 0 && (
            <section className="rounded-lg border bg-white p-4">
              <h3 className="mb-4 text-xl font-bold text-[#953002]">Uploaded Documents</h3>

              <div className="space-y-3">
                {uploadedDocuments.map((doc) => {
                  const reqDoc = requiredDocumentTypes.find(
                    (type) => type.id === doc.requiredDocumentId || type.documentType === doc.documentType
                  );
                  const docTypeLabel = reqDoc?.displayName || doc.documentType || "Document";
                  const previewUrl =
                    doc.fileUrl ||
                    `http://localhost:8080/api/uploaded-documents/download/${doc.id}?requestId=${encodeURIComponent(
                      doc.requestId || String(requestId || "")
                    )}`;

                  return (
                    <div key={doc.id} className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{docTypeLabel}</p>
                        <p className="mt-1 text-xs text-gray-600">{doc.fileName || "Unnamed file"}</p>
                        {doc.uploadedAt && (
                          <p className="mt-1 text-xs text-gray-500">Uploaded: {new Date(doc.uploadedAt).toLocaleString()}</p>
                        )}
                      </div>

                      <div className="ml-3 flex gap-2">
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md bg-[#953002] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#7a2700]"
                        >
                          Preview
                        </a>
                        <a
                          href={`${previewUrl}&download=true`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md border border-[#953002] bg-white px-3 py-1.5 text-xs font-medium text-[#953002] transition-colors hover:bg-[#953002]/10"
                        >
                          Download
                        </a>
                        {!isInputsDisabled && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleDeleteUploadedDocument(doc.id)}
                            className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-3 py-1.5 text-xs h-auto"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {showRelocationNotice && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <Info size={16} className="mt-0.5 shrink-0 text-blue-600" />
              <p className="text-sm text-blue-800">
                The District changed to{" "}
                <span className="font-semibold">{newDistrictName}</span>. A message has
                been sent to the Loan Module and the Finance Module to move this
                member&apos;s loans and savings accounts to the new District Office.
                <span className="mt-1 block text-xs text-blue-700">
                  Those modules are not integrated with this system yet, so the messages
                  are recorded rather than delivered.
                </span>
              </p>
            </div>
          )}

          {canReviewSubmission && (
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" className="bg-green-100 text-green-600 hover:bg-green-200" onClick={handleApproveTransfer}>
                Approve
              </Button>

              <Button type="button" className="bg-red-100 text-red-600 hover:bg-red-200" onClick={handleRejectTransfer}>
                Reject
              </Button>
            </div>
          )}
        </div>
      </form>

      {showPopup && (() => {
        const msgLower = popupMessage.toLowerCase();
        const isError =
          msgLower.includes("failed") ||
          msgLower.includes("error") ||
          msgLower.includes("duplicate") ||
          msgLower.includes("already") ||
          msgLower.includes("cannot") ||
          msgLower.includes("required") ||
          msgLower.includes("please");

        let popupTitle = "Notification";
        if (msgLower.includes("submitted")) popupTitle = "Submitted for Approval";
        else if (msgLower.includes("saved")) popupTitle = "Request Saved";
        else if (msgLower.includes("approved")) popupTitle = "Member Transfer Approved";
        else if (msgLower.includes("rejected")) popupTitle = "Member Transfer Rejected";
        else if (msgLower.includes("incomplete")) popupTitle = "Marked as Incomplete";
        else if (isError) popupTitle = "Notice";

        const currentReqId = memberTransferRequestNo || requestId || loadedRecord?.requestId;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-center border border-gray-100">
              {isError ? (
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100/80">
                  <AlertCircle className="h-7 w-7 text-amber-600 stroke-[2.5]" />
                </div>
              ) : (
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100/80">
                  <Check className="h-7 w-7 text-emerald-600 stroke-[2.5]" />
                </div>
              )}

              <h3 className="mb-2 text-xl font-bold text-[#953002]">
                {popupTitle}
              </h3>

              <p className="mb-4 text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                {popupMessage}
              </p>

              {currentReqId && (
                <div className="mb-6 inline-block rounded-md bg-gray-100 px-3.5 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200/60">
                  Request ID: {currentReqId}
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 mt-2">
                <Button
                  type="button"
                  onClick={() => setShowPopup(false)}
                  className="w-32 bg-[#953002] text-white hover:bg-[#7a2700] font-semibold py-2 rounded-lg text-sm transition-all shadow-sm mx-auto block"
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {showStatusChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
            <h3 className="mb-2 text-xl font-bold text-[#953002] text-center">
              Change Status
            </h3>

            <p className="mb-4 text-sm text-gray-600 text-center">
              Current status:{" "}
              <span className="font-semibold text-gray-800">{formatStatusLabel(status)}</span>
            </p>

            <div className="mb-6 space-y-2">
              <label className="block text-sm font-medium text-gray-700">Change to</label>
              {availableStatusTargets.map((target) => (
                <label
                  key={target}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="memberTransferStatusChangeTarget"
                    value={target}
                    checked={statusChangeTarget === target}
                    onChange={() => setStatusChangeTarget(target)}
                  />
                  <span className="font-medium text-gray-800">{formatStatusLabel(target)}</span>
                  {target === "INACTIVE" && (
                    <span className="ml-auto text-xs text-gray-500">Requires Inactive rights</span>
                  )}
                </label>
              ))}
            </div>

            <div className="flex justify-center gap-3 border-t border-gray-100 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowStatusChangeModal(false);
                  setStatusChangeTarget("");
                }}
                className="w-28 rounded-lg text-sm font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={executeStatusChange}
                disabled={!statusChangeTarget || isChangingStatus}
                className="w-28 bg-[#953002] text-white hover:bg-[#7a2700] font-semibold rounded-lg text-sm shadow-sm disabled:opacity-50"
              >
                {isChangingStatus ? "Saving..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSubmitConfirmModal && (() => {
        const currentReqId = memberTransferRequestNo || requestId || loadedRecord?.requestId;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-center border border-gray-100">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100/80">
                <Check className="h-7 w-7 text-emerald-600 stroke-[2.5]" />
              </div>

              <h3 className="mb-2 text-xl font-bold text-[#953002]">
                Submit for Approval
              </h3>

              <p className="mb-4 text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                The member transfer request will be submitted for approval and can no longer be edited.
              </p>

              {currentReqId && (
                <div className="mb-6 inline-block rounded-md bg-gray-100 px-3.5 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200/60">
                  Request ID: {currentReqId}
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 mt-2 flex justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSubmitConfirmModal(false)}
                  className="w-28 rounded-lg text-sm font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="w-28 bg-[#953002] text-white hover:bg-[#7a2700] font-semibold rounded-lg text-sm shadow-sm"
                  onClick={executeSubmit}
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {showApproveConfirmModal && (() => {
        const currentReqId = memberTransferRequestNo || requestId || loadedRecord?.requestId;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-center border border-gray-100">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100/80">
                <Check className="h-7 w-7 text-emerald-600 stroke-[2.5]" />
              </div>

              <h3 className="mb-2 text-xl font-bold text-[#953002]">
                Approve Member Transfer
              </h3>

              <p className="mb-4 text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                Are you sure you want to approve this member transfer request?
              </p>

              {currentReqId && (
                <div className="mb-6 inline-block rounded-md bg-gray-100 px-3.5 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200/60">
                  Request ID: {currentReqId}
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 mt-2 flex justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowApproveConfirmModal(false)}
                  className="w-28 rounded-lg text-sm font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="w-28 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold rounded-lg text-sm shadow-sm"
                  onClick={executeApproveTransfer}
                >
                  Approve
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-[#953002]">Reject Member Transfer</h3>
            <p className="mt-1 text-sm text-gray-600">Enter the reason for rejection.</p>

            <div className="mt-4">
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                className="min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#953002] focus:ring-2 focus:ring-[#953002]/20"
                placeholder="Reason for rejection"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowRejectModal(false)}>
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-gray-600">{label}</label>
      <Input value={formatDisplayValue(value)} readOnly />
    </div>
  );
}

function EditableInput({
  label,
  oldValue,
  newValue,
  isViewMode,
  register,
  error,
  value,
  disabled = false,
}: any) {
  return (
    <>
      <div>
        <label className="mb-1 block text-sm text-gray-600">{label} (Current)</label>
        <Input value={formatDisplayValue(oldValue)} disabled />
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600">{label} (New)</label>
        {isViewMode ? (
          <Input value={formatDisplayValue(newValue) || formatDisplayValue(oldValue)} disabled />
        ) : typeof value !== "undefined" ? (
          <Input {...register} value={value || ""} disabled={disabled} readOnly />
        ) : (
          <Input {...register} disabled={disabled} />
        )}
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    </>
  );
}

function EditableSelect({
  label,
  oldValue,
  newValue,
  isViewMode,
  register,
  error,
  options = [],
  disabled = false,
  showKeepCurrentDistrict = false,
  keepCurrentDistrict = false,
  onKeepCurrentDistrictChange,
}: {
  label: string;
  oldValue: string;
  newValue?: string;
  isViewMode?: boolean;
  register: any;
  error?: string;
  options: OptionItem[];
  disabled?: boolean;
  showKeepCurrentDistrict?: boolean;
  keepCurrentDistrict?: boolean;
  onKeepCurrentDistrictChange?: (checked: boolean) => void;
}) {
  const selectId = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return (
    <>
      <div>
        <label className="mb-1 block text-sm text-gray-600">{label} (Current)</label>
        <Input value={formatDisplayValue(oldValue)} disabled />
      </div>

      <div>
        <label htmlFor={selectId} className="mb-1 block text-sm text-gray-600">
          {label} (New)
        </label>

        {isViewMode ? (
          <Input id={selectId} value={formatDisplayValue(newValue) || formatDisplayValue(oldValue)} disabled />
        ) : (
          <select
            id={selectId}
            {...register}
            disabled={disabled}
            className="h-10 w-full rounded-md border px-3 text-sm disabled:bg-gray-100"
          >
            <option value="">{formatDisplayValue(oldValue)}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        )}

        {showKeepCurrentDistrict && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="keep-current-district"
              checked={keepCurrentDistrict}
              disabled={isViewMode || disabled}
              onChange={(e) => onKeepCurrentDistrictChange?.(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#953002] focus:ring-[#953002] cursor-pointer disabled:cursor-not-allowed"
            />
            <label htmlFor="keep-current-district" className="text-xs text-gray-600 select-none cursor-pointer disabled:cursor-not-allowed">
              Keep the Current District on the Member Profile
            </label>
          </div>
        )}

        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    </>
  );
}