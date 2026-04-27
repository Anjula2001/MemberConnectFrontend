"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { universityScholarshipSchema } from "@/lib/validators/universityscholarship.schema";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import Document, { DocumentFileItem, RequiredDocType } from "./Document";
import { MarkIncompleteModal } from "./Incomplete";

type FormData = {
  requestDate: string;
  studentName: string;
  nic: string;
  bcNo: string;
  address: string;
  mobile: string;
  isSchoolApplicant?: boolean;
  examYear: string;
  examNo: string;
  zScore: string;
  university: string;
  program: string;
  duration?: string;
  academicYearStart?: string;
  accountNo?: string;
  bank?: string;
  branch?: string;
  hasMinorAccount?: string;
  minorAccountMonths?: string;
};

export default function StudentExamSection() {
  const HARDCODED_MEMBER_ID = 8;

  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [showExamNoPopup, setShowExamNoPopup] = useState(false);
  const [examNoPopupMessage, setExamNoPopupMessage] = useState("");
  const [isExamNoDuplicate, setIsExamNoDuplicate] = useState(false);
  const [isValidatingExamNo, setIsValidatingExamNo] = useState(false);

  const [member, setMember] = useState<any>(null);
  const [scholarshipRequestNo, setScholarshipRequestNo] = useState("");

  const [requestId, setRequestId] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "NEW" | "INCOMPLETE" | "SUBMITTED_FOR_COMMITTEE_APPROVAL"
  >("NEW");
  const [isSaved, setIsSaved] = useState(false);

  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [documentFiles, setDocumentFiles] = useState<DocumentFileItem[]>([]);


  const isSubmitted = status === "SUBMITTED_FOR_COMMITTEE_APPROVAL";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(universityScholarshipSchema) as any,
    mode: "onChange",
    defaultValues: {
      isSchoolApplicant: false,
    },
  });

  const selectedUniversity = watch("university");
  const selectedProgram = watch("program");
  const selectedBank = watch("bank");
  const selectedExamNo = watch("examNo");

  const [requiredDocumentTypes, setRequiredDocumentTypes] = useState<RequiredDocType[]>([]);
  
  // Load required document types 
  useEffect(() => {
    const fetchRequiredDocumentTypes = async () => {
      const res = await fetch(
        "http://localhost:8080/api/required-document-types/UNIVERSITY_SCHOLARSHIP"
      );
      const data = await res.json();
      setRequiredDocumentTypes(data);
    };

    fetchRequiredDocumentTypes();
  }, []);

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
      } catch (error) {
        console.error("Failed to load member:", error);
      }
    };

    fetchMember();
  }, []);
  
  
  /* Load uploaded documents for existing request
  useEffect(() => {
    if (!requestId) return;

    const fetchDocuments = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/documents/request/${requestId}`
        );

        if (!res.ok) {
          throw new Error("Failed to load documents");
        }

        const data = await res.json();
        setUploadedDocuments(data);
      } catch (error: any) {
        console.error("Failed to load documents:", error.message);
      }
    };

    fetchDocuments();
  }, [requestId]);*/


  // Load universities and banks for dropdowns
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [uniRes, bankRes] = await Promise.all([
          fetch("http://localhost:8080/api/universities"),
          fetch("http://localhost:8080/api/banks"),
        ]);

        const uniData = await uniRes.json();
        const bankData = await bankRes.json();

        setUniversities(uniData);
        setBanks(bankData);
      } catch (error: any) {
        console.error("Failed to load universities or banks:", error.message);
        setExamNoPopupMessage(error.message);
        setShowExamNoPopup(true);
      }
    };

    fetchInitialData();
  }, []);

  // Load programs when university changes
  useEffect(() => {
    if (!selectedUniversity) {
      setPrograms([]);
      setValue("program", "");
      setValue("duration", "");
      return;
    }

    const fetchPrograms = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/programs/${selectedUniversity}`
        );
        const data = await res.json();
        setPrograms(data);
        setValue("program", "");
        setValue("duration", "");
      } catch (error: any) {
        console.error("Failed to load programs:", error.message);
      }
    };

    fetchPrograms();
  }, [selectedUniversity, setValue]);
  
  // Load program duration when university or program changes
  useEffect(() => {
    if (!selectedUniversity || !selectedProgram) {
      setValue("duration", "");
      return;
    }

    const fetchDuration = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/duration?universityId=${selectedUniversity}&programId=${selectedProgram}`
        );
        const data = await res.json();
        setValue("duration", String(data));
      } catch (error: any) {
        console.error("Failed to load duration:", error.message);
      }
    };

    fetchDuration();
  }, [selectedUniversity, selectedProgram, setValue]);
  
  // Load branches when bank changes
  useEffect(() => {
    if (!selectedBank) {
      setBranches([]);
      setValue("branch", "");
      return;
    }

    const fetchBranches = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/branches/${selectedBank}`
        );
        const data = await res.json();
        setBranches(data);
        setValue("branch", "");
      } catch (error: any) {
        console.error("Failed to load branches:", error.message);
      }
    };

    fetchBranches();
  }, [selectedBank, setValue]);
  
  
  useEffect(() => {
    setIsExamNoDuplicate(false);
  }, [selectedExamNo]);
  
  // Validate exam number when it changes
  const handleValidateExamNo = async () => {
    if (!selectedExamNo) {
      setExamNoPopupMessage("Please enter Examination Number first");
      setShowExamNoPopup(true);
      return;
    }

    try {
      setIsValidatingExamNo(true);

      const response = await fetch(
        `http://localhost:8080/api/validate-exam-no?ExamNumber=${encodeURIComponent(
          selectedExamNo
        )}`
      );

      if (!response.ok) {
        throw new Error("Failed to validate Examination Number");
      }

      const result = await response.json();

      if (result.duplicate) {
        setIsExamNoDuplicate(true);
        setExamNoPopupMessage(
          "Entered Examination Number is duplicating with another Scholarship Request"
        );
        setShowExamNoPopup(true);
      } else {
        setIsExamNoDuplicate(false);
        setExamNoPopupMessage("Examination Number is valid");
        setShowExamNoPopup(true);
      }
    } catch (error) {
      console.error(error);
      setExamNoPopupMessage("Failed to validate Examination Number");
      setShowExamNoPopup(true);
    } finally {
      setIsValidatingExamNo(false);
    }
  };

  //Handle form submission
  const onSubmit = async () => {
    if (!requestId) {
      setExamNoPopupMessage("Please save the request before submitting");
      setShowExamNoPopup(true);
      return;
    }

    const confirmSubmit = window.confirm(
      "After submitting, this request cannot be edited. Do you want to continue?"
    );

    if (!confirmSubmit) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8080/api/university-scholarships/submit/${requestId}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Submit failed:", response.status, errorText);
        setExamNoPopupMessage("Failed to submit request");
        setShowExamNoPopup(true);
        return;
      }

      const submittedRequest = await response.json();

      setStatus(submittedRequest.status);
      setExamNoPopupMessage("Request submitted for committee approval");
      setShowExamNoPopup(true);
    } catch (error) {
      console.error("Submit failed:", error);
      setExamNoPopupMessage("Failed to submit request");
      setShowExamNoPopup(true);
    }
  };
  
  // Validate exam number before saving
  const validateExamNoBeforeSave = async (examNo: string) => {
    if (!examNo) {
      setIsExamNoDuplicate(false);
      setExamNoPopupMessage("Please enter Examination Number first");
      setShowExamNoPopup(true);
      return false;
    }

    try {
      const response = await fetch(
        `http://localhost:8080/api/validate-exam-no?ExamNumber=${encodeURIComponent(
          examNo
        )}`
      );

      if (!response.ok) {
        console.error("Validate API failed:", response.status, await response.text());
        setIsExamNoDuplicate(false);
        setExamNoPopupMessage("Failed to validate Examination Number");
        setShowExamNoPopup(true);
        return false;
      }

      const result = await response.json();

      if (result.duplicate) {
        setIsExamNoDuplicate(true);
        setExamNoPopupMessage(
          "Entered Examination Number is duplicating with another Scholarship Request"
        );
        setShowExamNoPopup(true);
        return false;
      }

      setIsExamNoDuplicate(false);
      return true;
    } catch (error) {
      console.error("Validate request failed:", error);
      setIsExamNoDuplicate(false);
      setExamNoPopupMessage("Failed to validate Examination Number");
      setShowExamNoPopup(true);
      return false;
    }
  };
 
  // Refresh minor account status and remitted months
  const handleRefreshMinorAccount = async () => {
    const bcNo = watch("bcNo");

    if (!bcNo) {
      setExamNoPopupMessage("Please enter Birth Certificate Number first");
      setShowExamNoPopup(true);
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8080/api/minor-account/check?birthCertificateNumber=${encodeURIComponent(
          bcNo
        )}`
      );

      if (!response.ok) {
        throw new Error("Failed to check minor account");
      }

      const result = await response.json();

      setValue("hasMinorAccount", result.hasMinorAccount);
      setValue("minorAccountMonths", result.remittedMonths);

      return {
        hasMinorAccount: result.hasMinorAccount,
        minorAccountMonths: result.remittedMonths,
      };
    } catch (error) {
      console.error("Failed to refresh minor account:", error);
      setValue("hasMinorAccount", "NO");
      setValue("minorAccountMonths", "No minor account");

      return {
        hasMinorAccount: "NO",
        minorAccountMonths: "No minor account",
      };
    }
  };

  // Upload documents after saving request
  const uploadDocuments = async (savedRequestId: number) => {
    const uploadedItems: DocumentFileItem[] = [];

    for (const file of documentFiles) {
      const formData = new FormData();
      formData.append("file", file.file);
      formData.append("documentType", file.documentType);

      const response = await fetch(
        `http://localhost:8080/api/documents/upload/${savedRequestId}`,
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
  
  //Handle save 
  const handleSave = async () => {
    const currentData = watch();

    const isExamNoValid = await validateExamNoBeforeSave(currentData.examNo);

    if (!isExamNoValid) {
      return;
    }

    let saveData: FormData & { memberId: number } = {
      ...currentData,
      memberId: HARDCODED_MEMBER_ID,
    };

    if (!saveData.hasMinorAccount || saveData.hasMinorAccount === "") {
      const minorData = await handleRefreshMinorAccount();

      saveData = {
        ...saveData,
        hasMinorAccount: minorData?.hasMinorAccount,
        minorAccountMonths: minorData?.minorAccountMonths,
      };
    }

    try {
      const response = await fetch(
        "http://localhost:8080/api/university-scholarships",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(saveData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let message = "Failed to save request";

        try {
          const errorJson = JSON.parse(errorText);
          message = errorJson.message || message;
        } catch {}

        setExamNoPopupMessage(message);
        setShowExamNoPopup(true);
        return;
      }

      const savedRequest = await response.json();

      setRequestId(savedRequest.id);
      setScholarshipRequestNo(savedRequest.universityScholarshipRequestID || "");
      setStatus(savedRequest.status || "NEW");
      setIsSaved(true);

      if (documentFiles.length > 0) {
        await uploadDocuments(savedRequest.id);
      }

      setIsExamNoDuplicate(false);
      setExamNoPopupMessage("Request is saved successfully");
      setShowExamNoPopup(true);
    } catch (error) {
      console.error("Save failed:", error);
      setExamNoPopupMessage("Failed to save request");
      setShowExamNoPopup(true);
    }
  };
  
  // Handle marking request as incomplete
  const handleMarkIncomplete = async (reason: string) => {
    if (!requestId) {
      alert("Please save request first");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:8080/api/university-scholarships/incomplete/${requestId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to mark incomplete");
      }

      const updated = await res.json();

      setStatus(updated.status);
      setShowIncompleteModal(false);

      alert("Request marked as INCOMPLETE");
    } catch (error) {
      console.error(error);
      alert("Failed to mark incomplete");
    }
  };


  const mandatoryDocumentTypes = requiredDocumentTypes
    .filter((doc) => doc.mandatory)
    .map((doc) => doc.documentType);

  const hasAllMandatoryDocuments = mandatoryDocumentTypes.every((type) =>
      documentFiles.some((doc) => doc.documentType === type) ||
      uploadedDocuments.some((doc) => doc.documentType === type)
  );

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#953002]">
              New University Scholarship
              {scholarshipRequestNo && `: ${scholarshipRequestNo}`}
            </h2>

            <p className="text-sm text-gray-600 flex items-center gap-8">
              <span>
                Member: {member?.fullName} ({member?.memberId})
              </span>

              {isSaved && (
                <span className="font-semibold text-blue-600">
                  Status:{" "}
                  <span>
                    {status}
                  </span>
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              className="bg-[#D4183D] text-white hover:bg-[#a3152f]"
              onClick={() => setShowIncompleteModal(true)}
              disabled={isSubmitted || !isSaved || status !== "NEW"}
            >
              Incomplete
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleSave}
              disabled={!isValid || isSubmitted || isSaved}
            >
              Save
            </Button>

            <Button
              type="submit"
              disabled={!isSaved || isSubmitted || !hasAllMandatoryDocuments}
              className="bg-[#953002] text-white hover:bg-[#7a2500] disabled:opacity-50"
            >
              Submit
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              Student & Exam
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="requestDate" className="mb-1 block text-sm font-medium text-gray-700">
                  Request Date <span className="text-red-500">*</span>
                </label>
                <Input id="requestDate" type="date" {...register("requestDate")} disabled={isSubmitted||isSaved} />
                {errors.requestDate && <p className="mt-1 text-sm text-red-500">{errors.requestDate.message}</p>}
              </div>

              <div>
                <label htmlFor="studentName" className="mb-1 block text-sm font-medium text-gray-700">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <Input id="studentName" {...register("studentName")} disabled={isSubmitted||isSaved} />
                {errors.studentName && <p className="mt-1 text-sm text-red-500">{errors.studentName.message}</p>}
              </div>

              <div>
                <label htmlFor="nic" className="mb-1 block text-sm font-medium text-gray-700">
                  Student NIC <span className="text-red-500">*</span>
                </label>
                <Input id="nic" {...register("nic")} disabled={isSubmitted||isSaved} />
                {errors.nic && <p className="mt-1 text-sm text-red-500">{errors.nic.message}</p>}
              </div>

              <div>
                <label htmlFor="bcNo" className="mb-1 block text-sm font-medium text-gray-700">
                  Birth Certificate Number <span className="text-red-500">*</span>
                </label>
                <Input id="bcNo" {...register("bcNo")} disabled={isSubmitted||isSaved} />
                {errors.bcNo && <p className="mt-1 text-sm text-red-500">{errors.bcNo.message}</p>}
              </div>

              <div>
                <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-700">
                  Permanent Address <span className="text-red-500">*</span>
                </label>
                <Input id="address" {...register("address")} disabled={isSubmitted||isSaved} />
                {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>}
              </div>

              <div>
                <label htmlFor="mobile" className="mb-1 block text-sm font-medium text-gray-700">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <Input id="mobile" {...register("mobile")} disabled={isSubmitted||isSaved} />
                {errors.mobile && <p className="mt-1 text-sm text-red-500">{errors.mobile.message}</p>}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                id="isSchoolApplicant"
                type="checkbox"
                {...register("isSchoolApplicant")}
                disabled={isSubmitted||isSaved}
                className="h-4 w-4 accent-[#953002]"
              />
              <label htmlFor="isSchoolApplicant" className="text-sm font-medium text-gray-700">
                A/L Exam as School Applicant
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="examYear" className="mb-1 block text-sm font-medium text-gray-700">
                  Exam Year <span className="text-red-500">*</span>
                </label>
                <Input id="examYear" {...register("examYear")} disabled={isSubmitted||isSaved} />
                {errors.examYear && <p className="mt-1 text-sm text-red-500">{errors.examYear.message}</p>}
              </div>

              <div>
                <label htmlFor="examNo" className="mb-1 block text-sm font-medium text-gray-700">
                  Examination Number <span className="text-red-500">*</span>
                </label>
                <Input id="examNo" {...register("examNo")} disabled={isSubmitted||isSaved} />
                {errors.examNo && <p className="mt-1 text-sm text-red-500">{errors.examNo.message}</p>}
              </div>

              <div>
                <label htmlFor="zScore" className="mb-1 block text-sm font-medium text-gray-700">
                  Z-Score <span className="text-red-500">*</span>
                </label>
                <Input id="zScore" {...register("zScore")} disabled={isSubmitted||isSaved} />
                {errors.zScore && <p className="mt-1 text-sm text-red-500">{errors.zScore.message}</p>}
              </div>

              <div className="flex items-end justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleValidateExamNo}
                  disabled={isValidatingExamNo || isSubmitted||isSaved}
                >
                  {isValidatingExamNo ? "Validating..." : "Validate"}
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              University & Program
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="university" className="mb-1 block text-sm font-medium text-gray-700">
                  University <span className="text-red-500">*</span>
                </label>
                <select
                  id="university"
                  {...register("university")}
                  disabled={isSubmitted||isSaved}
                  className="h-10 w-full rounded-md border px-3 text-sm"
                >
                  <option value="">Select University</option>
                  {universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
                {errors.university && <p className="mt-1 text-sm text-red-500">{errors.university.message}</p>}
              </div>

              <div>
                <label htmlFor="program" className="mb-1 block text-sm font-medium text-gray-700">
                  Program <span className="text-red-500">*</span>
                </label>
                <select
                  id="program"
                  {...register("program")}
                  disabled={!watch("university") || isSubmitted||isSaved}
                  className="h-10 w-full rounded-md border px-3 text-sm disabled:bg-gray-100"
                >
                  <option value="">Select Program</option>
                  {programs.map((item) => (
                    <option key={item.programId} value={item.programId}>
                      {item.programName}
                    </option>
                  ))}
                </select>
                {errors.program && <p className="mt-1 text-sm text-red-500">{errors.program.message}</p>}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="duration" className="mb-1 block text-sm font-medium text-gray-700">
                  Program Duration
                </label>
                <Input id="duration" {...register("duration")} disabled={isSubmitted||isSaved} readOnly />
              </div>

              <div>
                <label htmlFor="academicYearStart" className="mb-1 block text-sm font-medium text-gray-700">
                  Academic Year Start Date
                </label>
                <Input id="academicYearStart" type="date" {...register("academicYearStart")} disabled={isSubmitted||isSaved}/>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="mb-4 text-xl font-bold text-[#953002]">
                Minor Account Status
              </h3>
              <Button
                type="button"
                variant="outline"
                className="bg-gray text-black hover:bg-gray-200"
                onClick={handleRefreshMinorAccount}
                disabled={isSubmitted||isSaved}
              >
                Refresh
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Minor Account Availability
                </label>
                <Input {...register("hasMinorAccount")} readOnly />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Remitted Months
                </label>
                <Input {...register("minorAccountMonths")} readOnly />
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              Bank Details
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="accountNo" className="mb-1 block text-sm font-medium text-gray-700">
                  Bank Account Number
                </label>
                <Input id="accountNo" {...register("accountNo")} disabled={isSubmitted||isSaved} />
                {errors.accountNo && <p className="mt-1 text-sm text-red-500">{errors.accountNo.message}</p>}
              </div>

              <div>
                <label htmlFor="bank" className="mb-1 block text-sm font-medium text-gray-700">
                  Bank
                </label>
                <select
                  id="bank"
                  {...register("bank")}
                  disabled={isSubmitted||isSaved}
                  className="h-10 w-full rounded-md border px-3 text-sm"
                >
                  <option value="">Select Bank</option>
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="branch" className="mb-1 block text-sm font-medium text-gray-700">
                  Bank Branch
                </label>
                <select
                  id="branch"
                  {...register("branch")}
                  disabled={!watch("bank") || isSubmitted||isSaved}
                  className="h-10 w-full rounded-md border px-3 text-sm disabled:bg-gray-100"
                >
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              Supporting Documents
            </h3>

            <div className="rounded-lg border border-dashed p-6 text-left text-sm text-gray-500">
              <Document
                requestId={requestId}
                disabled={isSubmitted}
                isSaved={isSaved}
                files={documentFiles}
                setFiles={setDocumentFiles}
                documentTypes={requiredDocumentTypes}
              />
            </div>
          </section>

          <div className="space-y-2">
            {uploadedDocuments.map((doc) => (
              <div key={doc.id} className="rounded border p-2 text-sm">
                <p className="font-medium">{doc.documentType}</p>
                <p>{doc.fileName}</p>
              </div>
            ))}
          </div>
        </div>
      </form>

      <MarkIncompleteModal
        open={showIncompleteModal}
        onClose={() => setShowIncompleteModal(false)}
        onConfirm={handleMarkIncomplete}
      />

      {showExamNoPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold text-[#953002]">
              Validation
            </h3>

            <p className="mb-5 text-sm text-black">
              {examNoPopupMessage}
            </p>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => setShowExamNoPopup(false)}
                className="bg-[#953002] text-white hover:bg-[#7a2500]"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}