"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "../ui/button";
import { Input } from "../ui/input";

import Document, { DocumentFileItem, RequiredDocType } from "./Document";
import { MarkIncompleteModal } from "./Incomplete";

import { fundRequestSchema } from "@/lib/validators/fundrequestvalidation.schema";

type FundRequestSchema = ReturnType<typeof fundRequestSchema>;
type FundRequestFormInput = z.input<FundRequestSchema>;
type FundRequestFormOutput = z.output<FundRequestSchema>;

type ScholarshipFundRequest = {
  id?: number | string;
  requestId?: string;
  requestedDate?: string;
  requestedPeriod?: string;
  requestedAmount?: number;
  disbursedAmount?: number;
  disbursementDate?: string;
  status?: FundRequestStatus;
  incompleteReason?: string;
  decisionReason?: string;
};

type ScholarshipSummary = {
  memberId?: string;
  requestId?: string;
  studentName?: string;
  nic?: string;
  birthCertificateNumber?: string;
  universityName?: string;
  programName?: string;
  duration?: string;
  examYear?: string;
  examNumber?: string;
  zScore?: string;
  academicYearStartDate?: string;
  totalScholarshipAmount?: number;
  totalDisbursedAmount?: number;
  lastDisbursementDate?: string;
  availablePeriod?: number;
  totalUniversityScholarships?: number;
  fundRequests?: ScholarshipFundRequest[];
};

type FundRequestStatus =
  | "NEW"
  | "INCOMPLETE"
  | "SUBMITTED_FOR_COMMITTEE_APPROVAL"
  | "REJECTED"
  | "APPROVED"
  | "INACTIVE";

type MemberSummary = {
  memberId?: string;
  nameWithInitials?: string;
  nic?: string;
  membershipStartDate?: string;
};

