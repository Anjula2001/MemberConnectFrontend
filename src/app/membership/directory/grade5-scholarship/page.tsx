"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../../../../components/ui/button";
import Grade5Form, {
  type Grade5FormRef,
  type Grade5InitialData,
} from "../../../../components/ui/grade5schoolarship/grade5form";
import DocumentUpload from "../../../../components/ui/documentupload";
import { MarkIncompleteModal } from "../../../../components/ui/grade5schoolarship/MarkIncomplete";

type Grade5Request = Grade5InitialData & {
  id?: number;
  requestNo?: string;
  status?: string;
  incompleteReason?: string;
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
  const formRef = useRef<Grade5FormRef>(null);

  const API_BASE_URL = "http://localhost:8080";

  const memberId = "MEM002";

  const NORMAL_DISBURSEMENT_AMOUNT = 5000;
  const DOUBLE_DISBURSEMENT_AMOUNT = 10000;
  const ELIGIBLE_MONTH_LIMIT = 36;
  const REQUIRED_MINOR_REMITTANCE_AMOUNT = 250;

  const MEMBER_ONLY = "MEMBER_ONLY";
  const MEMBER_AND_MINOR = "MEMBER_AND_MINOR";
  const MINOR_ONLY = "MINOR_ONLY";

  const currencyFormatter = new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  });

  const [member, setMember] = useState({
    memberId: "",
    fullName: "",
    nameWithInitials: "",
    nic: "",
  });

  const [grade5Request, setGrade5Request] = useState<Grade5Request | null>(
    null
  );

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
  const [submitStatus, setSubmitStatus] = useState(
    SUBMITTED_FOR_NORMAL_APPROVAL
  );
  const [submitError, setSubmitError] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const isRequestSubmitted = grade5Request?.status
    ? LOCKED_STATUSES.includes(grade5Request.status)
    : false;

  useEffect(() => {
    if (memberId) {
      fetchMember();
      fetchGrade5Requests();
    }
  }, [memberId]);

  const fetchMember = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/members/${memberId}`);

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

  const fetchGrade5Requests = async () => {
    if (!memberId) return;

    try {
      const res = await fetch(
        `http://localhost:8080/api/grade5/${memberId}/request`
      );

      if (!res.ok) {
        console.error("API error:", res.status);
        return;
      }

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (data) {
        setGrade5Request(data);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

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
        `${API_BASE_URL}/api/grade5/${grade5Request.id}/mark-incomplete`,
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

  const handleSave = async () => {
    if (grade5Request?.id) {
      setFundError("This Grade 5 request has already been saved.");
      return;
    }

    if (!validateFundDisbursement()) {
      return;
    }

    try {
      const savedRequest = await formRef.current?.submitForm();

      if (savedRequest) {
        setGrade5Request(savedRequest);
        await fetchMember();
        setFundError("");
      }
    } catch (error) {
      console.error(error);
      setFundError("Failed to save Grade 5 request.");
    }
  };

  const handleSubmitForm = async () => {
    setSubmitError("");

    if (isRequestSubmitted) {
      setFundError("Submitted Grade 5 Scholarship requests cannot be submitted again.");
      return;
    }

    if (!validateFundDisbursement()) {
      return;
    }

    if (grade5Request?.id) {
      setSubmitModalOpen(true);
      return;
    }

    try {
      const savedRequest = await formRef.current?.submitForm();

      if (!savedRequest?.id) {
        return;
      }

      setGrade5Request(savedRequest);
      setSubmitModalOpen(true);
    } catch (error) {
      console.error(error);
      setFundError("Failed to save Grade 5 request before submitting.");
    }
  };

  const handleConfirmSubmit = async () => {
    if (!grade5Request?.id) {
      setSubmitError("Please save the Grade 5 request before submitting.");
      return;
    }

    try {
      setSubmittingRequest(true);
      setSubmitError("");

      const res = await fetch(
        `${API_BASE_URL}/api/grade5/${grade5Request.id}/submit`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: submitStatus }),
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
        : { ...grade5Request, status: submitStatus };

      setGrade5Request({
        ...grade5Request,
        ...updatedRequest,
        status: updatedRequest.status || submitStatus,
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

    if (!birthCertificateNo) {
      setFundError("Birth Certificate No required");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/grade5/fund-details?birthCertificateNo=${encodeURIComponent(
          birthCertificateNo
        )}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch fund details");
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
      <div className="flex flex-1 flex-col gap-4 px-10 py-10 pt-0">
        <div className="min-h-[100vh] flex-1 rounded-xl px-14 py-10 bg-muted/50 p-6">
          {/* Header */}
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

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!!grade5Request?.id}
                className="bg-white text-black hover:bg-gray-100 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Save
              </Button>

              <Button
                onClick={() => setOpenModal(true)}
                disabled={isRequestSubmitted}
                className="bg-[#D4183D] text-white hover:bg-[#b31533] disabled:bg-gray-300 disabled:text-gray-500"
              >
                Mark Incomplete
              </Button>

              <Button
                onClick={handleSubmitForm}
                disabled={isRequestSubmitted}
                className="bg-[#953002] text-white hover:bg-[#672102] disabled:bg-gray-300 disabled:text-gray-500"
              >
                Submit
              </Button>
            </div>
          </div>

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

          {/* Main Content */}
          <div className="flex gap-6 mt-6">
            <div className="flex-1 flex flex-col gap-6">
              {/* Form */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <Grade5Form
                  ref={formRef}
                  memberId={memberId}
                  initialData={grade5Request}
                  readOnly={!!grade5Request?.id}
                />
              </div>

              {/* Fund Disbursement */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xl font-bold text-[#953002]">
                    Fund Disbursement
                  </p>

                  <Button
                    onClick={handleRefreshFund}
                    className="bg-gray-50 text-black hover:bg-gray-100"
                  >
                    Refresh
                  </Button>
                </div>

                {fundError && (
                  <p className="text-red-500 text-sm mb-3">{fundError}</p>
                )}

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
                          onChange={(e) =>
                            handleMinorAccountExistsChange(e.target.value)
                          }
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
                          disabled={!minorAccountExists}
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
                          onChange={(e) => {
                            const months = Number(e.target.value);

                            if (months < 0) {
                              setFundError("Eligible months cannot be negative.");
                              return;
                            }

                            const selectedOption =
                              disbursementOption ||
                              (minorAccountExists
                                ? MEMBER_AND_MINOR
                                : MEMBER_ONLY);

                            setEligibleMonths(months);
                            setFundError("");
                            calculateDisbursementAmount(
                              selectedOption,
                              months,
                              minorAccountExists
                            );
                          }}
                          className="border rounded-md px-3 py-2 w-full"
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
                              className={`flex min-h-24 cursor-pointer flex-col gap-2 rounded-md border border-gray-300 bg-white p-3 text-sm ${
                                disbursementOption === MEMBER_AND_MINOR
                                  ? "border-[#953002] bg-orange-50"
                                  : ""
                              }`}
                            >
                              <span className="flex items-center gap-2 font-medium">
                                <input
                                  type="radio"
                                  name="fundDisbursementOption"
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
                              className={`flex min-h-24 cursor-pointer flex-col gap-2 rounded-md border border-gray-300 bg-white p-3 text-sm ${
                                disbursementOption === MINOR_ONLY
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
                                    calculateDisbursementAmount(
                                      e.target.value,
                                      eligibleMonths,
                                      minorAccountExists
                                    )
                                  }
                                />
                                Minor Account Only
                              </span>
                              <span className="text-gray-600">
                                Disburse the full scholarship amount to the
                                minor account.
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

              {/* ✅ Document Upload MOVED BELOW */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <p className="text-xl font-bold text-[#953002] mb-4">
                  Supporting Documents
                </p>
                <DocumentUpload
                  requestId={grade5Request?.id || null}
                  memberId={memberId}
                  requestStatus={grade5Request?.status || "NEW"}
                  requestType="grade5-requests"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
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
              Once submitted, the Grade 5 Scholarship Request cannot be edited.
              Select the approval path for this request.
            </p>

            {submitError && (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {submitError}
              </p>
            )}

            <div className="mt-5 space-y-3">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${
                  submitStatus === SUBMITTED_FOR_NORMAL_APPROVAL
                    ? "border-[#953002] bg-orange-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="submitStatus"
                  value={SUBMITTED_FOR_NORMAL_APPROVAL}
                  checked={submitStatus === SUBMITTED_FOR_NORMAL_APPROVAL}
                  onChange={(e) => setSubmitStatus(e.target.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium">
                    Submitted for Normal Approval
                  </span>
                  <span className="block text-sm text-gray-600">
                    Use this when the request does not satisfy deviation
                    criteria.
                  </span>
                </span>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${
                  submitStatus === SUBMITTED_FOR_DEVIATION_APPROVAL
                    ? "border-[#953002] bg-orange-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="submitStatus"
                  value={SUBMITTED_FOR_DEVIATION_APPROVAL}
                  checked={submitStatus === SUBMITTED_FOR_DEVIATION_APPROVAL}
                  onChange={(e) => setSubmitStatus(e.target.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium">
                    Submitted for Deviation Approval
                  </span>
                  <span className="block text-sm text-gray-600">
                    Use this when the request satisfies deviation criteria.
                  </span>
                </span>
              </label>
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
    </>
  );
}
