"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "next/navigation";

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
  status?: "NEW" | "INCOMPLETE" | "SUBMITTED_FOR_COMMITTEE_APPROVAL";
};

type ScholarshipSummary = {
  totalScholarshipAmount?: number;
  totalDisbursedAmount?: number;
  fundRequests?: ScholarshipFundRequest[];
};

export default function FundDisbursementRequest() {
  const searchParams = useSearchParams();
  const scholarshipRequestId = searchParams.get("scholarshipRequestId") || "";
  const fundRequestId = searchParams.get("fundRequestId") || "";
  const [requestId, setRequestId] = useState<number | null>(null);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [status, setStatus] = useState<
    "NEW" | "INCOMPLETE" | "SUBMITTED_FOR_COMMITTEE_APPROVAL"
  >("NEW");
  const isSubmitted = status === "SUBMITTED_FOR_COMMITTEE_APPROVAL";

  const [isSaved, setIsSaved] = useState(false);
  
  const [documentFiles, setDocumentFiles] = useState<DocumentFileItem[]>([]);
  const [requiredDocumentTypes, setRequiredDocumentTypes] = useState<RequiredDocType[]>([]);
  const [scholarshipSummary, setScholarshipSummary] = useState<ScholarshipSummary | null>(null);

  const availableBalance = Math.max(
    0,
    Number(scholarshipSummary?.totalScholarshipAmount || 0) -
      Number(scholarshipSummary?.totalDisbursedAmount || 0)
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<FundRequestFormInput, unknown, FundRequestFormOutput>({
    resolver: zodResolver(fundRequestSchema(availableBalance)),
    mode: "onChange",
  });

  const onSubmit = (data: FundRequestFormOutput) => {
    console.log("Submitted data:", data);
    reset();
  };

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
    setRequestId(found.id ? Number(found.id) : null);
    setIsSaved(true);
  }, [fundRequestId, scholarshipSummary, reset]);

  const handleIncompleteConfirm = (reason: string) => {
    console.log("Marked as Incomplete");
    console.log("Reason:", reason);
    setShowIncomplete(false);
  };

  return (
    <>
      <div className="mx-auto max-w-5xl px-6 space-y-6">
        
        {/* TITLE */}
        <div>
          <h1 className="text-2xl font-bold text-[#953002]">
            University Scholarship - Fund Request Entry
          </h1>
          {scholarshipRequestId && (
            <p className="mt-1 text-sm text-gray-600">
              Scholarship Request: {scholarshipRequestId}
              {fundRequestId && ` | Fund Request: ${fundRequestId}`}
            </p>
          )}
        </div>


        {/* FORM */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* REQUEST SECTION */}
          <section className="rounded-lg border bg-white p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-[#953002]">
                Request Information
              </span>
              <Button type="button" variant="outline">
                Save
              </Button>
            </div>

            {/* BALANCE */}
            <div className="rounded-md bg-gray-100 p-4">
              <p className="text-xs text-gray-500">Available Balance</p>
              <p className="text-lg font-bold">
                LKR {availableBalance.toLocaleString()}
              </p>
              {scholarshipSummary && (
                <p className="mt-1 text-xs text-gray-500">
                  Total Scholarship Amount: LKR {Number(scholarshipSummary.totalScholarshipAmount || 0).toLocaleString()} |
                  Total Disbursed: LKR {Number(scholarshipSummary.totalDisbursedAmount || 0).toLocaleString()}
                </p>
              )}
            </div>

            {/* FORM FIELDS */}
            <div className="space-y-4">

              {/* REQUEST DATE */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Requested Date <span className="text-red-500">*</span>
                </label>
                <Input type="date" {...register("requestDate")} />
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
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">
                    {errors.amount.message}
                  </p>
                )}
              </div>

            </div>
          </section>

          {/* DOCUMENT SECTION */}
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
          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              className="bg-[#D4183D] text-white hover:bg-red-700"
              onClick={() => setShowIncomplete(true)}
            >
              Mark as Incomplete
            </Button>

            <Button
              type="submit"
              disabled={!isValid}
              className="bg-[#953002] text-white hover:bg-[#7a2500] disabled:opacity-50"
            >
              Submit for Approval
            </Button>
          </div>

        </form>
      </div>

      {/* MODAL */}
      <MarkIncompleteModal
        open={showIncomplete}
        onClose={() => setShowIncomplete(false)}
        onConfirm={handleIncompleteConfirm}
      />
    </>
  );
}
