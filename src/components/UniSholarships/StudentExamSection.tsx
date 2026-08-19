"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { universityScholarshipSchema } from "@/lib/validators/universityscholarship.schema";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import Document, { DocumentFileItem, RequiredDocType } from "./Document";
import { MarkIncompleteModal } from "./Incomplete";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Eye, Check, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/api/authFetch";

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
  zscore: string;
  university: string;
  program: string;
  duration?: string;
  academicYearStart?: string;
  accountNo?: string;
  bank?: string;
  branch?: string;
  hasMinorAccount?: string;
  minorAccountMonths?: string;
  specialDegree?: boolean;
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
  specialDegree?: boolean | null;
  incompleteReason?: string | null;
  decisionReason?: string | null;
  requestDate?: string | null;
  programName?: string | null;
  totalScholarshipAmount?: number | null;
  totalDisbursedAmount?: number | null;
  lastDisbursementDate?: string | null;
  availablePeriod?: number | null;
  totalUniversityScholarships?: number | null;
  fundRequests?: FundRequestRow[] | null;
  followDeviationProcess?: boolean | null;
};

type FundRequestRow = {
  id?: number | string;
  requestId?: string;
  requestedDate?: string;
  requestedPeriod?: string;
  requestedAmount?: number;
  disbursedAmount?: number;
  disbursementDate?: string;
  status?: string;
};

