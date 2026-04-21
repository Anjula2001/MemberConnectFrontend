"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "../ui/button";
import { Input } from "../ui/input";

import Document from "./Document";
import { MarkIncompleteModal } from "./Incomplete";

import { fundRequestSchema } from "@/lib/validators/fundrequestvalidation.schema";

type FundRequestSchema = ReturnType<typeof fundRequestSchema>;
type FundRequestFormInput = z.input<FundRequestSchema>;
type FundRequestFormOutput = z.output<FundRequestSchema>;

export default function FundDisbursementRequest() {
  const [showIncomplete, setShowIncomplete] = useState(false);

  const availableBalance = 200000;

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
            Fund Disbursement Request
          </h1>
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
          <section className="rounded-lg border bg-white p-6 space-y-4">
            <h3 className="text-lg font-semibold text-[#953002]">
              Supporting Documents
            </h3>

            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
              <Document />
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