export default function FundDisbursementRequest() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scholarshipRequestId = searchParams.get("scholarshipRequestId") || "";
  const fundRequestId = searchParams.get("fundRequestId") || "";
  const mode = searchParams.get("mode");
  const [requestId, setRequestId] = useState<number | null>(null);
  const [fundRequestNo, setFundRequestNo] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [status, setStatus] = useState<FundRequestStatus>("NEW");
  const isViewMode = Boolean(fundRequestId) && mode !== "edit";
  const isEditableStatus = status === "NEW" || status === "INCOMPLETE";
  const isSubmittedForApproval = status === "SUBMITTED_FOR_COMMITTEE_APPROVAL";
  const canEditRequest = !isViewMode && isEditableStatus;
  const canChangeSubmittedFundRequestStatus = true; // TODO: replace with logged-in user's status-change right.
  const canReviewSubmittedFundRequest =
    isViewMode && isSubmittedForApproval && canChangeSubmittedFundRequestStatus;

  const [isSaved, setIsSaved] = useState(false);

  const [documentFiles, setDocumentFiles] = useState<DocumentFileItem[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [requiredDocumentTypes, setRequiredDocumentTypes] = useState<RequiredDocType[]>([]);
  const [scholarshipSummary, setScholarshipSummary] = useState<ScholarshipSummary | null>(null);
  const [member, setMember] = useState<MemberSummary | null>(null);
  const [currentFundRequest, setCurrentFundRequest] = useState<ScholarshipFundRequest | null>(null);

  const availableBalance = Math.max(
    0,
    Number(scholarshipSummary?.totalScholarshipAmount || 0) -
    Number(scholarshipSummary?.totalDisbursedAmount || 0)
  );
  const availablePeriod = (scholarshipSummary?.availablePeriod || 0) + (currentFundRequest ? 1 : 0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
    reset,
  } = useForm<FundRequestFormInput, unknown, FundRequestFormOutput>({
    resolver: zodResolver(fundRequestSchema(availableBalance, availablePeriod)),
    mode: "onChange",
  });

  const formatDateForApi = (date: Date) => date.toISOString().slice(0, 10);
  const formatCurrency = (amount?: number | null) =>
    typeof amount === "number"
      ? `LKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "LKR 0.00";
  const formatDate = (date?: string | null) =>
    date ? new Date(date).toLocaleDateString() : "-";
  const formatStatusLabel = (value?: string | null) => {
    if (!value) return "New";

    const statusUpper = value.toUpperCase().replace(/[\s_]+/g, "");

    switch (statusUpper) {
      case "NEW":
        return "New";
      case "INCOMPLETE":
        return "Incomplete";
      case "SUBMITTEDFORCOMMITTEEAPPROVAL":
        return "Submitted for Approval";
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

  const statusLabel = formatStatusLabel(status);
  const statusReason =
    status === "INCOMPLETE"
      ? currentFundRequest?.incompleteReason || ""
      : status === "REJECTED"
        ? currentFundRequest?.decisionReason || ""
        : "";
  const calculateMembershipAge = (membershipStartDate?: string) => {
    if (!membershipStartDate) return "-";

    const startDate = new Date(membershipStartDate);
    const today = new Date();
    let years = today.getFullYear() - startDate.getFullYear();
    const monthDifference = today.getMonth() - startDate.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < startDate.getDate())) {
      years -= 1;
    }

    return `${Math.max(0, years)} year(s)`;
  };

  // Upload pending document files to the backend for a given fund request ID
  const uploadDocuments = async (savedFundRequestId: string) => {
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

      const uploadRes = await fetch(
        `http://localhost:8080/api/uploaded-documents/upload?requestId=${encodeURIComponent(
          savedFundRequestId
        )}&requiredDocumentId=${encodeURIComponent(reqDoc.id)}`,
        { method: "POST", body: formData }
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

    setDocumentFiles(uploadedItems);

    // Refresh the uploaded documents list from backend
    try {
      const docsRes = await fetch(
        `http://localhost:8080/api/uploaded-documents/by-request?requestId=${encodeURIComponent(savedFundRequestId)}`
      );
      if (docsRes.ok) {
        const docs = await docsRes.json();
        setUploadedDocuments(Array.isArray(docs) ? docs : []);
      }
    } catch (e) {
      console.error("Failed to refresh uploaded documents:", e);
    }
  };

  const handleSaveFundRequest = async (data: FundRequestFormOutput) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/university-scholarships/${encodeURIComponent(scholarshipRequestId)}/fund-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: requestId,
            requestId: fundRequestNo || fundRequestId || undefined,
            requestedDate: formatDateForApi(data.requestDate),
            requestedPeriod: data.requestedPeriod,
            requestedAmount: Number(data.amount),
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let message = "Failed to save fund request";

        try {
          const errorJson = JSON.parse(errorText);
          message = errorJson.message || message;
        } catch { }

        setPopupMessage(message);
        setShowPopup(true);
        return;
      }

      const savedRequest: ScholarshipFundRequest = await response.json();
      const savedFundRequestId = savedRequest.requestId || "";

      setRequestId(savedRequest.id ? Number(savedRequest.id) : null);
      setFundRequestNo(savedFundRequestId);
      setStatus(savedRequest.status || "NEW");
      setCurrentFundRequest(savedRequest);
      setIsSaved(true);

      // Upload any queued documents now that we have the fund request ID
      if (documentFiles.length > 0 && savedFundRequestId) {
        await uploadDocuments(savedFundRequestId);
      }

      setPopupMessage("Fund Request is saved successfully");
      setShowPopup(true);

      if (!fundRequestId && savedFundRequestId) {
        router.replace(
          `/membership/directory/university-scholarship-fundrequest?scholarshipRequestId=${encodeURIComponent(scholarshipRequestId)}&fundRequestId=${encodeURIComponent(savedFundRequestId)}`
        );
      }
    } catch (error) {
      console.error("Failed to save fund request:", error);
      setPopupMessage("Failed to save fund request");
      setShowPopup(true);
    }
  };

  // Fetch required document types for FUND_REQUEST category
  useEffect(() => {
    const fetchRequiredDocumentTypes = async () => {
      try {
        const res = await fetch(
          "http://localhost:8080/api/required-document-types/FUND_REQUEST"
        );
        if (!res.ok) throw new Error("Failed to load document types");
        const data = await res.json();
        setRequiredDocumentTypes(data);
      } catch (error) {
        console.error("Failed to load required document types:", error);
      }
    };

    fetchRequiredDocumentTypes();
  }, []);

  // Fetch uploaded documents when fundRequestId is available
  useEffect(() => {
    const targetId = fundRequestNo || fundRequestId;
    if (!targetId) {
      setUploadedDocuments([]);
      return;
    }

    const fetchUploadedDocuments = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/uploaded-documents/by-request?requestId=${encodeURIComponent(targetId)}`
        );
        if (!res.ok) {
          setUploadedDocuments([]);
          return;
        }
        const docs = await res.json();
        setUploadedDocuments(Array.isArray(docs) ? docs : []);
      } catch (error) {
        console.error("Failed to load uploaded documents:", error);
        setUploadedDocuments([]);
      }
    };

    fetchUploadedDocuments();
  }, [fundRequestNo, fundRequestId]);

  useEffect(() => {
    if (!scholarshipRequestId) return;

    const fetchScholarshipSummary = async () => {
      try {
        const response = await fetch(
          `http://localhost:8080/api/university-scholarships/${encodeURIComponent(scholarshipRequestId)}`
        );

        if (!response.ok) {
          throw new Error("Failed to load scholarship details");
        }

        const data = await response.json();
        setScholarshipSummary(data);
      } catch (error) {
        console.error("Failed to load scholarship details:", error);
        setScholarshipSummary(null);
      }
    };

    fetchScholarshipSummary();
  }, [scholarshipRequestId]);

  useEffect(() => {
    const memberId = scholarshipSummary?.memberId;
    if (!memberId) return;

    const fetchMember = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/members/${encodeURIComponent(memberId)}`);

        if (!response.ok) {
          throw new Error("Failed to load member details");
        }

        const data = await response.json();
        setMember(data);
      } catch (error) {
        console.error("Failed to load member details:", error);
        setMember(null);
      }
    };

    fetchMember();
  }, [scholarshipSummary?.memberId]);

  useEffect(() => {
    if (!fundRequestId || !scholarshipSummary?.fundRequests) return;

    const found = scholarshipSummary.fundRequests.find((item) => {
      return String(item.id) === fundRequestId || item.requestId === fundRequestId;
    });

    if (!found) return;

    reset({
      requestDate: found.requestedDate || "",
      requestedPeriod: found.requestedPeriod || "",
      amount: found.requestedAmount ? String(found.requestedAmount) : "",
    });
    setStatus(found.status || "NEW");
    setFundRequestNo(found.requestId || "");
    setRequestId(found.id ? Number(found.id) : null);
    setCurrentFundRequest(found);
    setIsSaved(true);
  }, [fundRequestId, scholarshipSummary, reset]);

  const handleEnterEditMode = () => {
    if (!fundRequestId) return;

    router.replace(
      `/membership/directory/university-scholarship-fundrequest?scholarshipRequestId=${encodeURIComponent(scholarshipRequestId)}&fundRequestId=${encodeURIComponent(fundRequestId)}&mode=edit`
    );
  };

  const handleSubmitFundRequest = async () => {
    const targetFundRequestId = fundRequestNo || fundRequestId;
    if (!scholarshipRequestId || !targetFundRequestId) return;

    const confirmSubmit = window.confirm(
      "After submitting, this fund request cannot be edited. Do you want to continue?"
    );

    if (!confirmSubmit) return;

    try {
      const response = await fetch(
        `http://localhost:8080/api/university-scholarships/${encodeURIComponent(scholarshipRequestId)}/fund-requests/${encodeURIComponent(targetFundRequestId)}/submit`,
        { method: "POST" }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let message = "Failed to submit fund request";

        try {
          const errorJson = JSON.parse(errorText);
          message = errorJson.message || message;
        } catch { }

        setPopupMessage(message);
        setShowPopup(true);
        return;
      }

      const submittedRequest: ScholarshipFundRequest = await response.json();
      setStatus(submittedRequest.status || "SUBMITTED_FOR_COMMITTEE_APPROVAL");
      setCurrentFundRequest(submittedRequest);
      setPopupMessage("Fund Request submitted for approval");
      setShowPopup(true);
    } catch (error) {
      console.error("Failed to submit fund request:", error);
      setPopupMessage("Failed to submit fund request");
      setShowPopup(true);
    }
  };

  const handleMarkIncomplete = async (reason: string) => {
    const targetFundRequestId = fundRequestNo || fundRequestId;
    if (!scholarshipRequestId || !targetFundRequestId) return;

    const currentData = getValues();

    try {
      const response = await fetch(
        `http://localhost:8080/api/university-scholarships/${encodeURIComponent(scholarshipRequestId)}/fund-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: requestId,
            requestId: targetFundRequestId,
            requestedDate: currentData.requestDate,
            requestedPeriod: currentData.requestedPeriod,
            requestedAmount: Number(currentData.amount),
            status: "INCOMPLETE",
            incompleteReason: reason,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let message = "Failed to mark fund request as incomplete";

        try {
          const errorJson = JSON.parse(errorText);
          message = errorJson.message || message;
        } catch { }

        setPopupMessage(message);
        setShowPopup(true);
        return;
      }

      const updatedRequest: ScholarshipFundRequest = await response.json();
      setStatus("INCOMPLETE");
      setCurrentFundRequest({
        ...updatedRequest,
        status: "INCOMPLETE",
        incompleteReason: updatedRequest.incompleteReason || reason,
      });
      setShowIncompleteModal(false);
      setPopupMessage("Fund Request marked as incomplete");
      setShowPopup(true);
    } catch (error) {
      console.error("Failed to mark fund request as incomplete:", error);
      setPopupMessage("Failed to mark fund request as incomplete");
      setShowPopup(true);
    }
  };

  const updateSubmittedFundRequestStatus = async (
    nextStatus: "APPROVED" | "REJECTED",
    reason?: string
  ) => {
    const targetFundRequestId = fundRequestNo || fundRequestId;
    if (!scholarshipRequestId || !targetFundRequestId) return;

    try {
      const response = await fetch(
        `http://localhost:8080/api/university-scholarships/${encodeURIComponent(scholarshipRequestId)}/fund-requests/${encodeURIComponent(targetFundRequestId)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus, reason }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let message = "Failed to change fund request status";

        try {
          const errorJson = JSON.parse(errorText);
          message = errorJson.message || message;
        } catch { }

        setPopupMessage(message);
        setShowPopup(true);
        return;
      }

      const updatedRequest: ScholarshipFundRequest = await response.json();
      setStatus(updatedRequest.status || nextStatus);
      setCurrentFundRequest(updatedRequest);
      setShowRejectModal(false);
      setRejectReason("");
      setPopupMessage(
        nextStatus === "APPROVED"
          ? "Fund Request approved successfully"
          : "Fund Request rejected successfully"
      );
      setShowPopup(true);
    } catch (error) {
      console.error("Failed to change fund request status:", error);
      setPopupMessage("Failed to change fund request status");
      setShowPopup(true);
    }
  };

  const handleApproveFundRequest = () => {
    const confirmApprove = window.confirm("Approve this Fund Request?");
    if (!confirmApprove) return;

    updateSubmittedFundRequestStatus("APPROVED");
  };

  const handleConfirmRejectFundRequest = () => {
    if (!rejectReason.trim()) {
      setPopupMessage("Rejection reason is required");
      setShowPopup(true);
      return;
    }

    updateSubmittedFundRequestStatus("REJECTED", rejectReason.trim());
  };

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 space-y-6">

        {/* TITLE */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#953002]">
              University Scholarship - Fund Request: {fundRequestNo || fundRequestId || "NEW"}
            </h1>

            <p className="mt-2 text-sm text-gray-600 flex items-center gap-8">
              <span>
                Scholarship Request: {scholarshipRequestId || "-"}
              </span>

              {(isSaved || fundRequestId) && (
                <span className="font-semibold text-blue-600">
                  Status:{" "}
                  <span>
                    {statusLabel}
                  </span>
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

          </div>
        </div>


        {/* FORM */}
        <form onSubmit={handleSubmit(handleSaveFundRequest)} className="space-y-6">

          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-[#953002]">
              Member Details
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Member ID
                </label>
                <Input value={member?.memberId || scholarshipSummary?.memberId || ""} readOnly disabled />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Surname with Initials
                </label>
                <Input value={member?.nameWithInitials || ""} readOnly disabled />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  NIC Number
                </label>
                <Input value={member?.nic || scholarshipSummary?.nic || ""} readOnly disabled />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Membership Age
                </label>
                <Input value={calculateMembershipAge(member?.membershipStartDate)} readOnly disabled />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Previous University Scholarships
                </label>
                <Input value={scholarshipSummary?.totalUniversityScholarships ?? 0} readOnly disabled />
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-[#953002]">
              Scholarship Details
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Scholarship ID
                </label>
                <Input value={scholarshipSummary?.requestId || scholarshipRequestId} readOnly disabled />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Student Name
                </label>
                <Input value={scholarshipSummary?.studentName || ""} readOnly disabled />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Birth Certificate Number
                </label>
                <Input value={scholarshipSummary?.birthCertificateNumber || ""} readOnly disabled />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  University
                </label>
                <Input value={scholarshipSummary?.universityName || ""} readOnly disabled />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Course
                </label>
                <Input value={scholarshipSummary?.programName || ""} readOnly disabled />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Study Duration
                </label>
                <Input value={scholarshipSummary?.duration || ""} readOnly disabled />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Exam Year
                </label>
                <Input value={scholarshipSummary?.examYear || ""} readOnly disabled />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Examination Number
                </label>
                <Input value={scholarshipSummary?.examNumber || ""} readOnly disabled />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Z-Score
                </label>
                <Input value={scholarshipSummary?.zScore || ""} readOnly disabled />
              </div>
            </div>
          </section>

          {/* REQUEST SECTION */}
          <section className="rounded-lg border bg-white p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-[#953002]">
                Request Information
              </span>
              <div className="flex gap-2">
                <Button type="submit" variant="outline" disabled={!canEditRequest}>
                  Save
                </Button>
              </div>
            </div>

            {/* BALANCE */}
            <div className="grid gap-4 rounded-md bg-gray-100 p-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Total Scholarship Amount</p>
                <p className="text-lg font-bold">
                  {formatCurrency(scholarshipSummary?.totalScholarshipAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Disbursement Amount</p>
                <p className="text-lg font-bold">
                  {formatCurrency(scholarshipSummary?.totalDisbursedAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Disbursement Date</p>
                <p className="text-lg font-bold">
                  {formatDate(scholarshipSummary?.lastDisbursementDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Balance Amount</p>
                <p className="text-lg font-bold">
                  {formatCurrency(availableBalance)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Available Period</p>
                <p className="text-lg font-bold">
                  {availablePeriod ? `${availablePeriod} semester(s)` : "-"}
                </p>
              </div>
            </div>

            {/* FORM FIELDS */}
            <div className="space-y-4">

              {/* REQUEST DATE */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Requested Date <span className="text-red-500">*</span>
                </label>
                <Input type="date" {...register("requestDate")} disabled={!canEditRequest} />
                {errors.requestDate && (
                  <p className="text-sm text-red-500">
                    {errors.requestDate.message}
                  </p>
                )}
              </div>

              {/* REQUEST PERIOD */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Requested Period <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Year 1 Semester 1"
                  {...register("requestedPeriod")}
                  disabled={!canEditRequest}
                />
                {errors.requestedPeriod && (
                  <p className="text-sm text-red-500">
                    {errors.requestedPeriod.message}
                  </p>
                )}
              </div>

              {/* AMOUNT */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Requested Amount (LKR) <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Enter amount"
                  {...register("amount")}
                  disabled={!canEditRequest}
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">
                    {errors.amount.message}
                  </p>
                )}
              </div>

            </div>

            {fundRequestId && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Disbursement Amount
                  </label>
                  <Input
                    value={
                      scholarshipSummary?.fundRequests?.find((item) => item.requestId === fundRequestId)?.disbursedAmount || ""
                    }
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Disbursed Date
                  </label>
                  <Input
                    value={
                      scholarshipSummary?.fundRequests?.find((item) => item.requestId === fundRequestId)?.disbursementDate || ""
                    }
                    readOnly
                    disabled
                  />
                </div>
              </div>
            )}
          </section>

          {/* DOCUMENT SECTION */}
          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              Supporting Documents
            </h3>

            <div className="rounded-lg border border-dashed p-6 text-left text-sm text-gray-500">
              <Document
                requestId={requestId}
                disabled={!canEditRequest}
                isSaved={isSaved}
                files={documentFiles}
                setFiles={setDocumentFiles}
                documentTypes={requiredDocumentTypes}
              />
            </div>
          </section>
          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3">
            {!isSubmittedForApproval && (
              <Button
                type="button"
                onClick={() => setShowIncompleteModal(true)}
                disabled={!isSaved || !isEditableStatus}
                className="bg-[#D4183D] text-white hover:bg-[#a3152f] disabled:opacity-50"
              >
                Incomplete
              </Button>
            )}

            {!isSubmittedForApproval && (
              <Button
                type="button"
                onClick={handleSubmitFundRequest}
                disabled={!isSaved || !isEditableStatus}
                className="bg-[#953002] text-white hover:bg-[#7a2500] disabled:opacity-50"
              >
                Submit for Approval
              </Button>
            )}

            {canReviewSubmittedFundRequest && (
              <Button
                type="button"
                className="bg-green-100 border-green-200 text-green-600 hover:bg-green-200"
                onClick={handleApproveFundRequest}
              >
                Approve
              </Button>
            )}

            {canReviewSubmittedFundRequest && (
              <Button
                type="button"
                className="bg-red-100 border-red-200 text-red-600 hover:bg-red-200"
                onClick={() => setShowRejectModal(true)}
              >
                Reject
              </Button>
            )}
          </div>

        </form>
      </div>

      <MarkIncompleteModal
        open={showIncompleteModal}
        onClose={() => setShowIncompleteModal(false)}
        onConfirm={handleMarkIncomplete}
      />

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-[#953002]">
              Reject Fund Request
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
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-100 border-red-200 text-red-500 hover:bg-red-200"
                onClick={handleConfirmRejectFundRequest}
                disabled={rejectReason.trim() === ""}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}
