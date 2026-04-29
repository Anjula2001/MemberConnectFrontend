"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/lib/toast-context";
import {
  memberRegistrationSchema,
  type MemberRegistration,
} from "@/lib/validators/memberRegistration.schema";
import {
  createMemberApplication,
  getMemberApplicationById,
  type ApplicationStatus,
  type Gender,
  type Identification,
  type Language,
  type NatureOfOccupation,
  type MemberApplicationDTO,
  updateMemberApplicationPartial,
} from "@/lib/api/memberApplications";
import {
  getDocumentSummary,
  getDocumentsByApplication,
  deleteDocument,
  uploadDocumentFile,
  type DocumentSummaryDTO,
  type DocumentType,
} from "@/lib/api/documents";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import DocumentUploadCard from "@/src/components/membership/DocumentUploadCard";

const identificationTypeValues = [
  "NIC",
  "Passport",
  "DrivingLicense",
  "BirthCertificate",
] as const;

type IdentificationType = (typeof identificationTypeValues)[number];

function IdentificationMultiSelect({
  selected,
  onChange,
}: {
  selected: IdentificationType[];
  onChange: (values: IdentificationType[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleValue = (value: IdentificationType) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  };

  const label =
    selected.length === 0
      ? "Select Identification Types"
      : selected.length === identificationTypeValues.length
        ? "All Selected"
        : `${selected.length} Selected`;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="border-input flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      >
        <span className={selected.length === 0 ? "text-muted-foreground" : ""}>
          {label}
        </span>
        <span className="text-muted-foreground">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          <div className="p-1">
            {identificationTypeValues.map((value) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Checkbox
                  checked={selected.includes(value)}
                  onCheckedChange={() => toggleValue(value)}
                  className="data-[state=checked]:bg-[#953002] data-[state=checked]:border-[#953002]"
                />
                {value}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  error,
  children,
  required = false,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

type NewMemberRegistrationFormProps = {
  applicationId?: number | null;
  readOnly?: boolean;
  onDone?: () => void;
};

export function NewMemberRegistrationForm({
  applicationId,
  readOnly = false,
  onDone,
}: NewMemberRegistrationFormProps) {
  const { addToast } = useToast();
  const isEditMode = !!applicationId;
  const [currentTab, setCurrentTab] = useState<"application" | "documents">(
    "application"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingApplication, setIsLoadingApplication] = useState(false);
  const [savedApplicationId, setSavedApplicationId] = useState<number | null>(
    null
  );
  const [documentSummary, setDocumentSummary] =
    useState<DocumentSummaryDTO | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [boardDecisionReason, setBoardDecisionReason] = useState("");
  // Map of documentType -> { id, url, fileName } for previewing already-uploaded files
  const [existingDocumentUrls, setExistingDocumentUrls] = useState<
    Record<string, { id: number; url: string; fileName: string }>
  >({});
  const hasCompletedMandatoryDocuments =
    !!documentSummary &&
    documentSummary.mandatoryDocumentCount > 0 &&
    documentSummary.uploadedMandatoryDocumentCount >=
    documentSummary.mandatoryDocumentCount;

  const mapGender = (value: string): Gender =>
    value.toUpperCase() === "FEMALE" ? "FEMALE" : "MALE";

  const mapLanguage = (value: string): Language => {
    const normalized = value.toUpperCase();
    if (normalized === "SINHALA") return "SINHALA";
    if (normalized === "TAMIL") return "TAMIL";
    return "ENGLISH";
  };

  const mapNatureOfOccupation = (value: string): NatureOfOccupation => {
    const normalized = value.toUpperCase();
    if (normalized === "PROBATION") return "PROBATION";
    if (normalized === "TEMPORARY") return "TEMPORARY";
    if (normalized === "CASUAL") return "CASUAL";
    return "PERMANENT";
  };

  const mapStatus = (value?: string): ApplicationStatus | undefined => {
    if (!value) return undefined;

    const normalized = value.trim().toUpperCase().replaceAll(" ", "_");

    if (normalized === "SUBMITTED_FOR_APPROVAL") return "SUBMITTED_FOR_APPROVAL";
    if (normalized === "ADDED_TO_BOARD_APPROVAL_LIST")
      return "ADDED_TO_BOARD_APPROVAL_LIST";
    if (normalized === "REJECTED") return "REJECTED";
    if (normalized === "INACTIVE") return "INACTIVE";
    if (normalized === "NEW") return "NEW";
    return undefined;
  };

  const mapGenderToForm = (value?: Gender): string =>
    value === "FEMALE" ? "Female" : "Male";

  const mapLanguageToForm = (value?: Language): string => {
    if (value === "SINHALA") return "Sinhala";
    if (value === "TAMIL") return "Tamil";
    return "English";
  };

  const mapNatureOfOccupationToForm = (value?: NatureOfOccupation): string => {
    if (value === "PROBATION") return "Probation";
    if (value === "TEMPORARY") return "Temporary";
    if (value === "CASUAL") return "Casual";
    return "Permanent";
  };

  const mapStatusToForm = (value?: ApplicationStatus): string => {
    if (value === "SUBMITTED_FOR_APPROVAL") return "Submitted for Approval";
    if (value === "ADDED_TO_BOARD_APPROVAL_LIST")
      return "Added to Board Approval List";
    if (value === "REJECTED") return "Rejected";
    if (value === "INACTIVE") return "Inactive";
    return "New";
  };

  const mapIdentificationToForm = (value?: Identification): string =>
    value ?? "NIC";

  const parseIdentificationDetails = (
    value?: string
  ): { types: IdentificationType[]; numbers: Record<string, string> } => {
    if (!value) {
      return { types: [], numbers: {} };
    }

    try {
      const parsed = JSON.parse(value) as Array<{
        type?: IdentificationType;
        number?: string;
      }>;

      const types = parsed
        .map((item) => item.type)
        .filter((item): item is IdentificationType =>
          identificationTypeValues.includes(item as IdentificationType)
        );
      const numbers = parsed.reduce<Record<string, string>>((acc, item) => {
        if (item.type) {
          acc[item.type] = item.number ?? "";
        }
        return acc;
      }, {});

      return { types, numbers };
    } catch {
      return { types: [], numbers: {} };
    }
  };

  const parseAmount = (value?: string) => {
    if (!value || value.trim() === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const defaultFormValues = useMemo<MemberRegistration>(
    () => ({
      applicationDate: new Date().toISOString().split("T")[0],
      statusOverride: "New",
      title: "Mr",
      preferredLanguage: "English",
      gender: "Male",
      workingLocationType: "",
      designation: "",
      natureOfOccupation: "Permanent",
      educationalDistrict: "Colombo",
      educationalZone: "",
      workingLocationAddress: "",
      nomineeRelationship: "",
      identificationTypes: [],
      identificationNumbers: {},
      fullName: "",
      nameAsInPayroll: "",
      nameWithInitials: "",
      nicNumber: "",
      dateOfBirth: "",
      permanentAddress: "",
      workingLocation: "",
      salaryPayingOffice: "",
      computerNoInPayroll: "",
      officePhone: "",
      privatePhone: "",
      mobileNumber: "",
      emailAddress: "",
      shareAccount: "",
      specialDepositAccount: "",
      fixedDepositAccount: "",
      scholarshipDeathDonationPension: "",
      nomineeFullName: "",
      identificationNumber: "",
      nomineeAddress: "",
    }),
    []
  );

  const {
    control,
    register,
    reset,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberRegistration>({
    resolver: zodResolver(memberRegistrationSchema),
    defaultValues: defaultFormValues,
  });

  const selectedIdentificationTypes = watch("identificationTypes");
  const selectedIdentificationNumbers = watch("identificationNumbers");

  useEffect(() => {
    const targetApplicationId = applicationId ?? null;

    if (!targetApplicationId) {
      setSavedApplicationId(null);
      setDocumentSummary(null);
      setBoardDecisionReason("");
      setCurrentTab("application");
      reset(defaultFormValues);
      return;
    }

    let isCancelled = false;

    const loadApplication = async () => {
      setIsLoadingApplication(true);
      try {
        const data = await getMemberApplicationById(targetApplicationId);
        if (isCancelled) return;

        const parsedIdentificationDetails = parseIdentificationDetails(
          data.identificationDetails
        );

        const mappedValues: MemberRegistration = {
          ...defaultFormValues,
          applicationDate: data.applicationDate ?? defaultFormValues.applicationDate,
          title: data.title ?? defaultFormValues.title,
          fullName: data.fullName ?? "",
          nameAsInPayroll: data.nameAsInPayroll ?? "",
          nameWithInitials: data.nameWithInitials ?? "",
          nicNumber: data.nicNumber ?? "",
          dateOfBirth: data.dateOfBirth ?? "",
          gender: mapGenderToForm(data.gender),
          preferredLanguage: mapLanguageToForm(data.preferredLanguage),
          permanentAddress: data.permanentPrivateAddress ?? "",
          workingLocationType: data.workingLocationType ?? "",
          designation: data.designation ?? "",
          natureOfOccupation: mapNatureOfOccupationToForm(data.natureOfOccupation),
          educationalDistrict: data.educationalDistrict ?? defaultFormValues.educationalDistrict,
          educationalZone: data.educationalZone ?? "",
          workingLocation: data.workingLocation ?? "",
          workingLocationAddress: data.workingLocationAddress ?? "",
          salaryPayingOffice: data.salaryPayingOffice ?? "",
          computerNoInPayroll: data.computerNoInPayslip ?? "",
          officePhone: data.officeTelephone ?? "",
          privatePhone: data.privateTelephone ?? "",
          mobileNumber: data.mobileNumber ?? "",
          emailAddress: data.emailAddress ?? "",
          shareAccount:
            data.shareAccountAmount !== undefined
              ? String(data.shareAccountAmount)
              : "",
          specialDepositAccount:
            data.specialDepositAmount !== undefined
              ? String(data.specialDepositAmount)
              : "",
          fixedDepositAccount:
            data.fixedDepositAmount !== undefined
              ? String(data.fixedDepositAmount)
              : "",
          scholarshipDeathDonationPension:
            data.scholarshipDeathDonationPensionAmount !== undefined
              ? String(data.scholarshipDeathDonationPensionAmount)
              : "",
          statusOverride: mapStatusToForm(data.status),
          nomineeRelationship: data.nomineeRelationship ?? "",
          identificationTypes: parsedIdentificationDetails.types.length
            ? parsedIdentificationDetails.types
            : data.identification
              ? [data.identification as IdentificationType]
              : [],
          identificationNumbers: parsedIdentificationDetails.types.length
            ? parsedIdentificationDetails.numbers
            : data.identificationNumber && data.identification
              ? { [data.identification as IdentificationType]: data.identificationNumber }
              : {},
          nomineeAddress: data.nomineeAddress ?? "",
          nomineeFullName: data.nomineeFullName ?? "",
        };

        reset(mappedValues);
        setSavedApplicationId(targetApplicationId);
        setBoardDecisionReason(data.boardDecisionReason ?? "");

        const [summary, existingDocs] = await Promise.all([
          getDocumentSummary(targetApplicationId),
          getDocumentsByApplication(targetApplicationId),
        ]);

        if (!isCancelled) {
          setDocumentSummary(summary);
          // Build a map: documentType -> { id, url, fileName }
          const urlMap: Record<string, { id: number; url: string; fileName: string }> = {};
          for (const doc of existingDocs) {
            if (doc.storagePath) {
              urlMap[doc.documentType] = {
                id: doc.id,
                url: `/api/documents/file/${doc.storagePath}`,
                fileName: doc.fileName ?? doc.documentType,
              };
            }
          }
          setExistingDocumentUrls(urlMap);
        }
      } catch (error) {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load application details";
          addToast(message, "destructive");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingApplication(false);
        }
      }
    };

    void loadApplication();

    return () => {
      isCancelled = true;
    };
  }, [applicationId, defaultFormValues, reset]);

  const onSubmit = async (data: MemberRegistration) => {
    setIsSubmitting(true);
    try {
      const primaryIdentificationType = data.identificationTypes[0];
      const primaryIdentificationNumber = primaryIdentificationType
        ? String(data.identificationNumbers?.[primaryIdentificationType] ?? "")
        : "";

      const identificationDetails = data.identificationTypes.map((type) => ({
        type,
        number: data.identificationNumbers?.[type] ?? "",
      }));

      const payload: MemberApplicationDTO = {
        status: mapStatus(data.statusOverride),
        applicationDate: data.applicationDate,
        title: data.title,
        fullName: data.fullName,
        nameAsInPayroll: data.nameAsInPayroll,
        nameWithInitials: data.nameWithInitials,
        nicNumber: data.nicNumber,
        dateOfBirth: data.dateOfBirth,
        gender: mapGender(data.gender),
        preferredLanguage: mapLanguage(data.preferredLanguage),
        permanentPrivateAddress: data.permanentAddress,
        workingLocationType: data.workingLocationType,
        designation: data.designation,
        natureOfOccupation: mapNatureOfOccupation(data.natureOfOccupation),
        educationalDistrict: data.educationalDistrict,
        educationalZone: data.educationalZone,
        workingLocation: data.workingLocation,
        workingLocationAddress: data.workingLocationAddress,
        computerNoInPayslip: data.computerNoInPayroll,
        salaryPayingOffice: data.salaryPayingOffice,
        officeTelephone: data.officePhone,
        privateTelephone: data.privatePhone,
        mobileNumber: data.mobileNumber,
        emailAddress: data.emailAddress,
        shareAccountAmount: parseAmount(data.shareAccount),
        specialDepositAmount: parseAmount(data.specialDepositAccount),
        fixedDepositAmount: parseAmount(data.fixedDepositAccount),
        scholarshipDeathDonationPensionAmount: parseAmount(
          data.scholarshipDeathDonationPension
        ),
        nomineeFullName: data.nomineeFullName,
        nomineeRelationship: data.nomineeRelationship,
        identification: primaryIdentificationType as Identification | undefined,
        identificationNumber: primaryIdentificationNumber,
        identificationDetails: JSON.stringify(identificationDetails),
        nomineeAddress: data.nomineeAddress,
      };

      const response = isEditMode && savedApplicationId
        ? await updateMemberApplicationPartial(savedApplicationId, payload)
        : await createMemberApplication(payload);

      if (response.id) {
        setSavedApplicationId(response.id);
        const summary = await getDocumentSummary(response.id);
        setDocumentSummary(summary);
        addToast(
          isEditMode
            ? "Registration updated successfully!"
            : "Registration saved successfully! You can now upload documents."
        );
        setCurrentTab("documents");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : isEditMode
            ? "Failed to update registration"
            : "Failed to save registration";
      addToast(message, "destructive");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocumentUpload = async (file: File, documentType: DocumentType) => {
    if (!savedApplicationId) {
      addToast("Please save the application first", "destructive");
      return;
    }

    setIsUploadingDoc(true);
    try {
      const uploaded = await uploadDocumentFile({
        applicationId: savedApplicationId,
        documentType,
        file,
      });

      // Update preview map immediately with the newly uploaded file
      if (uploaded.storagePath) {
        setExistingDocumentUrls((prev) => ({
          ...prev,
          [documentType]: {
            id: uploaded.id,
            url: `/api/documents/file/${uploaded.storagePath}`,
            fileName: uploaded.fileName ?? file.name,
          },
        }));
      }

      const summary = await getDocumentSummary(savedApplicationId);
      setDocumentSummary(summary);
      addToast(`${documentType.replace(/_/g, " ")} uploaded successfully!`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload document";
      addToast(message, "destructive");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDocumentDelete = async (docType: DocumentType) => {
    const entry = existingDocumentUrls[docType];
    if (!entry || !savedApplicationId) return;
    await deleteDocument(entry.id);
    setExistingDocumentUrls((prev) => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
    const updated = await getDocumentSummary(savedApplicationId);
    setDocumentSummary(updated);
  };

  const districtZoneMap: Record<string, string[]> = {
    Colombo: ["Colombo South", "Colombo North", "Homagama"],
    Kandy: ["Kandy", "Gampola", "Katugastota"],
    Galle: ["Galle", "Elpitiya", "Ambalangoda"],
    Matara: ["Matara", "Akuressa", "Weligama"],
    Jaffna: ["Jaffna", "Nallur", "Chavakachcheri"],
    Gampaha: ["Gampaha", "Negombo", "Minuwangoda"],
  };
  const selectedDistrict = watch("educationalDistrict");

  return (
    <Tabs
      value={currentTab}
      onValueChange={(val: string) =>
        setCurrentTab(val as "application" | "documents")
      }
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2 rounded-md bg-gray-100 p-1">
        <TabsTrigger
          value="application"
          className="inline-flex h-9 w-full items-center justify-center rounded-sm px-3 text-sm font-medium text-gray-700 transition-colors data-[state=active]:bg-[#953002] data-[state=active]:text-white"
        >
          Application Details
        </TabsTrigger>
        <TabsTrigger
          value="documents"
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium text-gray-700 transition-colors data-[state=active]:bg-[#953002] data-[state=active]:text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!savedApplicationId}
        >
          Supporting Documents
          {documentSummary && (
            <span className="inline-flex h-5 items-center rounded bg-amber-100 px-2 text-xs font-semibold text-amber-800">
              {documentSummary.uploadedMandatoryDocumentCount}/
              {documentSummary.mandatoryDocumentCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="application" className="space-y-4">
        {isLoadingApplication ? (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="px-5 py-8 text-center">
              <p className="text-gray-500">Loading application details...</p>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className={readOnly ? "pointer-events-none select-none" : ""}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-[#953002]">
                  {isEditMode ? "Edit Member Registration" : "New Member Registration"}
                </h1>
                <p className="text-sm text-gray-500">
                  {isEditMode ? "Update and re-submit the application" : "Status: New"}
                </p>
              </div>
            </div>

            {readOnly && boardDecisionReason && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span className="font-semibold">Board decision reason:</span>{" "}
                {boardDecisionReason}
              </div>
            )}

            {/* Application Date */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-base text-[#953002]">
                  Application Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Application Date"
                    error={errors.applicationDate?.message}
                    required
                  >
                    <Input
                      type="date"
                      {...register("applicationDate")}
                      className="w-full"
                    />
                  </FormField>
                  <FormField label="Status (Override)">
                    <Controller
                      name="statusOverride"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="Submitted for Approval">
                              Submitted for Approval
                            </SelectItem>
                            <SelectItem value="Added to Board Approval List">
                              Added to Board Approval List
                            </SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-base text-[#953002]">
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                {/* Row 1: Title and Full Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Title"
                    error={errors.title?.message}
                    required
                  >
                    <Controller
                      name="title"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Title" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Rev.">Rev.</SelectItem>
                            <SelectItem value="Mr">Mr</SelectItem>
                            <SelectItem value="Mrs">Mrs</SelectItem>
                            <SelectItem value="Miss">Miss</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                  <FormField
                    label="Full Name"
                    error={errors.fullName?.message}
                    required
                  >
                    <Input {...register("fullName")} placeholder="Full Name" />
                  </FormField>
                </div>

                {/* Row 2: Name as in Payroll and Name with Initials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Name as in Payroll"
                    error={errors.nameAsInPayroll?.message}
                    required
                  >
                    <Input
                      {...register("nameAsInPayroll")}
                      placeholder="Name as in Payroll"
                    />
                  </FormField>
                  <FormField
                    label="Name with Initials"
                    error={errors.nameWithInitials?.message}
                    required
                  >
                    <Input
                      {...register("nameWithInitials")}
                      placeholder="Name with Initials"
                    />
                  </FormField>
                </div>

                {/* Row 3: NIC, DOB, Gender, Preferred Language */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    label="NIC Number"
                    error={errors.nicNumber?.message}
                    required
                  >
                    <Input
                      {...register("nicNumber")}
                      placeholder="NIC Number"
                    />
                  </FormField>
                  <FormField
                    label="Date of Birth"
                    error={errors.dateOfBirth?.message}
                    required
                  >
                    <Input type="date" {...register("dateOfBirth")} />
                  </FormField>
                  <FormField
                    label="Gender"
                    error={errors.gender?.message}
                    required
                  >
                    <Controller
                      name="gender"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                  <FormField
                    label="Preferred Language"
                    error={errors.preferredLanguage?.message}
                    required
                  >
                    <Controller
                      name="preferredLanguage"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Sinhala">Sinhala</SelectItem>
                            <SelectItem value="Tamil">Tamil</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                </div>

                {/* Row 4: Permanent Address */}
                <FormField
                  label="Permanent Private Address"
                  error={errors.permanentAddress?.message}
                >
                  <Input
                    {...register("permanentAddress")}
                    placeholder="Permanent Address"
                    className="w-full min-h-20"
                  />
                </FormField>
              </CardContent>
            </Card>

            {/* Employment Information */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-base text-[#953002]">
                  Employment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    label="Working Location Type"
                    error={errors.workingLocationType?.message}
                    required
                  >
                    <Input
                      {...register("workingLocationType")}
                      placeholder="Enter Working Location Type"
                    />
                  </FormField>
                  <FormField
                    label="Designation"
                    error={errors.designation?.message}
                    required
                  >
                    <Input
                      {...register("designation")}
                      placeholder="Enter Designation"
                    />
                  </FormField>
                  <FormField
                    label="Nature of Occupation"
                    error={errors.natureOfOccupation?.message}
                    required
                  >
                    <Controller
                      name="natureOfOccupation"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Occupation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Permanent">Permanent</SelectItem>
                            <SelectItem value="Probation">Probation</SelectItem>
                            <SelectItem value="Temporary">Temporary</SelectItem>
                            <SelectItem value="Casual">Casual</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Educational District"
                    error={errors.educationalDistrict?.message}
                    required
                  >
                    <Controller
                      name="educationalDistrict"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            const zones = districtZoneMap[value] ?? [];
                            const firstZone =
                              zones.length > 0 ? zones[0] : "";
                            setValue("educationalZone", firstZone);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select District" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Colombo">Colombo</SelectItem>
                            <SelectItem value="Kandy">Kandy</SelectItem>
                            <SelectItem value="Galle">Galle</SelectItem>
                            <SelectItem value="Matara">Matara</SelectItem>
                            <SelectItem value="Jaffna">Jaffna</SelectItem>
                            <SelectItem value="Gampaha">Gampaha</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                  <FormField
                    label="Educational Zone"
                    error={errors.educationalZone?.message}
                  >
                    <Controller
                      name="educationalZone"
                      control={control}
                      render={({ field }) => {
                        const zones = districtZoneMap[selectedDistrict] ?? [];

                        return (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Zone" />
                            </SelectTrigger>
                            <SelectContent>
                              {zones.map((zone) => (
                                <SelectItem key={zone} value={zone}>
                                  {zone}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      }}
                    />
                  </FormField>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Working Location"
                    error={errors.workingLocation?.message}
                  >
                    <Input
                      {...register("workingLocation")}
                      placeholder="Enter Working Location (School name, university name etc.)"
                    />
                  </FormField>
                  <FormField
                    label="Working Location Address"
                    error={errors.workingLocationAddress?.message}
                  >
                    <Input
                      {...register("workingLocationAddress")}
                      placeholder="Working Location Address"
                    />
                  </FormField>
                </div>

                {/* Row 4 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Salary Paying Office"
                    error={errors.salaryPayingOffice?.message}
                  >
                    <Input
                      {...register("salaryPayingOffice")}
                      placeholder="Office"
                    />
                  </FormField>
                  <FormField
                    label="Computer No. in Payroll"
                    error={errors.computerNoInPayroll?.message}
                  >
                    <Input
                      {...register("computerNoInPayroll")}
                      placeholder="Computer No"
                    />
                  </FormField>
                </div>

                {/* Row 5 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Office Telephone"
                    error={errors.officePhone?.message}
                  >
                    <Input
                      {...register("officePhone")}
                      placeholder="Office Telephone"
                    />
                  </FormField>
                  <FormField
                    label="Private Telephone"
                    error={errors.privatePhone?.message}
                  >
                    <Input
                      {...register("privatePhone")}
                      placeholder="Private Telephone"
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-base text-[#953002]">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Mobile Number"
                    error={errors.mobileNumber?.message}
                    required
                  >
                    <Input
                      {...register("mobileNumber")}
                      placeholder="Mobile Number"
                    />
                  </FormField>
                  <FormField
                    label="Email Address"
                    error={errors.emailAddress?.message}
                    required
                  >
                    <Input
                      type="email"
                      {...register("emailAddress")}
                      placeholder="Email Address"
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            {/* Remittance Details */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-base text-[#953002]">
                  Remittance Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Share Account"
                    error={errors.shareAccount?.message}
                  >
                    <Input
                      {...register("shareAccount")}
                      placeholder="Share Account"
                    />
                  </FormField>
                  <FormField
                    label="Special Deposit Account"
                    error={errors.specialDepositAccount?.message}
                  >
                    <Input
                      {...register("specialDepositAccount")}
                      placeholder="Special Deposit Account"
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    label="Fixed Deposit Account"
                    error={errors.fixedDepositAccount?.message}
                  >
                    <Input
                      {...register("fixedDepositAccount")}
                      placeholder="Fixed Deposit Account"
                    />
                  </FormField>
                  <FormField
                    label="Scholarships/ Death Donation / Pension"
                    error={errors.scholarshipDeathDonationPension?.message}
                  >
                    <Input
                      {...register("scholarshipDeathDonationPension")}
                      placeholder="Scholarships/ Death Donation / Pension"
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            {/* Nominee Details */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-base text-[#953002]">
                  Nominee Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Nominee Full Name"
                    error={errors.nomineeFullName?.message}
                    required
                  >
                    <Input
                      {...register("nomineeFullName")}
                      placeholder="Nominee Full Name"
                    />
                  </FormField>
                  <FormField
                    label="Relationship"
                    error={errors.nomineeRelationship?.message}
                    required
                  >
                    <Controller
                      name="nomineeRelationship"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Spouse">Spouse</SelectItem>
                            <SelectItem value="Father">Father</SelectItem>
                            <SelectItem value="Mother">Mother</SelectItem>
                            <SelectItem value="Son">Son</SelectItem>
                            <SelectItem value="Daughter">Daughter</SelectItem>
                            <SelectItem value="Sibling">Sibling</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                </div>

                {/* Row 2 */}
                <div className="space-y-4">
                  <FormField
                    label="Identification Type"
                    error={errors.identificationTypes?.message}
                    required
                  >
                    <IdentificationMultiSelect
                      selected={selectedIdentificationTypes as IdentificationType[]}
                      onChange={(values) => {
                        setValue("identificationTypes", values, {
                          shouldDirty: true,
                          shouldValidate: false,
                        });

                        const nextNumbers = values.reduce<Record<string, string>>(
                          (acc, type) => {
                            acc[type] = String(
                              selectedIdentificationNumbers?.[type] ?? ""
                            );
                            return acc;
                          },
                          {}
                        );

                        setValue("identificationNumbers", nextNumbers, {
                          shouldDirty: true,
                          shouldValidate: false,
                        });
                      }}
                    />
                  </FormField>

                  {selectedIdentificationTypes.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedIdentificationTypes.map((type) => (
                        <FormField
                          key={type}
                          label={`${type} Identification Number`}
                          error={errors.identificationNumbers?.[type]?.message}
                          required
                        >
                          <Input
                            {...register(`identificationNumbers.${type}` as const)}
                            placeholder={`Enter ${type} Identification Number`}
                          />
                        </FormField>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row 3: Address */}
                <FormField
                  label="Nominee Address"
                  error={errors.nomineeAddress?.message}
                >
                  <Input
                    {...register("nomineeAddress")}
                    placeholder="Nominee Address"
                    className="w-full min-h-20"
                  />
                </FormField>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {!readOnly && (
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-300 text-gray-700"
                  onClick={onDone}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#953002] hover:bg-[#7a2700] text-white"
                >
                  {isSubmitting
                    ? isEditMode
                      ? "Updating..."
                      : "Saving..."
                    : isEditMode
                      ? "Update Application"
                      : "Save Application"}
                </Button>
              </div>
            )}
            </div>
          </form>
        )}
      </TabsContent>

      <TabsContent value="documents" className="space-y-4">
        {savedApplicationId && documentSummary ? (
          <div className="space-y-4">
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-base text-[#953002]">
                  Document Upload Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Mandatory Documents
                    </span>
                    <span className="text-sm font-bold text-[#953002]">
                      {documentSummary.uploadedMandatoryDocumentCount} /{" "}
                      {documentSummary.mandatoryDocumentCount}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#953002] h-2 rounded-full transition-all"
                      style={{
                        width: `${(documentSummary.uploadedMandatoryDocumentCount /
                            documentSummary.mandatoryDocumentCount) *
                          100
                          }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Total Documents Uploaded
                    </span>
                    <span className="text-sm font-bold text-gray-600">
                      {documentSummary.totalUploadedDocumentCount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-base text-[#953002]">
                  Upload Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className={readOnly ? "pointer-events-none select-none" : ""}>
                  {(
                    [
                      "NIC_COPY",
                      "APPOINTMENT_LETTER",
                      "PAYSLIP_COPY",
                    ] as DocumentType[]
                  ).map((docType) => {
                    const entry = existingDocumentUrls[docType] ?? null;
                    return (
                      <DocumentUploadCard
                        key={docType}
                        label={docType.replace(/_/g, " ")}
                        isUploading={isUploadingDoc}
                        existingUrl={entry?.url ?? null}
                        existingDocId={entry?.id ?? null}
                        existingFileName={entry?.fileName ?? null}
                        onFileSelected={(file) => handleDocumentUpload(file, docType)}
                        onDelete={() => handleDocumentDelete(docType)}
                      />
                    );
                  })}
                </div>
                {!readOnly && (
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      onClick={onDone}
                      disabled={!hasCompletedMandatoryDocuments}
                      className="bg-[#953002] hover:bg-[#7a2700] text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      Done
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="px-5 py-8 text-center">
              <p className="text-gray-500">
                Please save the application first to upload documents.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
