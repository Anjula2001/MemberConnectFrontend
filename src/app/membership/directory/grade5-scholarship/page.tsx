"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../../../../components/ui/button";
import Grade5Form, { type Grade5FormRef, type Grade5InitialData, } from "../../../../components/ui/grade5schoolarship/grade5form";
import DocumentUpload from "../../../../components/ui/documentupload";
import { MarkIncompleteModal } from "../../../../components/ui/grade5schoolarship/MarkIncomplete";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";

type Grade5Request = Grade5InitialData & {
  id?: number;
  requestNo?: string;
  status?: string;
  hasDeviation?: boolean;
  incompleteReason?: string;
  minorAccountExists?: boolean;
  minorAccountNumber?: string;
  eligibleMonths?: number;
  disbursementOption?: string;
  memberAmount?: number;
  minorAmount?: number;
  isDoubleAmount?: boolean;
};

type RequiredDocument = {
  id: number;
  documentName: string;
  mandatory: boolean;
  uploaded?: boolean;
};

type UploadedDocument = {
  requiredDocumentId: number;
};

const SUBMITTED_FOR_NORMAL_APPROVAL = "SUBMITTED_FOR_NORMAL_APPROVAL";
const SUBMITTED_FOR_DEVIATION_APPROVAL = "SUBMITTED_FOR_DEVIATION_APPROVAL";
const LOCKED_STATUSES = [
  SUBMITTED_FOR_NORMAL_APPROVAL,
  SUBMITTED_FOR_DEVIATION_APPROVAL,
  "ADDED_TO_SCHOLARSHIP_NORMAL_APPROVAL_LIST",
  "ADDED_TO_SCHOLARSHIP_DEVIATION_APPROVAL_LIST",
  "APPROVED",
  "REJECTED",
];

