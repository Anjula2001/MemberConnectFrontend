"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { universityScholarshipSchema } from "@/lib/validators/universityscholarship.schema";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import Document, { DocumentFileItem, RequiredDocType } from "./Document";
import { MarkIncompleteModal } from "./Incomplete";
import { useRouter, useSearchParams } from "next/navigation";

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

type ScholarshipRecord = {
  id: number;
  memberId?: string | null;
  requestId?: string | null;
  studentName?: string | null;
  memberName?: string | null;
  universityName?: string | null;
  status?: string | null;
  nic?: string | null;
  birthCertificateNumber?: string | null;
  address?: string | null;
  mobile?: string | null;
  applicantType?: string | null;
  examYear?: string | null;
  examNumber?: string | null;
  zscore?: string | null;
  duration?: string | null;
  academicYearStartDate?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  hasMinorAccount?: string | null;
  minorAccountMonths?: string | null;
  incompleteReason?: string | null;
  decisionReason?: string | null;
  requestDate?: string | null;
  programName?: string | null;
};

export default function StudentExamSection() {
  const HARDCODED_MEMBER_ID = 8;
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestKey = searchParams.get("requestId") || searchParams.get("id");
  const mode = searchParams.get("mode") || "view";

  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [showExamNoPopup, setShowExamNoPopup] = useState(false);
  const [examNoPopupMessage, setExamNoPopupMessage] = useState("");
  const [isExamNoDuplicate, setIsExamNoDuplicate] = useState(false);
  const [isValidatingExamNo, setIsValidatingExamNo] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [member, setMember] = useState<any>(null);
  const [scholarshipRequestNo, setScholarshipRequestNo] = useState("");

  const [requestId, setRequestId] = useState<number | null>(null);
  const [loadedRecord, setLoadedRecord] = useState<ScholarshipRecord | null>(null);
  const [status, setStatus] = useState<
    | "NEW"
    | "INCOMPLETE"
    | "SUBMITTED_FOR_COMMITTEE_APPROVAL"
    | "SUBMITTED_FOR_DEVIATION_BOARD_APPROVAL"
    | "SUBMITTED_FOR_NORMAL_BOARD_APPROVAL"
    | "APPROVED"
    | "REJECTED"
  >("NEW");
  const [isSaved, setIsSaved] = useState(false);

  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [documentFiles, setDocumentFiles] = useState<DocumentFileItem[]>([]);
  const whiteInputClass =
    "bg-white [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:inherit] [&:-webkit-autofill]:[caret-color:inherit]";


  const isSubmitted = status === "SUBMITTED_FOR_COMMITTEE_APPROVAL";
  const isExistingRequest = Boolean(requestKey);
  const isEditableStatus = status === "NEW" || status === "INCOMPLETE";
  const isEditMode = isExistingRequest && mode === "edit" && isEditableStatus;
  const isViewMode = isExistingRequest && !isEditMode;
  const isInputsDisabled = isViewMode || isSubmitted;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
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

  // Load an existing scholarship request for view/edit mode
  useEffect(() => {
    if (!requestKey) {
      setLoadedRecord(null);
      return;
    }

    const fetchRequest = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/university-scholarships");

        if (!res.ok) {
          throw new Error("Failed to load scholarship request");
        }

        const data: ScholarshipRecord[] = await res.json();
        const found = data.find((item) => {
          const idMatches = String(item.id) === requestKey;
          const requestMatches = item.requestId === requestKey;

          return idMatches || requestMatches;
        });

        if (!found) {
          throw new Error("Scholarship request not found");
        }

        setLoadedRecord(found);
      } catch (error) {
        console.error("Failed to load scholarship request:", error);
        setLoadedRecord(null);
      }
    };

    fetchRequest();
  }, [requestKey]);

  useEffect(() => {
    if (!loadedRecord) return;

    reset({
      requestDate: loadedRecord.requestDate || "",
      studentName: loadedRecord.studentName || "",
      nic: loadedRecord.nic || "",
      bcNo: loadedRecord.birthCertificateNumber || "",
      address: loadedRecord.address || "",
      mobile: loadedRecord.mobile || "",
      isSchoolApplicant: loadedRecord.applicantType === "SCHOOL_APPICANT",
      examYear: loadedRecord.examYear || "",
      examNo: loadedRecord.examNumber || "",
      zScore: loadedRecord.zscore || "",
      university: "",
      program: "",
      duration: loadedRecord.duration || "",
      academicYearStart: loadedRecord.academicYearStartDate || "",
      accountNo: loadedRecord.accountNumber || "",
      bank: "",
      branch: "",
      hasMinorAccount: loadedRecord.hasMinorAccount || "",
      minorAccountMonths: loadedRecord.minorAccountMonths || "",
    });

    setRequestId(loadedRecord.id);
    setScholarshipRequestNo(loadedRecord.requestId || "");
    setStatus((loadedRecord.status as any) || "NEW");
    setIsSaved(true);
  }, [loadedRecord, reset]);

  useEffect(() => {
    if (!loadedRecord || universities.length === 0) return;

    const university = universities.find(
      (item) =>
        item.name?.toString().trim().toLowerCase() ===
        loadedRecord.universityName?.toString().trim().toLowerCase()
    );

    if (university) {
      setValue("university", String(university.id));
    }
  }, [loadedRecord, universities, setValue]);

  useEffect(() => {
    if (!loadedRecord || programs.length === 0) return;

    const program = programs.find(
      (item) =>
        item.programName?.toString().trim().toLowerCase() ===
        loadedRecord.programName?.toString().trim().toLowerCase()
    );

    if (program) {
      setValue("program", String(program.programId));
    }
  }, [loadedRecord, programs, setValue]);

  useEffect(() => {
    if (!loadedRecord || banks.length === 0) return;

    const bank = banks.find(
      (item) =>
        item.name?.toString().trim().toLowerCase() ===
        loadedRecord.bankName?.toString().trim().toLowerCase()
    );

    if (bank) {
      setValue("bank", String(bank.id));
    }
  }, [loadedRecord, banks, setValue]);

  useEffect(() => {
    if (!loadedRecord || branches.length === 0) return;

    const branch = branches.find(
      (item) =>
        item.name?.toString().trim().toLowerCase() ===
        loadedRecord.branchName?.toString().trim().toLowerCase()
    );

    if (branch) {
      setValue("branch", String(branch.id));
    }
  }, [loadedRecord, branches, setValue]);

  useEffect(() => {
    if (!loadedRecord?.id) return;

    const fetchDocuments = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/documents/request/${loadedRecord.id}`
        );

        if (!res.ok) {
          throw new Error("Failed to load documents");
        }

        const data = await res.json();
        setUploadedDocuments(data);
      } catch (error) {
        console.error("Failed to load documents:", error);
        setUploadedDocuments([]);
      }
    };

    fetchDocuments();
  }, [loadedRecord?.id]);
  
  
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

  const updateScholarshipStatus = (
    nextStatus: typeof status,
    reason?: string
  ) => {
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

  const handleApproveScholarship = async () => {
    if (!requestId) return;

    const confirmApprove = window.confirm(
      "Approve this scholarship request?"
    );

    if (!confirmApprove) return;

    // TODO: replace this placeholder with the actual deviation-check flag
    // The real flag may be part of `loadedRecord` or the form values.
    const deviationFlag = !!loadedRecord && (
      !!(loadedRecord as any).followsDeviationProcess ||
      !!(loadedRecord as any).isDeviation ||
      !!(loadedRecord as any).followDeviation
    );

    const nextStatus = deviationFlag
      ? "SUBMITTED_FOR_DEVIATION_BOARD_APPROVAL"
      : "SUBMITTED_FOR_NORMAL_BOARD_APPROVAL";

    try {
      // Use the existing save/update endpoint to persist the status.
      // The backend's POST /api/university-scholarships is used for create/update.
      const res = await fetch(`http://localhost:8080/api/university-scholarships/approve/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, status: nextStatus }),
      });

      if (!res.ok) {
        updateScholarshipStatus(nextStatus);
        setExamNoPopupMessage("Approval recorded locally but failed to persist to server");
        setShowExamNoPopup(true);
        console.error("Approve (save) API failed:", res.status, await res.text());
        return;
      }

      const updated = await res.json();
      const serverStatus = (updated && updated.status) || nextStatus;
      updateScholarshipStatus(serverStatus as any);
      setExamNoPopupMessage(
        deviationFlag
          ? "Scholarship approved — submitted for deviation board approval"
          : "Scholarship approved — submitted for normal board approval"
      );
      setShowExamNoPopup(true);
    } catch (error) {
      console.error("Approve failed:", error);
      updateScholarshipStatus(nextStatus);
      setExamNoPopupMessage("Approval recorded locally but failed to persist to server");
      setShowExamNoPopup(true);
    }
  };

  const handleRejectScholarship = () => {
    if (!requestId) return;
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmRejectScholarship = () => {
    if (!requestId || rejectReason.trim() === "") return;

    (async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/university-scholarships/reject/${requestId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decisionReason: rejectReason.trim() }),
        });

        if (!res.ok) {
          updateScholarshipStatus("REJECTED", rejectReason.trim());
          setShowRejectModal(false);
          setExamNoPopupMessage("Rejection recorded locally but failed to persist to server");
          setShowExamNoPopup(true);
          console.error("Reject (save) API failed:", res.status, await res.text());
          return;
        }

        const updated = await res.json();
        const serverStatus = (updated && updated.status) || "REJECTED";
        updateScholarshipStatus(serverStatus as any, rejectReason.trim());
        setShowRejectModal(false);
        setExamNoPopupMessage("Scholarship rejected successfully");
        setShowExamNoPopup(true);
      } catch (error) {
        console.error("Reject failed:", error);
        updateScholarshipStatus("REJECTED", rejectReason.trim());
        setShowRejectModal(false);
        setExamNoPopupMessage("Rejection recorded locally but failed to persist to server");
        setShowExamNoPopup(true);
      }
    })();
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

  const handleEnterEditMode = () => {
    if (!requestKey) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("requestId", requestKey);
    params.set("mode", "edit");
    router.replace(`?${params.toString()}`);
  };

  const statusLabel = status;
  const statusReason =
    status === "INCOMPLETE"
      ? loadedRecord?.incompleteReason || ""
      : status === "REJECTED"
        ? loadedRecord?.decisionReason || ""
        : "";
  const pageTitle = isExistingRequest ? "University Scholarship" : "New University Scholarship";
  const canReviewSubmission = isViewMode && status === "SUBMITTED_FOR_COMMITTEE_APPROVAL";

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#953002]">
              {pageTitle}
              {scholarshipRequestNo && `: ${scholarshipRequestNo}`}
            </h2>

            <p className="mt-2 text-sm text-gray-600 flex items-center gap-8">
              <span>
                Member: {member?.fullName} ({member?.memberId})
              </span>

              {(isSaved || isExistingRequest) && (
                <span className="font-semibold text-blue-600">
                  Status:{" "}
                  <span>
                    {statusLabel}
                  </span>
                  {statusReason && (
                    <span className="ml-2 text-red-600 font-normal">
                      ({statusReason})
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            {isViewMode && isEditableStatus && (
              <Button
                type="button"
                variant="outline"
                onClick={handleEnterEditMode}
              >
                Edit
              </Button>
            )}

            <Button
              type="button"
              className="bg-[#D4183D] text-white hover:bg-[#a3152f]"
              onClick={() => setShowIncompleteModal(true)}
              disabled={isInputsDisabled || !requestId || !isSaved}
            >
              Incomplete
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleSave}
              disabled={isInputsDisabled || !isValid}
            >
              Save
            </Button>

            <Button
              type="submit"
              disabled={isInputsDisabled || !requestId || !hasAllMandatoryDocuments}
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
                <label htmlFor="requestDate" className="mb-1 block text-sm  text-gray-600">
                  Request Date <span className="text-red-500">*</span>
                </label>
                <Input id="requestDate" type="date" {...register("requestDate")} disabled={isInputsDisabled} className={whiteInputClass} />
                {errors.requestDate && <p className="mt-1 text-sm text-red-500">{errors.requestDate.message}</p>}
              </div>

              <div>
                <label htmlFor="studentName" className="mb-1 block text-sm  text-gray-600">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <Input id="studentName" {...register("studentName")} disabled={isInputsDisabled} className={whiteInputClass} />
                {errors.studentName && <p className="mt-1 text-sm text-red-500">{errors.studentName.message}</p>}
              </div>

              <div>
                <label htmlFor="nic" className="mb-1 block text-sm text-gray-600">
                  Student NIC <span className="text-red-500">*</span>
                </label>
                <Input id="nic" {...register("nic")} disabled={isInputsDisabled} className={whiteInputClass} />
                {errors.nic && <p className="mt-1 text-sm text-red-500">{errors.nic.message}</p>}
              </div>

              <div>
                <label htmlFor="bcNo" className="mb-1 block text-sm text-gray-600">
                  Birth Certificate Number <span className="text-red-500">*</span>
                </label>
                <Input id="bcNo" {...register("bcNo")} disabled={isInputsDisabled} className={whiteInputClass} />
                {errors.bcNo && <p className="mt-1 text-sm text-red-500">{errors.bcNo.message}</p>}
              </div>

              <div>
                <label htmlFor="address" className="mb-1 block text-sm text-gray-600">
                  Permanent Address <span className="text-red-500">*</span>
                </label>
                <Input id="address" {...register("address")} disabled={isInputsDisabled} className={whiteInputClass} />
                {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>}
              </div>

              <div>
                <label htmlFor="mobile" className="mb-1 block text-sm text-gray-600">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <Input id="mobile" {...register("mobile")} disabled={isInputsDisabled} className={whiteInputClass} />
                {errors.mobile && <p className="mt-1 text-sm text-red-500">{errors.mobile.message}</p>}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                id="isSchoolApplicant"
                type="checkbox"
                {...register("isSchoolApplicant")}
                disabled={isInputsDisabled}
                className="h-4 w-4 accent-[#953002]"
              />
              <label htmlFor="isSchoolApplicant" className="text-sm text-gray-600">
                A/L Exam as School Applicant
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="examYear" className="mb-1 block text-sm  text-gray-600">
                  Exam Year <span className="text-red-500">*</span>
                </label>
                <Input id="examYear" {...register("examYear")} disabled={isInputsDisabled} className={whiteInputClass} />
                {errors.examYear && <p className="mt-1 text-sm text-red-500">{errors.examYear.message}</p>}
              </div>

              <div>
                <label htmlFor="examNo" className="mb-1 block text-sm  text-gray-600">
                  Examination Number <span className="text-red-500">*</span>
                </label>
                <Input id="examNo" {...register("examNo")} disabled={isInputsDisabled} className={whiteInputClass} />
                {errors.examNo && <p className="mt-1 text-sm text-red-500">{errors.examNo.message}</p>}
              </div>

              <div>
                <label htmlFor="zScore" className="mb-1 block text-sm  text-gray-600">
                  Z-Score <span className="text-red-500">*</span>
                </label>
                <Input id="zScore" {...register("zScore")} disabled={isInputsDisabled} className={whiteInputClass} />
                {errors.zScore && <p className="mt-1 text-sm text-red-500">{errors.zScore.message}</p>}
              </div>

              <div className="flex items-end justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className=" text-sm  text-gray-600"
                  onClick={handleValidateExamNo}
                  disabled={isValidatingExamNo || isInputsDisabled}
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
                <label htmlFor="university" className="mb-1 block text-sm text-gray-600">
                  University <span className="text-red-500">*</span>
                </label>
                <select
                  id="university"
                  {...register("university")}
                  disabled={isInputsDisabled}
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
                <label htmlFor="program" className="mb-1 block text-sm  text-gray-600">
                  Program <span className="text-red-500">*</span>
                </label>
                <select
                  id="program"
                  {...register("program")}
                  disabled={!watch("university") || isInputsDisabled}
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
                <label htmlFor="duration" className="mb-1 block text-sm text-gray-600">
                  Program Duration
                </label>
                <Input id="duration" {...register("duration")} disabled={isInputsDisabled} readOnly className={whiteInputClass} />
              </div>

              <div>
                <label htmlFor="academicYearStart" className="mb-1 block text-sm text-gray-600">
                  Academic Year Start Date
                </label>
                <Input id="academicYearStart" type="date" {...register("academicYearStart")} disabled={isInputsDisabled} className={whiteInputClass}/>
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
                className=" text-sm  text-gray-600"
                onClick={handleRefreshMinorAccount}
                disabled={isInputsDisabled}
              >
                Refresh
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm  text-gray-600">
                  Minor Account Availability
                </label>
                <Input {...register("hasMinorAccount")} readOnly disabled={isInputsDisabled} className={whiteInputClass} />
              </div>

              <div>
                <label className="mb-1 block text-sm  text-gray-600">
                  Remitted Months
                </label>
                <Input {...register("minorAccountMonths")} readOnly disabled={isInputsDisabled} className={whiteInputClass} />
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              Bank Details
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="accountNo" className="mb-1 block text-sm  text-gray-600">
                  Bank Account Number
                </label>
                <Input id="accountNo" {...register("accountNo")} disabled={isInputsDisabled} className={whiteInputClass} />
                {errors.accountNo && <p className="mt-1 text-sm text-red-500">{errors.accountNo.message}</p>}
              </div>

              <div>
                <label htmlFor="bank" className="mb-1 block text-sm  text-gray-600">
                  Bank
                </label>
                <select
                  id="bank"
                  {...register("bank")}
                  disabled={isInputsDisabled}
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
                <label htmlFor="branch" className="mb-1 block text-sm  text-gray-600">
                  Bank Branch
                </label>
                <select
                  id="branch"
                  {...register("branch")}
                  disabled={!watch("bank") || isInputsDisabled}
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
                disabled={isInputsDisabled}
                isSaved={isSaved}
                isSubmitted={isSubmitted}
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

          {canReviewSubmission && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                className="bg-green-100 border-green-200 text-green-500 hover:bg-green-200"
                onClick={handleApproveScholarship}
              >
                Approve
              </Button>

              <Button
                type="button"
                className="bg-red-100 border-red-200 text-red-500 hover:bg-red-200"
                onClick={handleRejectScholarship}
              >
                Reject
              </Button>
            </div>
          )}
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
              POPUP MESSAGE
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

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-[#953002]">
              Reject Scholarship
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Enter the reason for rejection.
            </p>

            <div className="mt-4">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
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
                className="bg-rose-600 text-white hover:bg-rose-700"
                onClick={handleConfirmRejectScholarship}
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