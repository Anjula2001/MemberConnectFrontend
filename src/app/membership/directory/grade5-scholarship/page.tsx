"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../../../../components/ui/button";
import Grade5Form, {
  Grade5FormRef,
} from "../../../../components/ui/grade5schoolarship/grade5form";
import DocumentUpload from "../../../../components/ui/documentupload";
import { MarkIncompleteModal } from "../../../../components/ui/grade5schoolarship/MarkIncomplete";

export default function Grade5ScholarshipPage() {
  const formRef = useRef<Grade5FormRef>(null);

  const API_BASE_URL = "http://localhost:8080";

  const memberId = "MEM001";

  const [member, setMember] = useState({
    memberId: "",
    fullName: "",
    nameWithInitials: "",
    nic: "",
  });

  const [grade5Request, setGrade5Request] = useState<any>(null);

  const [openModal, setOpenModal] = useState(false);
  const [status, setStatus] = useState("Draft");
  const [incompleteReason, setIncompleteReason] = useState("");
  const [fundRefreshed, setFundRefreshed] = useState(false);
  const [minorAccountExists, setMinorAccountExists] = useState(false);
  const [minorAccountNumber, setMinorAccountNumber] = useState("");
  const [disbursementOption, setDisbursementOption] = useState("");
  const [memberAmount, setMemberAmount] = useState(0);
  const [minorAmount, setMinorAmount] = useState(0);
  const [fundError, setFundError] = useState("");
  const [totalMonths, setTotalMonths] = useState(0);
  const [eligibleMonths, setEligibleMonths] = useState(0);
  const [isDoubleAmount, setIsDoubleAmount] = useState(false);

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

  const handleSave = async () => {
    if (!fundRefreshed) {
      setFundError("Please click Refresh in Fund Disbursement before saving.");
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

  const handleSubmitForm = () => {
    formRef.current?.submitForm();
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
        `http://localhost:8080/api/grade5/fund-details?birthCertificateNo=${encodeURIComponent(
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
      setTotalMonths(data.totalMonths);
      setEligibleMonths(data.eligibleMonths);
      setIsDoubleAmount(data.doubleAmount);

      const baseAmount = data.doubleAmount ? 10000 : 5000;

      if (!data.hasMinorAccount) {
        setDisbursementOption("MEMBER_ONLY");
        setMemberAmount(baseAmount);
        setMinorAmount(0);
      } else {
        setDisbursementOption("MEMBER_AND_MINOR");
        setMemberAmount(baseAmount / 2);
        setMinorAmount(baseAmount / 2);
      }
    } catch (err) {
      console.error(err);
      setFundError("Failed to load fund details");
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-6">

          {/* Header */}
          <div className="flex items-center justify-between">
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
                className="bg-white text-black hover:bg-gray-100"
              >
                Save
              </Button>

              <Button
                onClick={() => setOpenModal(true)}
                className="bg-[#D4183D] text-white hover:bg-[#b31533]"
              >
                Mark Incomplete
              </Button>

              <Button
                onClick={handleSubmitForm}
                className="bg-[#953002] text-white hover:bg-[#672102]"
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
                          onChange={(e) => setMinorAccountExists(e.target.value === "YES")}
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
                          onChange={(e) => setMinorAccountNumber(e.target.value)}
                          disabled={!minorAccountExists}
                          className="border rounded-md px-3 py-2 w-full disabled:bg-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Total Months Remitted
                        </label>
                        <input
                          value={totalMonths}
                          onChange={(e) => setTotalMonths(Number(e.target.value))}
                          className="border rounded-md px-3 py-2 w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          No. of Months with Rs.250+
                        </label>
                        <input
                          value={eligibleMonths}
                          onChange={(e) => setEligibleMonths(Number(e.target.value))}
                          className="border rounded-md px-3 py-2 w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Disbursement Option
                        </label>
                        <select
                          value={disbursementOption}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDisbursementOption(value);

                            if (value === "MEMBER_ONLY") {
                              setMemberAmount(5000);
                              setMinorAmount(0);
                            }

                            if (value === "MEMBER_AND_MINOR") {
                              setMemberAmount(2500);
                              setMinorAmount(2500);
                            }

                            if (value === "MINOR_ONLY") {
                              setMemberAmount(0);
                              setMinorAmount(5000);
                            }
                          }}
                          className="border rounded-md px-3 py-2 w-full"
                        >
                        {!minorAccountExists && (
                          <option value="MEMBER_ONLY">Member Only</option>
                        )}

                        {minorAccountExists && (
                          <>
                            <option value="MEMBER_AND_MINOR">
                              Member and Minor Account
                            </option>
                            <option value="MINOR_ONLY">
                              Minor Account Only
                            </option>
                          </>
                        )}
                      </select>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-gray-50">
                      <p className="font-semibold mb-3">Fund Disbursement Breakdown</p>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-1">Member Amount</label>
                          <input
                            type="number"
                            value={memberAmount}
                            onChange={(e) => setMemberAmount(Number(e.target.value))}
                            className="border rounded-md px-3 py-2 w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm mb-1">Minor Account Amount</label>
                          <input
                            type="number"
                            value={minorAmount}
                            onChange={(e) => setMinorAmount(Number(e.target.value))}
                            disabled={!minorAccountExists}
                            className="border rounded-md px-3 py-2 w-full disabled:bg-gray-100"
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
    </>
  );
}