export default function Grade5ScholarshipPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const formRef = useRef<Grade5FormRef>(null);

  const API_BASE_URL = "http://localhost:8080";

  const NORMAL_DISBURSEMENT_AMOUNT = 5000;
  const DOUBLE_DISBURSEMENT_AMOUNT = 10000;
  const ELIGIBLE_MONTH_LIMIT = 36;
  const REQUIRED_MINOR_REMITTANCE_AMOUNT = 250;

  const MEMBER_ONLY = "MEMBER_ONLY";
  const MEMBER_AND_MINOR = "MEMBER_AND_MINOR";
  const MINOR_ONLY = "MINOR_ONLY";

  const requestId = searchParams.get("requestId");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const pageMode = searchParams.get("mode") || "";
  const [isEditing, setIsEditing] = useState(pageMode === "edit");


  const isViewRequestMode = pageMode === "view" && !!requestId;


  const currencyFormatter = new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0, });

  const [member, setMember] = useState({ memberId: "", fullName: "", nameWithInitials: "", nic: "", });

  const [grade5Request, setGrade5Request] = useState<Grade5Request | null>(
    null
  );

  const isRequestLocked = grade5Request?.status
    ? LOCKED_STATUSES.includes(grade5Request.status)
    : false;

  const isEditMode = isEditing && !isRequestLocked;
  const fundReadOnly = !!grade5Request?.id && !isEditMode;

  const [openModal, setOpenModal] = useState(false);
  const [fundRefreshed, setFundRefreshed] = useState(false);
  const [minorAccountExists, setMinorAccountExists] = useState(false);
  const [minorAccountNumber, setMinorAccountNumber] = useState("");
  const [disbursementOption, setDisbursementOption] = useState("");
  const [memberAmount, setMemberAmount] = useState(0);
  const [minorAmount, setMinorAmount] = useState(0);
  const [fundError, setFundError] = useState("");
  const [eligibleMonths, setEligibleMonths] = useState(0);
  const [isDoubleAmount, setIsDoubleAmount] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(SUBMITTED_FOR_NORMAL_APPROVAL);
  const [submitError, setSubmitError] = useState("");
  const [deviationReason, setDeviationReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const isRequestSubmitted = grade5Request?.status ? LOCKED_STATUSES.includes(grade5Request.status) : false;
  const [selectedViewModeStatus, setSelectedViewModeStatus] = useState("");

  // Status transitions allowed from view mode per the requirements
  const VIEW_MODE_STATUS_TRANSITIONS: Record<string, { status: string; label: string }[]> = {
    NEW: [
      { status: "INACTIVE", label: "Mark Inactive" },
    ],
    INCOMPLETE: [
      { status: "NEW", label: "Return to New" },
      { status: "INACTIVE", label: "Mark Inactive" },
    ],
    SUBMITTED_FOR_NORMAL_APPROVAL: [
      { status: "NEW", label: "Return to New" },
      { status: "INACTIVE", label: "Mark Inactive" },
    ],
    SUBMITTED_FOR_DEVIATION_APPROVAL: [
      { status: "NEW", label: "Return to New" },
      { status: "INACTIVE", label: "Mark Inactive" },
    ],
    REJECTED: [
      { status: "INACTIVE", label: "Mark Inactive" },
      { status: "NEW", label: "Return to New" },
    ],
    INACTIVE: [
      { status: "NEW", label: "Reopen" },
    ],
  };

  const viewModeStatusActions = grade5Request?.status
    ? VIEW_MODE_STATUS_TRANSITIONS[grade5Request.status] || []
    : [];

  const showViewModeStatusDropdown =
    !!grade5Request?.id &&
    isViewRequestMode &&
    !isEditMode &&
    viewModeStatusActions.length > 0;

  useEffect(() => {
    let memberIdParam = searchParams.get("memberId");
    if (memberIdParam) {
      if (memberIdParam.includes("?")) {
        memberIdParam = memberIdParam.split("?")[0];
      }
      setSelectedMemberId(memberIdParam);
    } else {
      const fetchDefaultMember = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/members/getMembers`);
          if (!res.ok) throw new Error("Failed to fetch members");
          const members: { status: string; memberId: string | number }[] = await res.json();
          const activeMember = members.find((m) => m.status === "ACTIVE" || m.status === "active");
          if (activeMember) {
            setSelectedMemberId(activeMember.memberId as string);
          } else if (members.length > 0) {
            setSelectedMemberId(members[0].memberId as string);
          }
        } catch (error) {
          console.error("Failed to fetch default member:", error);
        }
      };
      fetchDefaultMember();
    }
  }, [searchParams, API_BASE_URL]);

  useEffect(() => {
    setIsEditing(pageMode === "edit");

    if (selectedMemberId) {
      fetchMember();
      // mode=new means a fresh creation form — do not load any existing request
      if (pageMode === "new") {
        setGrade5Request(null);
      } else {
        fetchGrade5Requests();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageMode, selectedMemberId, requestId]);

  //Fetches the selected member details.
  const fetchMember = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/members/${selectedMemberId}`);

      if (!res.ok) {
        throw new Error("Failed to fetch member");
      }

      const data = await res.json();

      setMember({
        memberId: data.memberId,
        fullName: data.fullName,
        nameWithInitials: data.nameWithInitials,
        nic: data.nic,
      });
    } catch (error) {
      console.error("Fetch member error:", error);
    }
  };

  //fetch selected member details
  const fetchGrade5Requests = async () => {
    try {
      let url: string;

      // If a specific requestId is in the URL (view mode from member profile), fetch by requestNo
      if (requestId) {
        url = `${API_BASE_URL}/api/grade5/request/${requestId}`;
      } else {
        url = `${API_BASE_URL}/api/grade5/${selectedMemberId}/request`;
      }

      console.log("Fetching:", url);

      const res = await fetch(url);

      console.log("Response status:", res.status);

      if (res.status === 404) {
        console.warn(`No Grade 5 request found (404): ${url}`);
        setGrade5Request(null);
        return;
      }

      if (!res.ok) {
        throw new Error(`API error ${res.status} fetching ${url}`);
      }

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (data) {
        setGrade5Request(data);
        // When opened via requestId, also hydrate the member from the fetched request
        if (requestId && data.memberId && !selectedMemberId) {
          setSelectedMemberId(data.memberId);
        }
      } else {
        setGrade5Request(null);
      }
    } catch (error) {
      console.error("Fetch Grade 5 request error:", error);
    }
  };

  useEffect(() => {
    if (!grade5Request) return;

    const hasSavedDisbursement =
      grade5Request.minorAccountExists !== undefined ||
      grade5Request.minorAccountNumber ||
      grade5Request.disbursementOption ||
      grade5Request.memberAmount !== undefined ||
      grade5Request.minorAmount !== undefined;

    if (!hasSavedDisbursement) return;

    setFundRefreshed(true);
    setMinorAccountExists(!!grade5Request.minorAccountExists);
    setMinorAccountNumber(grade5Request.minorAccountNumber || "");
    setEligibleMonths(grade5Request.eligibleMonths || 0);
    setDisbursementOption(grade5Request.disbursementOption || MEMBER_ONLY);
    setMemberAmount(grade5Request.memberAmount || 0);
    setMinorAmount(grade5Request.minorAmount || 0);
    setIsDoubleAmount(!!grade5Request.isDoubleAmount);
  }, [grade5Request]);

  //handle confirm in mark as incomplete
  const handleConfirm = async (reason: string) => {
    if (!reason.trim()) {
      setFundError("Incomplete reason is required.");
      return;
    }

    if (!grade5Request?.id) {
      setFundError("Please save Grade 5 request before marking incomplete.");
      setOpenModal(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/grade5/${grade5Request.requestNo}/mark-incomplete`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        setFundError(text || "Failed to mark incomplete.");
        return;
      }

      const updatedRequest = await res.json();

      setGrade5Request(updatedRequest);
      setOpenModal(false);
      setFundError("");
    } catch (error) {
      console.error(error);
      setFundError("Failed to mark request as incomplete.");
    }
  };

  //Validates the fund disbursement details before saving or submitting the request.
  const validateFundDisbursement = () => {
    if (!fundRefreshed) {
      setFundError("Please click Refresh in Fund Disbursement before saving.");
      return false;
    }

    if (eligibleMonths < 0) {
      setFundError("Eligible months cannot be negative.");
      return false;
    }

    if (!disbursementOption) {
      setFundError("Please select a fund disbursement option.");
      return false;
    }

    if (!minorAccountExists && disbursementOption !== MEMBER_ONLY) {
      setFundError(
        "Minor account disbursement options are not allowed without a minor account."
      );
      return false;
    }

    if (minorAccountExists && !minorAccountNumber.trim()) {
      setFundError("Minor account number is required.");
      return false;
    }

    if (disbursementOption === MINOR_ONLY && !minorAccountNumber.trim()) {
      setFundError("Minor account number is required for Minor Account Only option.");
      return false;
    }

    if (memberAmount < 0 || minorAmount < 0) {
      setFundError("Disbursement amounts cannot be negative.");
      return false;
    }

    setFundError("");
    return true;
  };

  //Validates that all mandatory documents are uploaded before submit a request.
  const validateMandatoryDocuments = async (savedRequestNo: string) => {
    setDocumentError("");

    try {
      const [requiredResponse, uploadedResponse] = await Promise.all([
        fetch(
          `${API_BASE_URL}/api/grade5-requests/${savedRequestNo}/required-documents?memberId=${encodeURIComponent(
            selectedMemberId
          )}`
        ),
        fetch(
          `${API_BASE_URL}/api/grade5-requests/${savedRequestNo}/uploaded-documents`
        ),
      ]);

      if (!requiredResponse.ok) {
        const errorText = await requiredResponse.text();
        setDocumentError(errorText || "Failed to load mandatory documents.");
        return false;
      }

      if (!uploadedResponse.ok) {
        const errorText = await uploadedResponse.text();
        setDocumentError(errorText || "Failed to load uploaded documents.");
        return false;
      }

      const requiredDocuments: RequiredDocument[] = await requiredResponse.json();
      const uploadedDocuments: UploadedDocument[] = await uploadedResponse.json();
      const uploadedDocumentIds = new Set(uploadedDocuments.map((document) => document.requiredDocumentId));
      const missingDocuments = requiredDocuments.filter(
        (document) =>
          document.mandatory &&
          !document.uploaded &&
          !uploadedDocumentIds.has(document.id)
      );

      if (missingDocuments.length > 0) {
        setDocumentError(
          `Please upload all mandatory documents before submitting`
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      setDocumentError("Failed to validate mandatory documents.");
      return false;
    }
  };

  const handleSave = async () => {
    if (isRequestLocked) {
      setFundError("Submitted or finalized Grade 5 request cannot be edited.");
      return;
    }

    if (!validateFundDisbursement()) {
      return;
    }

    try {
      const savedRequest = await formRef.current?.submitForm(
        {
          minorAccountExists,
          minorAccountNumber,
          eligibleMonths,
          disbursementOption,
          memberAmount,
          minorAmount,
          isDoubleAmount,
        },
        grade5Request?.requestNo
      );

      if (savedRequest) {
        setGrade5Request(savedRequest);
        setIsEditing(false);
        setFundError("");
      }
    } catch (error) {
      console.error(error);
      setFundError("Failed to save Grade 5 request.");
    }
  };

  //Handles the submit action, validates the fund disbursement and mandatory documents before allowing to submit the request.
  const handleSubmitForm = async () => {
    setSubmitError("");
    setDocumentError("");

    if (isRequestSubmitted) {
      setFundError("Submitted Grade 5 Scholarship requests cannot be submitted again.");
      return;
    }

    if (!validateFundDisbursement()) {
      return;
    }

    const extraRequestData = {
      minorAccountExists,
      minorAccountNumber,
      eligibleMonths,
      disbursementOption,
      memberAmount,
      minorAmount,
      isDoubleAmount,
    };

    let requestToSubmit = grade5Request;

    if (grade5Request?.requestNo) {
      const savedRequest = await formRef.current?.submitForm(
        extraRequestData,
        grade5Request.requestNo
      );

      if (!savedRequest?.requestNo) {
        return;
      }

      requestToSubmit = savedRequest;
      setGrade5Request(savedRequest);
    }

    if (!requestToSubmit?.requestNo) {
      try {
        const savedRequest = await formRef.current?.submitForm(extraRequestData);

        if (!savedRequest?.requestNo) {
          return;
        }

        setGrade5Request(savedRequest);
        requestToSubmit = savedRequest;
      } catch (error) {
        console.error(error);
        setFundError("Failed to save Grade 5 request before submitting.");
        return;
      }
    }

    const requestNo = requestToSubmit.requestNo;
    if (!requestNo) {
      setFundError("Invalid Grade 5 request number.");
      return;
    }

    const documentsOk = await validateMandatoryDocuments(requestNo);
    if (!documentsOk) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/grade5/check-deviation?requestedDate=${encodeURIComponent(
          requestToSubmit.requestedDate || ""
        )}&examYear=${encodeURIComponent(String(requestToSubmit.examYear))}`
      );

      if (!res.ok) {
        throw new Error("Failed to compute deviation info");
      }

      const info = await res.json();
      const isDeviation = info.deviation === true;

      setSubmitStatus(isDeviation ? SUBMITTED_FOR_DEVIATION_APPROVAL : SUBMITTED_FOR_NORMAL_APPROVAL);
      setDeviationReason(
        isDeviation
          ? "The request is not within the eligibility period and will be submitted for Deviation Approval."
          : "The request is within the eligibility period and will be submitted for Normal Approval."
      );

      setSubmitModalOpen(true);
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to evaluate eligibility before submit.");
    }
  };

  // Status change modal state
  const [statusConfirmModal, setStatusConfirmModal] = useState<{
    isOpen: boolean;
    newStatus: string;
    statusLabel: string;
  }>({
    isOpen: false,
    newStatus: "",
    statusLabel: "",
  });

  const handleChangeStatus = (newStatus: string) => {
    if (!grade5Request?.requestNo) {
      setFundError("No Grade 5 Scholarship request is loaded.");
      return;
    }

    const statusLabel =
      newStatus === "INACTIVE" ? "Inactive"
      : newStatus === "NEW" ? "New"
      : newStatus;

    setStatusConfirmModal({
      isOpen: true,
      newStatus,
      statusLabel,
    });
  };

  const confirmChangeStatus = async () => {
    const { newStatus } = statusConfirmModal;
    setStatusConfirmModal({ isOpen: false, newStatus: "", statusLabel: "" });

    if (!grade5Request?.requestNo) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/grade5/${grade5Request.requestNo}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        setFundError(err.message || "Failed to change request status.");
        return;
      }

      const updated = await res.json();
      setGrade5Request((prev) => prev ? { ...prev, ...updated } : updated);
      setFundError("");
    } catch (error) {
      console.error("Change status error:", error);
      setFundError("Failed to change request status.");
    }
  };


  const handleConfirmSubmit = async () => {
    if (!grade5Request?.id) {
      setSubmitError("Please save the Grade 5 request before submitting.");
      return;
    }

    const finalStatus = grade5Request?.hasDeviation
      ? SUBMITTED_FOR_DEVIATION_APPROVAL
      : SUBMITTED_FOR_NORMAL_APPROVAL;

    setSubmitStatus(finalStatus);
    setDeviationReason(
      grade5Request?.hasDeviation
        ? "The request is not within the eligibility period and will be submitted for Deviation Approval."
        : "The request is within the eligibility period and will be submitted for Normal Approval."
    );

    try {
      setSubmittingRequest(true);
      setSubmitError("");

      const res = await fetch(
        `${API_BASE_URL}/api/grade5/${grade5Request.requestNo}/submit`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: finalStatus }),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        setSubmitError(errorText || "Failed to submit Grade 5 request.");
        return;
      }

      const text = await res.text();
      const updatedRequest = text
        ? (JSON.parse(text) as Grade5Request)
        : { ...grade5Request, status: finalStatus };

      setGrade5Request({
        ...grade5Request,
        ...updatedRequest,
        status: updatedRequest.status || finalStatus,
      });
      setSubmitModalOpen(false);
      setFundError("");
    } catch (error) {
      console.error(error);
      setSubmitError("Failed to submit Grade 5 request.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  //Calculate fund Disbursement
  const calculateDisbursementAmount = (
    option: string,
    months: number,
    hasMinorAccount: boolean
  ) => {
    if (months < 0) {
      setFundError("Months cannot be negative.");
      return;
    }

    const isDouble = months >= ELIGIBLE_MONTH_LIMIT;
    const totalAmount = isDouble
      ? DOUBLE_DISBURSEMENT_AMOUNT
      : NORMAL_DISBURSEMENT_AMOUNT;
    const resolvedOption = hasMinorAccount ? option : MEMBER_ONLY;

    setFundError("");
    setIsDoubleAmount(isDouble);
    setDisbursementOption(resolvedOption);

    if (resolvedOption === MEMBER_ONLY) {
      setMemberAmount(totalAmount);
      setMinorAmount(0);
      return;
    }

    if (resolvedOption === MEMBER_AND_MINOR) {
      setMemberAmount(totalAmount / 2);
      setMinorAmount(totalAmount / 2);
      return;
    }

    if (resolvedOption === MINOR_ONLY) {
      setMemberAmount(0);
      setMinorAmount(totalAmount);
    }
  };

  const handleMinorAccountExistsChange = (value: string) => {
    const exists = value === "YES";

    setMinorAccountExists(exists);

    if (!exists) {
      setMinorAccountNumber("");
      calculateDisbursementAmount(MEMBER_ONLY, eligibleMonths, false);
      return;
    }

    calculateDisbursementAmount(MEMBER_AND_MINOR, eligibleMonths, true);
  };

  const handleRefreshFund = async () => {
    setFundError("");

    const birthCertificateNo = formRef.current?.getBirthCertificateNo?.();
    const examYear = formRef.current?.getExamYear?.() || grade5Request?.examYear;

    if (!birthCertificateNo) {
      setFundError("Birth Certificate No required");
      return;
    }

    try {
      let url = `${API_BASE_URL}/api/grade5/fund-details?birthCertificateNo=${encodeURIComponent(
        birthCertificateNo
      )}`;

      if (examYear) {
        url += `&examYear=${encodeURIComponent(String(examYear))}`;
      }

      const res = await fetch(url);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Fund details fetch error:", errorText);
        throw new Error(errorText || "Failed to fetch fund details");
      }

      const data = await res.json();

      setFundRefreshed(true);
      setMinorAccountExists(data.hasMinorAccount);
      setMinorAccountNumber(data.minorAccountNo || "");
      setEligibleMonths(data.eligibleMonths || 0);

      const defaultOption = data.hasMinorAccount
        ? MEMBER_AND_MINOR
        : MEMBER_ONLY;

      calculateDisbursementAmount(
        defaultOption,
        data.eligibleMonths || 0,
        data.hasMinorAccount
      );
    } catch (err) {
      console.error(err);
      setFundError("Failed to load fund details");
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 w-full px-6 py-6 pt-0">
        <div className="min-h-screen flex-1 rounded-xl w-full px-6 py-6 bg-muted/50">

          <div className="flex items-center justify-between ">
            <div>
              <p className="text-2xl font-bold text-[#953002]">
                Grade 5 Scholarship Request
                {grade5Request?.requestNo && `: ${grade5Request.requestNo}`}
              </p>

              <div className="flex items-center gap-3 mt-1">
                <div className="inline-block bg-gray-100 px-3 py-1 rounded-md text-sm text-gray-700">
                  Member: {member.fullName} ({member.memberId})
                </div>

                {grade5Request?.status && (
                  <p className="text-sm font-semibold text-blue-600">
                    • Status: {grade5Request.status}
                  </p>
                )}

                {grade5Request?.status === "INCOMPLETE" &&
                  grade5Request?.incompleteReason && (
                    <p className="text-sm text-blue-600 mt-1">
                      ({grade5Request.incompleteReason})
                    </p>
                  )}
              </div>
            </div>

            {/*open in view mode*/}
            <div className="flex gap-2">
              {isViewRequestMode &&
                grade5Request?.id &&
                !isRequestLocked &&
                !isEditMode && (
                  <Button
                    onClick={() => {
                      setIsEditing(true);

                      {/*Page routing*/ }
                      router.replace(
                        `/membership/directory/grade5-scholarship?requestId=${encodeURIComponent(
                          String(requestId)
                        )}&memberId=${encodeURIComponent(selectedMemberId)}&mode=edit`
                      );
                    }}
                    className="bg-white text-black hover:bg-gray-100"
                  >
                    Edit
                  </Button>
                )}

              {/* Change Status dropdown – shown in view mode when transitions are available */}
              {showViewModeStatusDropdown && (
                <Select
                  value={selectedViewModeStatus}
                  onValueChange={async (value) => {
                    setSelectedViewModeStatus(value);
                    await handleChangeStatus(value);
                    setSelectedViewModeStatus("");
                  }}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    {viewModeStatusActions.map((action) => (
                      <SelectItem key={action.status} value={action.status}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}



              {(!isViewRequestMode || isEditMode) && (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isRequestLocked}
                    className="bg-white text-black hover:bg-gray-100 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    Save
                  </Button>

                  <Button
                    onClick={() => setOpenModal(true)}
                    disabled={!grade5Request?.id || isRequestLocked}
                    className="bg-[#D4183D] text-white hover:bg-[#b31334] disabled:cursor-not-allowed"
                  >
                    Mark Incomplete
                  </Button>

                  <Button
                    onClick={handleSubmitForm}
                    disabled={!grade5Request?.id || isRequestLocked}
                    className="bg-[#953002] text-white hover:bg-[#7a2702] disabled:cursor-not-allowed"
                  >
                    Submit
                  </Button>
                </>
              )}
            </div>
          </div>

          {/*show document error if exists*/}
          {documentError && (
            <p className="text-red-500 text-sm mb-3">
              {documentError}
            </p>
          )}

          {fundError && (
            <p className="text-red-500 text-sm mb-3">{fundError}</p>
          )}

          <div className="bg-white border border-gray-200 rounded-lg px-5 py-5 mt-6">
            <h2 className="text-lg font-bold text-[#953002] mb-4">
              Member Details
            </h2>

            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="block font-medium mb-1">Member ID</label>
                <input
                  type="text"
                  value={member.memberId || ""}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Surname with Initials
                </label>
                <input
                  type="text"
                  value={member.nameWithInitials || ""}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">NIC Number</label>
                <input
                  type="text"
                  value={member.nic || ""}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>
          </div>


          <div className="flex gap-6 mt-6">
            <div className="flex-1 flex flex-col gap-6">

              <div className="bg-white rounded-lg shadow-sm p-6">
                <Grade5Form
                  ref={formRef}
                  memberId={selectedMemberId}
                  initialData={grade5Request}
                  readOnly={!!grade5Request?.id && !isEditMode}
                />
              </div>


              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xl font-bold text-[#953002]">
                    Fund Disbursement
                  </p>

                  <Button
                    onClick={handleRefreshFund}
                    disabled={fundReadOnly}
                    className="bg-gray-50 text-black hover:bg-gray-100 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    Refresh
                  </Button>
                </div>


                {!fundRefreshed ? (
                  <p className="text-gray-500 text-sm">
                    Click Refresh to enable fund disbursement.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Minor Account Exists
                        </label>
                        <select
                          value={minorAccountExists ? "YES" : "NO"}
                          onChange={(e) => handleMinorAccountExistsChange(e.target.value)}
                          disabled={fundReadOnly}
                          className="border rounded-md px-3 py-2 w-full"
                        >
                          <option value="YES">Yes</option>
                          <option value="NO">No</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Minor Account Number
                        </label>
                        <input
                          value={minorAccountNumber}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length > 20) return;
                            setMinorAccountNumber(value);
                          }}
                          disabled={!minorAccountExists || fundReadOnly}
                          className="border rounded-md px-3 py-2 w-full disabled:bg-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          No. of Months Remitted with Rs.
                          {REQUIRED_MINOR_REMITTANCE_AMOUNT}+
                        </label>
                        <input
                          type="number"
                          value={eligibleMonths}
                          readOnly={!minorAccountExists || fundReadOnly}
                          disabled={!minorAccountExists || fundReadOnly}
                          onChange={(e) => {
                            const months = Number(e.target.value);

                            if (months < 0) {
                              setFundError("Eligible months cannot be negative.");
                              return;
                            }

                            const selectedOption =
                              disbursementOption ||
                              (minorAccountExists ? MEMBER_AND_MINOR : MEMBER_ONLY);

                            setEligibleMonths(months);
                            setFundError("");
                            calculateDisbursementAmount(
                              selectedOption,
                              months,
                              minorAccountExists
                            );
                          }}
                          className={`border rounded-md px-3 py-2 w-full ${
                            !minorAccountExists || fundReadOnly
                              ? "bg-gray-100 cursor-not-allowed text-gray-600"
                              : ""
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Fund Disbursement Options
                      </label>

                      <div className="grid grid-cols-3 gap-3">
                        {!minorAccountExists && (
                          <label className="flex min-h-24 cursor-default flex-col gap-2 rounded-md border p-3 text-sm">
                            <span className="flex items-center gap-2 font-medium text-black">
                              <input
                                type="radio"
                                disabled={fundReadOnly}
                                checked={disbursementOption === MEMBER_ONLY}
                                readOnly
                              />
                              Member Only
                            </span>
                            <span className="text-gray-600">
                              No matching minor account was identified, so the
                              full scholarship amount is disbursed to the
                              member.
                            </span>
                          </label>
                        )}

                        {minorAccountExists && (
                          <>
                            <label
                              className={`flex min-h-24 cursor-pointer flex-col gap-2 rounded-md border border-gray-300 bg-white p-3 text-sm ${disbursementOption === MEMBER_AND_MINOR
                                ? "border-[#953002] bg-orange-50"
                                : ""
                                }`}
                            >
                              <span className="flex items-center gap-2 font-medium">
                                <input
                                  type="radio"
                                  name="fundDisbursementOption"
                                  disabled={fundReadOnly}
                                  value={MEMBER_AND_MINOR}
                                  checked={
                                    disbursementOption === MEMBER_AND_MINOR
                                  }
                                  onChange={(e) =>
                                    calculateDisbursementAmount(
                                      e.target.value,
                                      eligibleMonths,
                                      minorAccountExists
                                    )
                                  }
                                />
                                Member and Minor Account
                              </span>
                              <span className="text-gray-600">
                                Disburse the configured member and minor account
                                breakdown.
                              </span>
                            </label>

                            <label
                              className={`flex min-h-24 cursor-pointer flex-col gap-2 rounded-md border border-gray-300 bg-white p-3 text-sm ${disbursementOption === MINOR_ONLY
                                ? "border-[#953002] bg-orange-50"
                                : ""
                                }`}
                            >
                              <span className="flex items-center gap-2 font-medium">
                                <input
                                  type="radio"
                                  name="fundDisbursementOption"
                                  value={MINOR_ONLY}
                                  checked={disbursementOption === MINOR_ONLY}
                                  onChange={(e) =>
                                    calculateDisbursementAmount(e.target.value, eligibleMonths, minorAccountExists)
                                  }
                                />
                                Minor Account Only
                              </span>
                              <span className="text-gray-600">
                                Disburse the full scholarship amount to the minor account.
                              </span>
                            </label>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            Fund Disbursement Breakdown
                          </p>
                          <p className="text-sm text-gray-600">
                            Total scholarship amount:{" "}
                            {currencyFormatter.format(
                              isDoubleAmount
                                ? DOUBLE_DISBURSEMENT_AMOUNT
                                : NORMAL_DISBURSEMENT_AMOUNT
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-1">
                            Member Amount
                          </label>
                          <input
                            type="number"
                            value={memberAmount}
                            readOnly
                            className="border rounded-md px-3 py-2 w-full bg-gray-100 text-gray-700"
                          />
                        </div>

                        <div>
                          <label className="block text-sm mb-1">
                            Minor Account Amount
                          </label>
                          <input
                            type="number"
                            value={minorAmount}
                            readOnly
                            className="border rounded-md px-3 py-2 w-full bg-gray-100 text-gray-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <p className="text-xl font-bold text-[#953002] mb-4">
                  Supporting Documents
                </p>
                <DocumentUpload
                  requestNo={grade5Request?.requestNo || null}
                  memberId={selectedMemberId}
                  requestStatus={grade5Request?.status || "NEW"}
                  requestType="grade5-requests"
                  readOnly={isViewRequestMode && !!grade5Request?.id && !isEditMode}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <MarkIncompleteModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onConfirm={handleConfirm}
      />

      {submitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <p className="text-lg font-bold text-[#953002]">
              Submit Grade 5 Scholarship Request
            </p>

            <p className="mt-3 text-sm text-gray-700">
              Once submitted, the Grade 5 Scholarship Request cannot be edited. The system will choose the approval path automatically based on the eligibility rule.
            </p>

            {deviationReason && (
              <div
                className={`mt-4 rounded-md px-3 py-2 text-sm ${
                  grade5Request?.hasDeviation
                    ? "border border-red-200 bg-red-50 text-red-700"
                    : "border border-orange-200 bg-orange-50 text-orange-700"
                }`}
              >
                {deviationReason}
              </div>
            )}

            {submitError && (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {submitError}
              </p>
            )}

            <div className={`mt-5 rounded-md px-4 py-3 text-sm ${submitStatus === SUBMITTED_FOR_DEVIATION_APPROVAL ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-gray-200 bg-gray-50 text-gray-700'}`}>
              {submitStatus === SUBMITTED_FOR_DEVIATION_APPROVAL ? (
                <div>
                  <p className="font-medium">The request is not within the eligibility period.</p>
                  <p className="mt-1">It will be submitted as <span className="font-semibold text-red-700">Submitted for Deviation Approval</span>.</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">The request is within the eligibility period.</p>
                  <p className="mt-1">It will be submitted as <span className="font-semibold text-[#953002]">Submitted for Normal Approval</span>.</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                onClick={() => setSubmitModalOpen(false)}
                disabled={submittingRequest}
                className="bg-white text-black hover:bg-gray-100"
              >
                Cancel
              </Button>

              <Button
                onClick={handleConfirmSubmit}
                disabled={submittingRequest}
                className="bg-[#953002] text-white hover:bg-[#672102]"
              >
                {submittingRequest ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {statusConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-[#953002]">
              Change Grade 5 Scholarship Status
            </h3>

            <p className="text-sm text-gray-700 leading-relaxed">
              Change Grade 5 Scholarship request status to{" "}
              <span className="font-semibold text-gray-900">{statusConfirmModal.statusLabel}</span>?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => setStatusConfirmModal({ isOpen: false, newStatus: "", statusLabel: "" })}
                className="bg-white text-black hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmChangeStatus}
                className="bg-[#953002] text-white hover:bg-[#672102]"
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
