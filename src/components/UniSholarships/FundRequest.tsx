"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import Document from "./Document";
import { MarkIncompleteModal } from "./Incomplete";

/*ZOD SCHEMA*/
const fundRequestSchema = z.object({
  requestedDate: z.string().min(1, "Requested date is required"),
  requestedPeriod: z.string().min(1, "Requested period is required"),
  amount: z.string().min(1, "Amount is required"),
});

type FundRequestForm = z.infer<typeof fundRequestSchema>;

export default function FundDisbursementRequest() {
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<FundRequestForm>({
    resolver: zodResolver(fundRequestSchema),
    mode: "onChange",
  });

  /*SUBMIT HANDLER*/
  const onSubmit = (data: FundRequestForm) => {
    console.log("Submitted data:", data);
    reset();
  };

  /*INCOMPLETE HANDLER*/
  const handleIncompleteConfirm = () => {
    if (!reason.trim()) {
      setReasonError("Reason is required");
      return;
    }

    console.log("Marked as Incomplete");
    console.log("Reason:", reason);

    setReason("");
    setReasonError("");
    setShowIncomplete(false);
  };

  return (
    <>
      <div className="space-y-6">

        {/* PAGE TITLE */}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#953002]">
            Fund Disbursement Request
          </h1>
        </div>

        <Separator />

        {/* MAIN CONTENT */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* LEFT – REQUEST DETAILS */}
          <section className="lg:col-span-2 rounded-lg border bg-white p-6 space-y-6">
           <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#953002]">
                    Request Details
                </h2>
                
                <Button variant="outline">Save</Button>
            </div>

            {/* AVAILABLE BALANCE */}
            <div className="rounded-md bg-gray-100 p-4">
              <p className="text-xs text-gray-500">Available Balance</p>
              <p className="text-lg font-bold">LKR 200,000</p>
            </div>

            {/* FORM FIELDS */}
            <div className="space-y-4">

              {/* REQUESTED DATE */}
              <div className="space-y-1">
                <label className="text-medium  text-black">
                  Requested Date
                </label>
                <Input type="date" {...register("requestedDate")} />
                {errors.requestedDate && (
                  <p className="text-sm text-red-500">
                    {errors.requestedDate.message}
                  </p>
                )}
              </div>

              {/* REQUESTED PERIOD */}
              <div className="space-y-1">
                <label className="text-medium  text-black">
                  Requested Period (e.g. Year 1 Sem 1)
                </label>
                <Input
                  placeholder="Year 1 Sem 1"
                  {...register("requestedPeriod")}
                />
                {errors.requestedPeriod && (
                  <p className="text-sm text-red-500">
                    {errors.requestedPeriod.message}
                  </p>
                )}
              </div>

              {/* AMOUNT */}
              <div className="space-y-1">
                <label className="text-medium text-black">
                  Amount
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

          {/* RIGHT – DOCUMENTS */}
          <section className="rounded-lg border bg-white p-6 space-y-4">

            <div className="border border-dashed rounded-lg p-6 text-center text-sm text-gray-500">
              <Document />
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex justify-center gap-3 pt-4">
              <Button
                type="button"
                className="bg-[#D4183D] hover:bg-red-700 text-white"
                onClick={() => setShowIncomplete(true)}
              >
                Incomplete
              </Button>

              <Button
                type="submit"
                disabled={!isValid}
                className="bg-[#953002] text-white hover:bg-[#7a2500] disabled:opacity-50"
              >
                Submit for Approval
              </Button>
            </div>
          </section>
        </form>
      </div>

      {/*INCOMPLETE POPUP*/}
       <MarkIncompleteModal 
              open={showIncomplete}
              onClose={() => setShowIncomplete(false)}
              onConfirm={handleIncompleteConfirm}
            />
        </>
  );
}