export default function StudentExamSection() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const memberId = searchParams.get("memberId") || "";
  const requestKey = searchParams.get("requestId");
  const mode = searchParams.get("mode");

  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [showExamNoPopup, setShowExamNoPopup] = useState(false);
  const [examNoPopupMessage, setExamNoPopupMessage] = useState("");
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState<"NEW" | "INACTIVE" | "">("");
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Ref mirrors isSubmitting so a double-click in the same tick is rejected before
  // React has re-rendered the disabled button.
  const isSubmittingRef = useRef(false);
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [isExamNoDuplicate, setIsExamNoDuplicate] = useState(false);
  const [isValidatingExamNo, setIsValidatingExamNo] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showScholarshipHistory, setShowScholarshipHistory] = useState(false);
  const [memberScholarships, setMemberScholarships] = useState<ScholarshipRecord[]>([]);
  const [totalUniversityScholarships, setTotalUniversityScholarships] = useState(0);

  const [member, setMember] = useState<any>(null);
  const [scholarshipRequestNo, setScholarshipRequestNo] = useState("");

  const [requestId, setRequestId] = useState<any>(null);
  const [loadedRecord, setLoadedRecord] = useState<ScholarshipRecord | null>(null);
  const [status, setStatus] = useState<
    | "NEW"
    | "INCOMPLETE"
    | "SUBMITTED_FOR_COMMITTEE_APPROVAL"
    | "SUBMITTED_FOR_DEVIATION_BOARD_APPROVAL"
    | "SUBMITTED_FOR_NORMAL_BOARD_APPROVAL"
    | "APPROVED"
    | "REJECTED"
    | "INACTIVE"
  >("NEW");
  const [isSaved, setIsSaved] = useState(false);

  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [documentFiles, setDocumentFiles] = useState<DocumentFileItem[]>([]);
  const [activeTab, setActiveTab] = useState("request");

  const whiteInputClass =
    "bg-white [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:inherit] [&:-webkit-autofill]:[caret-color:inherit]";


  const isSubmitted = status === "SUBMITTED_FOR_COMMITTEE_APPROVAL";
  const isExistingRequest = Boolean(requestKey);
  const isEditableStatus = status === "NEW" || status === "INCOMPLETE";
  const isEditMode = isExistingRequest && mode === "edit" && isEditableStatus;
  const isApprovedDetailsEditMode = isExistingRequest && mode === "approved-edit" && status === "APPROVED";
  const isViewMode = isExistingRequest && !isEditMode && !isApprovedDetailsEditMode;
  const isInputsDisabled = isViewMode || isSubmitted;
  const cannotEdit = !isEditMode && isSaved;
  const incomplete = status === "INCOMPLETE";

  // MMS25 — status changes available from View Mode, keyed by current status.
  // Mirrors the closed table enforced in UniversityScholarshipService; APPROVED and
  // the ADDED_TO_*_LIST states are absent on purpose and so offer nothing.
  const STATUS_CHANGE_TARGETS: Record<string, ("NEW" | "INACTIVE")[]> = {
    NEW: ["INACTIVE"],
    INCOMPLETE: ["NEW", "INACTIVE"],
    SUBMITTED_FOR_COMMITTEE_APPROVAL: ["NEW", "INACTIVE"],
    SUBMITTED_FOR_NORMAL_BOARD_APPROVAL: ["NEW", "INACTIVE"],
    SUBMITTED_FOR_DEVIATION_BOARD_APPROVAL: ["NEW", "INACTIVE"],
    REJECTED: ["NEW", "INACTIVE"],
    INACTIVE: ["NEW"],
  };

  // Returning a request to New needs US_REQUEST_REOPEN and deactivating it needs
  // US_REQUEST_SET_INACTIVE. Both sit with Super Admin, Head Office and Board
  // Secretary, so District Office never sees this control.
  const canReopenToNew = hasPermission(user?.role, "US_REQUEST_REOPEN");
  const canSetInactive = hasPermission(user?.role, "US_REQUEST_SET_INACTIVE");

  const availableStatusTargets = (STATUS_CHANGE_TARGETS[status] || []).filter((target) =>
    target === "NEW" ? canReopenToNew : canSetInactive
  );
  const canChangeStatus = isViewMode && availableStatusTargets.length > 0;
  const canEditApprovedScholarshipDetails = true; // TODO: wire to the user privilege for approved scholarship detail edits.
  const isApprovedDetailFieldDisabled = isApprovedDetailsEditMode ? false : isInputsDisabled || cannotEdit;

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(universityScholarshipSchema) as any,
    mode: "onChange",
    defaultValues: {
      isSchoolApplicant: false,
      hasMinorAccount: "",
      minorAccountMonths: "",
      specialDegree: false,
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
      const res = await authFetch(
        "http://localhost:8080/api/required-document-types/UNIVERSITY_SCHOLARSHIP"
      );
      const data = await res.json();
      setRequiredDocumentTypes(data);
    };

    fetchRequiredDocumentTypes();
  }, []);

  // Load member details 
  useEffect(() => {
    const targetMemberId = memberId || loadedRecord?.memberId;
    if (!targetMemberId) return;

    const fetchMember = async () => {
      try {
        const res = await authFetch(
          `http://localhost:8080/api/members/${targetMemberId}`
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
  }, [memberId, loadedRecord?.memberId]);

  useEffect(() => {
    const targetMemberId = member?.memberId || memberId || loadedRecord?.memberId;
    if (!targetMemberId) {
      setTotalUniversityScholarships(loadedRecord?.totalUniversityScholarships || 0);
      return;
    }

    const fetchMemberScholarships = async () => {
      try {
        const response = await authFetch(
          `http://localhost:8080/api/university-scholarships/member/${encodeURIComponent(targetMemberId)}`
        );

        if (!response.ok) {
          throw new Error("Failed to load member scholarship history");
        }

        const data = await response.json();
        const scholarships = Array.isArray(data) ? data : [];
        setMemberScholarships(scholarships);
        setTotalUniversityScholarships(scholarships.length);
      } catch (error) {
        console.error("Failed to load member scholarship history:", error);
        setTotalUniversityScholarships(loadedRecord?.totalUniversityScholarships || 0);
      }
    };

    fetchMemberScholarships();
  }, [member?.memberId, memberId, loadedRecord?.memberId, loadedRecord?.totalUniversityScholarships]);

  // Load an existing scholarship request for view/edit mode
  useEffect(() => {
    if (!requestKey) {
      setLoadedRecord(null);
      return;
    }

    const fetchRequest = async () => {
      try {
        const res = await authFetch(
          `http://localhost:8080/api/university-scholarships/${encodeURIComponent(requestKey)}`
        );

        if (!res.ok) {
          throw new Error("Failed to load scholarship request");
        }

        const data: ScholarshipRecord = await res.json();
        setLoadedRecord(data);
      } catch (error) {
        console.error("Failed to load scholarship request:", error);
        setLoadedRecord(null);
      }
    };

    fetchRequest();
  }, [requestKey]);

  // Populate form when loadedRecord changes
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
      zscore: loadedRecord.zscore || "",
      university: "",
      program: "",
      duration: loadedRecord.duration || "",
      academicYearStart: loadedRecord.academicYearStartDate || "",
      accountNo: loadedRecord.accountNumber || "",
      bank: "",
      branch: "",
      hasMinorAccount: loadedRecord.hasMinorAccount || "",
      minorAccountMonths: loadedRecord.minorAccountMonths || "",
      specialDegree: Boolean(loadedRecord.specialDegree),
    });

    setRequestId(loadedRecord.requestId || (loadedRecord.id ? String(loadedRecord.id) : null));
    setScholarshipRequestNo(loadedRecord.requestId || "");
    setStatus((loadedRecord.status as any) || "NEW");
    setIsSaved(true);
  }, [loadedRecord, reset]);

  // Load uploaded documents when request is loaded
  useEffect(() => {
    if (!requestId) {
      setUploadedDocuments([]);
      return;
    }

    const fetchUploadedDocuments = async () => {
      try {
        const res = await authFetch(
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

  // Set university, program, bank, branch dropdowns based on loaded record
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

  //set program based on loaded 
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

  // Set bank and branch based on loaded record
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

  // Set branch based on loaded record
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


  // Load universities and banks for dropdowns
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [uniRes, bankRes] = await Promise.all([
          authFetch("http://localhost:8080/api/universities"),
          authFetch("http://localhost:8080/api/banks"),
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
        const res = await authFetch(
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
        const res = await authFetch(
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
        const res = await authFetch(
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

      const response = await authFetch(
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

  // Perform save request data
  const performSave = async (showPopup = true) => {
    const currentData = getValues();

    if (!requestId && !isSaved && !isEditMode) {
      const isExamNoValid = await validateExamNoBeforeSave(currentData.examNo);

      if (!isExamNoValid) {
        return null;
      }
    }

    let saveData: FormData & { memberId: string } = {
      ...currentData,
      memberId: memberId || loadedRecord?.memberId || member?.memberId || "",
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
      let savedRequest: any = null;

      if (requestId) {
        const res = await authFetch(
          `http://localhost:8080/api/university-scholarships/${requestId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(saveData),
          }
        );

        if (!res.ok) {
          const text = await res.text();
          console.error("Update failed:", res.status, text);
          if (showPopup) {
            setExamNoPopupMessage("Failed to update request");
            setShowExamNoPopup(true);
          }
          return null;
        }

        savedRequest = await res.json();
      } else {
        const response = await authFetch(
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
          } catch { }

          if (showPopup) {
            setExamNoPopupMessage(message);
            setShowExamNoPopup(true);
          }
          return null;
        }

        savedRequest = await response.json();
      }

      const newRequestId =
        savedRequest.universityScholarshipRequestID || (savedRequest.id ? String(savedRequest.id) : null);
      setRequestId(newRequestId);
      setScholarshipRequestNo(savedRequest.universityScholarshipRequestID || "");
      setStatus(savedRequest.status || "NEW");
      setIsSaved(true);

      if (documentFiles.length > 0 && savedRequest.universityScholarshipRequestID) {
        await uploadDocuments(savedRequest.universityScholarshipRequestID);
      }

      setIsExamNoDuplicate(false);
      if (showPopup) {
        setExamNoPopupMessage("Request is saved successfully");
        setShowExamNoPopup(true);
      }

      // Reset form default values to clear isDirty state
      reset(currentData);

      if (!requestKey && savedRequest.universityScholarshipRequestID) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("requestId", savedRequest.universityScholarshipRequestID);
        params.set("mode", "edit");
        router.replace(`?${params.toString()}`);
      }

      return savedRequest;
    } catch (error) {
      console.error("Save failed:", error);
      if (showPopup) {
        setExamNoPopupMessage("Failed to save request");
        setShowExamNoPopup(true);
      }
      return null;
    }
  };

  //Handle form submission
  const onSubmit = async () => {
    // Only NEW and INCOMPLETE requests may be submitted. The button is disabled for
    // every other status, but pressing Enter in a field still fires the form submit.
    if (!isEditableStatus) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      let actionId: string | number | null = requestId;

      if (!isInputsDisabled) {
        const saved = await performSave(false);
        if (!saved) {
          setExamNoPopupMessage("Failed to save request before submitting");
          setShowExamNoPopup(true);
          return;
        }
        actionId = saved.universityScholarshipRequestID || (saved.id ? String(saved.id) : null);
      }

      if (!actionId) {
        setExamNoPopupMessage("Please save the request before submitting");
        setShowExamNoPopup(true);
        return;
      }

      setShowSubmitConfirmModal(true);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const executeSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setShowSubmitConfirmModal(false);

    let actionId: string | number | null = requestId;
    if (!actionId && loadedRecord) {
      actionId = loadedRecord.requestId || (loadedRecord.id ? String(loadedRecord.id) : null);
    }

    if (!actionId) {
      setExamNoPopupMessage("Please save the request before submitting");
      setShowExamNoPopup(true);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await authFetch(
        `http://localhost:8080/api/university-scholarships/submit/${actionId}`,
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
      setLoadedRecord((prev) => (prev ? { ...prev, status: submittedRequest.status } : prev));
      setExamNoPopupMessage("Request submitted for committee approval");
      setShowExamNoPopup(true);
    } catch (error) {
      console.error("Submit failed:", error);
      setExamNoPopupMessage("Failed to submit request");
      setShowExamNoPopup(true);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // MMS25 — apply a View Mode status change.
  const executeStatusChange = async () => {
    if (!statusChangeTarget || isChangingStatus) return;

    const actionId = requestId || loadedRecord?.requestId;
    if (!actionId) {
      setExamNoPopupMessage("Request must be saved before its status can be changed");
      setShowExamNoPopup(true);
      return;
    }

    setIsChangingStatus(true);
    try {
      const response = await authFetch(
        `http://localhost:8080/api/university-scholarships/${encodeURIComponent(String(actionId))}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: statusChangeTarget }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let message = "Failed to change status";
        try {
          message = JSON.parse(errorText).message || message;
        } catch { }
        setExamNoPopupMessage(message);
        setShowExamNoPopup(true);
        return;
      }

      const updated = await response.json();
      const nextStatus = updated.status || statusChangeTarget;
      setStatus(nextStatus);
      setLoadedRecord((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      setShowStatusChangeModal(false);
      setStatusChangeTarget("");
      setExamNoPopupMessage(`Status changed to ${formatStatusLabel(nextStatus)}`);
      setShowExamNoPopup(true);
    } catch (error) {
      console.error("Status change failed:", error);
      setExamNoPopupMessage("Failed to change status");
      setShowExamNoPopup(true);
    } finally {
      setIsChangingStatus(false);
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
      const response = await authFetch(
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
    const bcNo = getValues("bcNo");

    if (!bcNo) {
      setExamNoPopupMessage("Please enter Birth Certificate Number first");
      setShowExamNoPopup(true);
      return;
    }

    try {
      const response = await authFetch(
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

  //Update scholarship status
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

  //Handle Approve Scholarship
  const handleApproveScholarship = () => {
    if (!requestId) return;
    setShowApproveConfirmModal(true);
  };

  const executeApproveScholarship = async () => {
    setShowApproveConfirmModal(false);
    if (!requestId) return;

    const deviationFlag = !!loadedRecord && (
      !!(loadedRecord as any).followsDeviationProcess
    );

    const nextStatus = deviationFlag
      ? "SUBMITTED_FOR_DEVIATION_BOARD_APPROVAL"
      : "SUBMITTED_FOR_NORMAL_BOARD_APPROVAL";

    try {

      const res = await authFetch(`http://localhost:8080/api/university-scholarships/committee-approve/${requestId}`, {
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
          ? "Scholarship Approved(Submitted for Deviation Board Approval)"
          : "Scholarship Approved(Submitted for Normal Board Approval)"
      );
      setShowExamNoPopup(true);
    } catch (error) {
      console.error("Approve failed:", error);
      updateScholarshipStatus(nextStatus);
      setExamNoPopupMessage("Approval recorded locally but failed to persist to server");
      setShowExamNoPopup(true);
    }
  };

  //Handle reject request
  const handleRejectScholarship = () => {
    if (!requestId) return;
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmRejectScholarship = () => {
    if (!requestId || rejectReason.trim() === "") return;

    (async () => {
      try {
        const res = await authFetch(`http://localhost:8080/api/university-scholarships/committee-reject/${requestId}`, {
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
        setExamNoPopupMessage("Scholarship Request Rejected Successfully");
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
  const uploadDocuments = async (savedRequestId: string) => {
    const uploadedItems: DocumentFileItem[] = [];

    for (const file of documentFiles) {
      // Look up the numeric ID for this document type
      const reqDoc = requiredDocumentTypes.find(
        (doc) => doc.documentType === file.documentType
      );

      if (!reqDoc) {
        console.error("Required document type ID not found for", file.documentType);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file.file);

      const response = await authFetch(
        `http://localhost:8080/api/uploaded-documents/upload?requestId=${encodeURIComponent(
          savedRequestId
        )}&requiredDocumentId=${encodeURIComponent(reqDoc.id)}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Document upload failed:", response.status, errorText);
        throw new Error("Document upload failed");
      }

      const savedDoc = await response.json();

      uploadedItems.push({
        ...file,
        id: savedDoc.id,
        uploadedAt: savedDoc.uploadedAt,
      });
    }

    setDocumentFiles([]);

    // Refresh the uploaded documents list from backend
    try {
      const res = await authFetch(
        `http://localhost:8080/api/uploaded-documents/by-request?requestId=${encodeURIComponent(
          savedRequestId
        )}`
      );
      if (res.ok) {
        const docs = await res.json();
        setUploadedDocuments(Array.isArray(docs) ? docs : []);
      }
    } catch (e) {
      console.error("Failed to refresh uploaded documents:", e);
    }
  };

  //Handle save 
  const handleSave = async () => {
    await performSave(true);
  };

  // Perform update request
  const updateScholarship = async (id: string | number, data: any) => {
    try {
      const res = await authFetch(`http://localhost:8080/api/university-scholarships/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      return res;
    } catch (err) {
      console.error("Update scholarship failed:", err);
      throw err;
    }
  };

  // Handle marking request as incomplete
  const handleMarkIncomplete = async (reason: string) => {
    let actionId: string | number | null = requestId;

    if (!isInputsDisabled) {
      const saved = await performSave(false);
      if (!saved) {
        setExamNoPopupMessage("Failed to save request before marking incomplete");
        setShowExamNoPopup(true);
        return;
      }
      actionId = saved.universityScholarshipRequestID || (saved.id ? String(saved.id) : null);
    }

    if (!actionId) {
      setExamNoPopupMessage("Please save request first");
      setShowExamNoPopup(true);
      return;
    }

    try {
      const res = await authFetch(
        `http://localhost:8080/api/university-scholarships/incomplete/${actionId}`,
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
      setLoadedRecord((prev) => (prev ? { ...prev, status: updated.status, incompleteReason: reason } : prev));
      setShowIncompleteModal(false);

      setExamNoPopupMessage("Request marked as INCOMPLETE");
      setShowExamNoPopup(true);
    } catch (error) {
      console.error(error);
      setExamNoPopupMessage("Failed to mark incomplete");
      setShowExamNoPopup(true);
    }
  };

  //Get mandatory document in DB
  const mandatoryDocumentTypes = requiredDocumentTypes.filter((doc) => doc.mandatory);

  const hasAllMandatoryDocuments = mandatoryDocumentTypes.every((reqDoc) =>
    documentFiles.some((doc) => doc.documentType === reqDoc.documentType) ||
    uploadedDocuments.some(
      (doc) => doc.requiredDocumentId === reqDoc.id || doc.documentType === reqDoc.documentType
    )
  );

  // Handle deleting an already uploaded document
  const handleDeleteUploadedDocument = async (docId: number) => {
    if (!requestId) return;
    try {
      const res = await authFetch(
        `http://localhost:8080/api/uploaded-documents/${docId}?requestId=${encodeURIComponent(requestId)}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        setExamNoPopupMessage("Failed to delete uploaded document");
        setShowExamNoPopup(true);
        return;
      }

      setUploadedDocuments((prev) => prev.filter((d) => d.id !== docId));
      setExamNoPopupMessage("Document deleted successfully");
      setShowExamNoPopup(true);
    } catch (error) {
      console.error("Delete uploaded document failed:", error);
      setExamNoPopupMessage("Failed to delete uploaded document");
      setShowExamNoPopup(true);
    }
  };

  //Handle edit mode
  const handleEnterEditMode = () => {
    if (!requestKey) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("requestId", requestKey);
    params.set("mode", "edit");
    router.replace(`?${params.toString()}`);
  };

  const handleEnterApprovedDetailsEditMode = () => {
    if (!requestKey) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("requestId", requestKey);
    params.set("mode", "approved-edit");
    router.replace(`?${params.toString()}`);
  };

  const handleUpdateApprovedDetails = async () => {
    if (!requestId || !isApprovedDetailsEditMode) return;

    const currentData = getValues();
    const updateData = {
      academicYearStart: currentData.academicYearStart,
      hasMinorAccount: currentData.hasMinorAccount,
      minorAccountMonths: currentData.minorAccountMonths,
      specialDegree: Boolean(currentData.specialDegree),
      bank: currentData.bank,
      branch: currentData.branch,
      accountNo: currentData.accountNo,
    };

    try {
      const res = await authFetch(
        `http://localhost:8080/api/university-scholarships/${requestId}/approved-details`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        let message = "Failed to update scholarship details";

        try {
          const errorJson = JSON.parse(errorText);
          message = errorJson.message || message;
        } catch { }

        setExamNoPopupMessage(message);
        setShowExamNoPopup(true);
        return;
      }

      const updatedRecord: ScholarshipRecord = await res.json();
      setLoadedRecord(updatedRecord);
      setExamNoPopupMessage("Scholarship details updated successfully");
      setShowExamNoPopup(true);

      const params = new URLSearchParams(searchParams.toString());
      params.set("requestId", String(updatedRecord.requestId || requestId));
      params.delete("mode");
      router.replace(`?${params.toString()}`);
    } catch (error) {
      console.error("Approved details update failed:", error);
      setExamNoPopupMessage("Failed to update scholarship details");
      setShowExamNoPopup(true);
    }
  };

  const statusLabel = status;
  const statusReason =
    status === "INCOMPLETE"
      ? loadedRecord?.incompleteReason || ""
      : status === "REJECTED"
        ? loadedRecord?.decisionReason || ""
        : "";
  const isFollowingDeviation =
    !!(loadedRecord?.followDeviationProcess) &&
    status !== "NEW" &&
    status !== "INCOMPLETE";
  const pageTitle = isApprovedDetailsEditMode
    ? "Edit University Scholarship Details"
    : isExistingRequest
      ? "University Scholarship"
      : "New University Scholarship";
  // MMS26 — only the University Scholarship Committee decides at this gate. Being
  // able to view a submitted request is not the same as being able to clear it.
  const canReviewSubmission =
    isViewMode
    && status === "SUBMITTED_FOR_COMMITTEE_APPROVAL"
    && hasPermission(user?.role, "US_COMMITTEE_APPROVE");
  const isApprovedScholarship = status === "APPROVED";
  const fundRequests = loadedRecord?.fundRequests || [];
  const availableBalance =
    (loadedRecord?.totalScholarshipAmount || 0) - (loadedRecord?.totalDisbursedAmount || 0);
  const canAddFundRequest = isApprovedScholarship && availableBalance > 0;

  const formatCurrency = (amount?: number | null) =>
    typeof amount === "number"
      ? `LKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "LKR 0.00";

  const formatDate = (date?: string | null) =>
    date ? new Date(date).toLocaleDateString() : "-";

  const getStatusColor = (value?: string | null) => {
    if (!value) return "bg-yellow-100 border-yellow-200 text-yellow-500";

    const statusLower = value.toLowerCase().replace(/[\s_]+/g, "");

    if (statusLower === "new") {
      return "bg-blue-100 border-blue-200 text-blue-500";
    } else if (statusLower === "incomplete") {
      return "bg-pink-100 border-pink-200 text-pink-500";
    } else if (statusLower === "approved") {
      return "bg-green-100 border-green-200 text-green-500";
    } else if (statusLower === "rejected") {
      return "bg-red-100 border-red-200 text-red-500";
    } else if (statusLower === "submittedforcommitteeapproval") {
      return "bg-purple-100 border-purple-200 text-purple-500";
    } else if (statusLower === "submittedfornormalboardapproval" || statusLower === "submittedfordeviationboardapproval") {
      return "bg-amber-100 border-amber-200 text-amber-600";
    } else if (statusLower === "addedtonormalboardapprovallist" || statusLower === "addedtodeviationboardapprovallist" || statusLower === "addedtonormalapprovallist") {
      return "bg-emerald-100 border-emerald-200 text-emerald-600";
    } else if (statusLower === "inactive") {
      return "bg-gray-100 border-gray-200 text-gray-500";
    }

    return "bg-yellow-100 border-yellow-200 text-yellow-500";
  };

  const formatStatusLabel = (value?: string | null) => {
    if (!value) return "-";

    const statusUpper = value.toUpperCase().replace(/[\s_]+/g, "");

    switch (statusUpper) {
      case "NEW":
        return "New";
      case "INCOMPLETE":
        return "Incomplete";
      case "SUBMITTEDFORCOMMITTEEAPPROVAL":
        return "Submitted for Committee Approval";
      case "SUBMITTEDFORNORMALBOARDAPPROVAL":
        return "Submitted for Normal Board Approval";
      case "SUBMITTEDFORDEVIATIONBOARDAPPROVAL":
        return "Submitted for Deviation Board Approval";
      case "ADDEDTONORMALBOARDAPPROVALIST":
      case "ADDEDTONORMALBOARDAPPROVALLIST":
      case "ADDEDTONORMALAPPROVALLIST":
        return "Added to Normal Approval List";
      case "ADDEDTODEVIATIONBOARDAPPROVALLIST":
        return "Added to Deviation Board Approval List";
      case "APPROVED":
        return "Approved";
      case "REJECTED":
        return "Rejected";
      case "INACTIVE":
        return "Inactive";
      default:
        return value.replace(/_/g, " ");
    }
  };

  const handleNewFundRequest = () => {
    if (!requestId) return;

    const currentData = getValues();
    const hasAcademicStartDate = Boolean(currentData.academicYearStart || loadedRecord?.academicYearStartDate);
    const hasBankDetails = Boolean(
      (currentData.bank || loadedRecord?.bankName) &&
      (currentData.branch || loadedRecord?.branchName) &&
      (currentData.accountNo || loadedRecord?.accountNumber)
    );

    if (!hasAcademicStartDate || !hasBankDetails) {
      setExamNoPopupMessage(
        "Academic Start Date or the Student Bank Details are not updated. This information are required to be entered before creating a Fund Requests"
      );
      setShowExamNoPopup(true);
      return;
    }

    router.push(
      `/membership/directory/university-scholarship-fundrequest?scholarshipRequestId=${encodeURIComponent(requestId)}`
    );
  };

  const handleOpenFundRequest = (fundRequest: FundRequestRow) => {
    const fundRequestId = fundRequest.requestId || fundRequest.id;
    if (!fundRequestId || !requestId) return;
    router.push(
      `/membership/directory/university-scholarship-fundrequest?scholarshipRequestId=${encodeURIComponent(requestId)}&fundRequestId=${encodeURIComponent(String(fundRequestId))}&mode=view`
    );
  };

  const handleViewMemberScholarships = async () => {
    const targetMemberId = member?.memberId || loadedRecord?.memberId;
    if (!targetMemberId) return;

    if (memberScholarships.length > 0) {
      setShowScholarshipHistory(true);
      return;
    }

    try {
      const response = await authFetch(
        `http://localhost:8080/api/university-scholarships/member/${encodeURIComponent(targetMemberId)}`
      );

      if (!response.ok) {
        throw new Error("Failed to load member scholarship history");
      }

      const data = await response.json();
      setMemberScholarships(Array.isArray(data) ? data : []);
      setShowScholarshipHistory(true);
    } catch (error) {
      console.error("Failed to load member scholarship history:", error);
      setExamNoPopupMessage("Failed to load member scholarship history");
      setShowExamNoPopup(true);
    }
  };

  const handleOpenScholarshipFromHistory = (scholarship: ScholarshipRecord) => {
    const targetRequestId = scholarship.requestId || scholarship.id;
    if (!targetRequestId) return;

    setShowScholarshipHistory(false);
    router.push(
      `/membership/directory/university-scholarship?requestId=${encodeURIComponent(String(targetRequestId))}`
    );
  };

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
              <Button
                type="button"
                variant="outline"
                onClick={handleEnterEditMode}
              >
                Edit
              </Button>
            )}

            {isViewMode && status === "APPROVED" && canEditApprovedScholarshipDetails && (
              <Button
                type="button"
                variant="outline"
                onClick={handleEnterApprovedDetailsEditMode}
              >
                Edit Details
              </Button>
            )}

            {isApprovedDetailsEditMode && (
              <Button
                type="button"
                className="bg-[#953002] text-white hover:bg-[#7a2500]"
                onClick={handleUpdateApprovedDetails}
              >
                Update
              </Button>
            )}

            <Button
              type="button"
              className="bg-[#D4183D] text-white hover:bg-[#a3152f]"
              onClick={() => setShowIncompleteModal(true)}
              disabled={!requestId || !isSaved || isSubmitted || isViewMode || incomplete || isApprovedDetailsEditMode}
            >
              Incomplete
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleSave}
              disabled={isInputsDisabled || (!isSaved && !isValid) || (!isDirty && documentFiles.length === 0 && isSaved) || isApprovedDetailsEditMode}
            >
              Save
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || !requestId || !hasAllMandatoryDocuments || !isEditableStatus}
              className="bg-[#953002] text-white hover:bg-[#7a2500] disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
        <div>
          {isFollowingDeviation && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">Deviation Process</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  This request follows the deviation process. Because The Scholarship Request Date is not within the defined eligibility period from the last exam date.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg px-5 py-5 mt-6">
          <h2 className="text-lg font-bold text-[#953002] mb-4">
            Member Details
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label htmlFor="memberId" className="mb-1 block text-sm text-gray-600">
                Member ID
              </label>
              <Input
                id="memberId"
                value={member?.memberId || ""}
                readOnly
                className={whiteInputClass}
              />
            </div>

            <div>
              <label htmlFor="memberNameWithInitials" className="mb-1 block text-sm text-gray-600">
                Surname with Initials
              </label>
              <Input
                id="memberNameWithInitials"
                value={member?.nameWithInitials || ""}
                readOnly
                className={whiteInputClass}
              />
            </div>

            <div>
              <label htmlFor="memberNic" className="mb-1 block text-sm text-gray-600">
                NIC Number
              </label>
              <Input
                id="memberNic"
                value={member?.nic || ""}
                readOnly
                className={whiteInputClass}
              />
            </div>

            <div>
              <label htmlFor="totalUniversityScholarships" className="mb-1 block text-sm text-gray-600">
                Total University Scholarships
              </label>
              <div className="flex gap-2">
                <Input
                  id="totalUniversityScholarships"
                  value={totalUniversityScholarships}
                  readOnly
                  className={whiteInputClass}
                />
                {totalUniversityScholarships > 0 && (
                  <Button type="button" variant="outline" onClick={handleViewMemberScholarships}>
                    View Details
                  </Button>
                )}
              </div>
            </div>
          </div>

          {isApprovedScholarship && (
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label htmlFor="totalScholarshipAmount" className="mb-1 block text-sm text-gray-600">
                  Total Scholarship Amount
                </label>
                <Input
                  id="totalScholarshipAmount"
                  value={formatCurrency(loadedRecord?.totalScholarshipAmount)}
                  readOnly
                  className={whiteInputClass}
                />
              </div>

              <div>
                <label htmlFor="totalDisbursedAmount" className="mb-1 block text-sm text-gray-600">
                  Total Disbursed Amount
                </label>
                <Input
                  id="totalDisbursedAmount"
                  value={formatCurrency(loadedRecord?.totalDisbursedAmount)}
                  readOnly
                  className={whiteInputClass}
                />
              </div>

              <div>
                <label htmlFor="lastDisbursementDate" className="mb-1 block text-sm text-gray-600">
                  Last Disbursement Date
                </label>
                <Input
                  id="lastDisbursementDate"
                  value={formatDate(loadedRecord?.lastDisbursementDate)}
                  readOnly
                  className={whiteInputClass}
                />
              </div>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full gap-2 rounded-lg border bg-white p-1">
            <TabsTrigger
              value="request"
              className="flex-1 rounded-md px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:bg-[#953002] data-[state=active]:text-white"
            >
              Scholarship Request Details
            </TabsTrigger>
            <TabsTrigger
              value="funds"
              disabled={!isApprovedScholarship}
              className="flex-1 rounded-md px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:bg-[#953002] data-[state=active]:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Fund Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-6">
            <section className="rounded-lg border bg-white p-4">
              <h3 className="mb-4 text-xl font-bold text-[#953002]">
                Student & Exam
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="requestDate" className="mb-1 block text-sm  text-gray-600">
                    Request Date <span className="text-red-500">*</span>
                  </label>
                  <Input id="requestDate" type="date" {...register("requestDate")} disabled={isInputsDisabled || cannotEdit} className={whiteInputClass} />
                  {errors.requestDate && <p className="mt-1 text-sm text-red-500">{errors.requestDate.message}</p>}
                </div>

                <div>
                  <label htmlFor="studentName" className="mb-1 block text-sm  text-gray-600">
                    Student Name <span className="text-red-500">*</span>
                  </label>
                  <Input id="studentName" {...register("studentName")} disabled={isInputsDisabled || cannotEdit} className={whiteInputClass} />
                  {errors.studentName && <p className="mt-1 text-sm text-red-500">{errors.studentName.message}</p>}
                </div>

                <div>
                  <label htmlFor="nic" className="mb-1 block text-sm text-gray-600">
                    Student NIC <span className="text-red-500">*</span>
                  </label>
                  <Input id="nic" {...register("nic")} disabled={isInputsDisabled || cannotEdit} className={whiteInputClass} />
                  {errors.nic && <p className="mt-1 text-sm text-red-500">{errors.nic.message}</p>}
                </div>

                <div>
                  <label htmlFor="bcNo" className="mb-1 block text-sm text-gray-600">
                    Birth Certificate Number <span className="text-red-500">*</span>
                  </label>
                  <Input id="bcNo" {...register("bcNo")} disabled={isInputsDisabled || cannotEdit} className={whiteInputClass} />
                  {errors.bcNo && <p className="mt-1 text-sm text-red-500">{errors.bcNo.message}</p>}
                </div>

                <div>
                  <label htmlFor="address" className="mb-1 block text-sm text-gray-600">
                    Permanent Address <span className="text-red-500">*</span>
                  </label>
                  <Input id="address" {...register("address")} disabled={isInputsDisabled || cannotEdit} className={whiteInputClass} />
                  {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>}
                </div>

                <div>
                  <label htmlFor="mobile" className="mb-1 block text-sm text-gray-600">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <Input id="mobile" {...register("mobile")} disabled={isInputsDisabled || cannotEdit} className={whiteInputClass} />
                  {errors.mobile && <p className="mt-1 text-sm text-red-500">{errors.mobile.message}</p>}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input
                  id="isSchoolApplicant"
                  type="checkbox"
                  {...register("isSchoolApplicant")}
                  disabled={isInputsDisabled || cannotEdit}
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
                  <Input id="examYear" maxLength={4} placeholder="YYYY (1950 - Present)" {...register("examYear")} disabled={isInputsDisabled || cannotEdit} className={whiteInputClass} />
                  {errors.examYear && <p className="mt-1 text-sm text-red-500">{errors.examYear.message}</p>}
                </div>

                <div>
                  <label htmlFor="examNo" className="mb-1 block text-sm  text-gray-600">
                    Examination Number <span className="text-red-500">*</span>
                  </label>
                  <Input id="examNo" {...register("examNo")} disabled={isInputsDisabled || cannotEdit} className={whiteInputClass} />
                  {errors.examNo && <p className="mt-1 text-sm text-red-500">{errors.examNo.message}</p>}
                </div>

                <div>
                  <label htmlFor="zScore" className="mb-1 block text-sm  text-gray-600">
                    Z-Score <span className="text-red-500">*</span>
                  </label>
                  <Input id="zScore" {...register("zscore")} disabled={isInputsDisabled || cannotEdit} className={whiteInputClass} />
                  {errors.zscore && <p className="mt-1 text-sm text-red-500">{errors.zscore.message}</p>}
                </div>

                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className=" text-sm  text-gray-600"
                    onClick={handleValidateExamNo}
                    disabled={isValidatingExamNo || isInputsDisabled || cannotEdit}
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
                    disabled={isInputsDisabled || cannotEdit}
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
                    disabled={!watch("university") || isInputsDisabled || cannotEdit}
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
                  <Input id="duration" {...register("duration")} disabled={isInputsDisabled || cannotEdit} readOnly className={whiteInputClass} />
                </div>

                <div>
                  <label htmlFor="academicYearStart" className="mb-1 block text-sm text-gray-600">
                    Academic Year Start Date
                  </label>
                  <Input id="academicYearStart" type="date" {...register("academicYearStart")} disabled={isApprovedDetailFieldDisabled} className={whiteInputClass} />
                </div>

                <div className="flex items-center gap-2 md:col-span-2">
                  <input
                    id="specialDegree"
                    type="checkbox"
                    {...register("specialDegree")}
                    disabled={isApprovedDetailFieldDisabled}
                    className="h-4 w-4 accent-[#953002]"
                  />
                  <label htmlFor="specialDegree" className="text-sm text-gray-600">
                    Applied for Special Degree
                  </label>
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
                  disabled={isApprovedDetailFieldDisabled}
                >
                  Refresh
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm  text-gray-600">
                    Minor Account Availability
                  </label>
                  <select
                    {...register("hasMinorAccount")}
                    disabled={isApprovedDetailFieldDisabled}
                    className="h-10 w-full rounded-md border px-3 text-sm disabled:bg-gray-100"
                  >
                    <option value="">Select Status</option>
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm  text-gray-600">
                    Remitted Months
                  </label>
                  <Input {...register("minorAccountMonths")} disabled={isApprovedDetailFieldDisabled} className={whiteInputClass} />
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
                  <Input id="accountNo" {...register("accountNo")} disabled={isApprovedDetailFieldDisabled} className={whiteInputClass} />
                  {errors.accountNo && <p className="mt-1 text-sm text-red-500">{errors.accountNo.message}</p>}
                </div>

                <div>
                  <label htmlFor="bank" className="mb-1 block text-sm  text-gray-600">
                    Bank
                  </label>
                  <select
                    id="bank"
                    {...register("bank")}
                    disabled={isApprovedDetailFieldDisabled}
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
                    disabled={!watch("bank") || isApprovedDetailFieldDisabled}
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
                  disabled={isInputsDisabled || isApprovedDetailsEditMode}
                  isSaved={isSaved}
                  isSubmitted={isSubmitted}
                  files={documentFiles}
                  setFiles={setDocumentFiles}
                  documentTypes={requiredDocumentTypes}
                  uploadedDocuments={uploadedDocuments}
                />
              </div>
            </section>

            {uploadedDocuments.length > 0 && (
              <section className="rounded-lg border bg-white p-4">
                <h3 className="mb-4 text-xl font-bold text-[#953002]">
                  Uploaded Documents
                </h3>

                <div className="space-y-3">
                  {uploadedDocuments.map((doc) => {
                    const reqDoc = requiredDocumentTypes.find(
                      (type) =>
                        type.id === doc.requiredDocumentId ||
                        type.documentType === doc.documentType
                    );
                    const docTypeLabel =
                      reqDoc?.displayName || doc.documentType || "Document";
                    const previewUrl =
                      doc.fileUrl ||
                      `http://localhost:8080/api/uploaded-documents/download/${doc.id}?requestId=${encodeURIComponent(
                        doc.requestId || requestId || ""
                      )}`;

                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">
                            {docTypeLabel}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {doc.fileName || "Unnamed file"}
                          </p>
                          {doc.uploadedAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Uploaded: {new Date(doc.uploadedAt).toLocaleString()}
                            </p>
                          )}
                        </div>

                        <div className="ml-3 flex gap-2">
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md bg-[#953002] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#7a2500]"
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
                          {!isInputsDisabled && !isApprovedDetailsEditMode && (
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
          </TabsContent>

          <TabsContent value="funds" className="space-y-6">
            <section className="rounded-lg border bg-white p-4">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#953002]">
                    Fund Requests
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Available Balance: {formatCurrency(availableBalance)}
                  </p>
                </div>

                <Button
                  type="button"
                  className="bg-[#953002] text-white hover:bg-[#7a2500]"
                  onClick={handleNewFundRequest}
                  disabled={!canAddFundRequest}
                >
                  Add New Request
                </Button>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Fund Request ID</th>
                      <th className="px-4 py-3 font-medium">Requested Date</th>
                      <th className="px-4 py-3 font-medium">Requested Period</th>
                      <th className="px-4 py-3 font-medium">Requested Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundRequests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                          No fund requests have been created for this scholarship.
                        </td>
                      </tr>
                    ) : (
                      fundRequests.map((fundRequest) => (
                        <tr key={fundRequest.requestId || fundRequest.id} className="border-t text-gray-600">
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {fundRequest.requestId || fundRequest.id}
                          </td>
                          <td className="px-4 py-3">{formatDate(fundRequest.requestedDate)}</td>
                          <td className="px-4 py-3">{fundRequest.requestedPeriod || "-"}</td>
                          <td className="px-4 py-3">{formatCurrency(fundRequest.requestedAmount)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full border text-[11px] ${getStatusColor(fundRequest.status)}`}>
                              {formatStatusLabel(fundRequest.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleOpenFundRequest(fundRequest)}
                            >
                              Open
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </form>

      <MarkIncompleteModal
        open={showIncompleteModal}
        onClose={() => setShowIncompleteModal(false)}
        onConfirm={handleMarkIncomplete}
      />

      {showExamNoPopup && (() => {
        const msgLower = examNoPopupMessage.toLowerCase();
        const isError =
          msgLower.includes("failed") ||
          msgLower.includes("error") ||
          msgLower.includes("duplicat") ||
          msgLower.includes("please") ||
          isExamNoDuplicate;

        let popupTitle = "Notification";
        if (msgLower.includes("submitted")) popupTitle = "Submitted for Approval";
        else if (msgLower.includes("saved")) popupTitle = "Request Saved";
        else if (msgLower.includes("approved")) popupTitle = "Scholarship Approved";
        else if (msgLower.includes("rejected")) popupTitle = "Scholarship Rejected";
        else if (msgLower.includes("incomplete")) popupTitle = "Marked as Incomplete";
        else if (msgLower.includes("duplicat") || isExamNoDuplicate) popupTitle = "Notification";
        else if (isError) popupTitle = "Notice";

        const currentReqId = scholarshipRequestNo || requestId || loadedRecord?.requestId;

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
                {examNoPopupMessage}
              </p>

              {currentReqId && (
                <div className="mb-6 inline-block rounded-md bg-gray-100 px-3.5 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200/60">
                  Request ID: {currentReqId}
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 mt-2">
                <Button
                  type="button"
                  onClick={() => setShowExamNoPopup(false)}
                  className="w-32 bg-[#953002] text-white hover:bg-[#7a2500] font-semibold py-2 rounded-lg text-sm transition-all shadow-sm mx-auto block"
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
                    name="statusChangeTarget"
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
                className="w-28 bg-[#953002] text-white hover:bg-[#7a2500] font-semibold rounded-lg text-sm shadow-sm disabled:opacity-50"
              >
                {isChangingStatus ? "Saving..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSubmitConfirmModal && (() => {
        const currentReqId = scholarshipRequestNo || requestId || loadedRecord?.requestId;
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
                The scholarship request will be submitted for approval and can no longer be edited.
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
                  className="w-28 bg-[#953002] text-white hover:bg-[#7a2500] font-semibold rounded-lg text-sm shadow-sm disabled:opacity-50"
                  onClick={executeSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {showApproveConfirmModal && (() => {
        const currentReqId = scholarshipRequestNo || requestId || loadedRecord?.requestId;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-center border border-gray-100">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100/80">
                <Check className="h-7 w-7 text-emerald-600 stroke-[2.5]" />
              </div>

              <h3 className="mb-2 text-xl font-bold text-[#953002]">
                Approve Scholarship
              </h3>

              <p className="mb-4 text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                Are you sure you want to approve this scholarship request?
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
                  onClick={executeApproveScholarship}
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
                className="bg-red-100 border-red-200 text-red-500 hover:bg-red-200"
                onClick={handleConfirmRejectScholarship}
                disabled={rejectReason.trim() === ""}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {showScholarshipHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#953002]">
                University Scholarships
              </h3>
              <Button type="button" variant="outline" onClick={() => setShowScholarshipHistory(false)}>
                Close
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Request ID</th>
                    <th className="px-4 py-3 font-medium">Student Name</th>
                    <th className="px-4 py-3 font-medium">University</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {memberScholarships.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        No university scholarships found.
                      </td>
                    </tr>
                  ) : (
                    memberScholarships.map((scholarship) => (
                      <tr key={scholarship.requestId || scholarship.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{scholarship.requestId || "-"}</td>
                        <td className="px-4 py-3">{scholarship.studentName || "-"}</td>
                        <td className="px-4 py-3">{scholarship.universityName || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full border text-[11px] ${getStatusColor(scholarship.status)}`}>
                            {formatStatusLabel(scholarship.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="text-[#953002] transition-colors hover:text-[#c44515]"
                            onClick={() => handleOpenScholarshipFromHistory(scholarship)}
                            aria-label="View scholarship"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
