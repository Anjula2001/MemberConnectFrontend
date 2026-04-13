"use client";

import { forwardRef, useImperativeHandle, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../../ui/input";


const retirementSchema = z.object({
  requestedDate: z.string().min(1, "Requested date is required"),
  effectiveDate: z
    .string()
    .min(1, "Effective date is required")
    .refine((date) => {
      const selected = new Date(date);
      const today = new Date();

      // Remove time part (SAFE VERSION)
      const selectedOnly = new Date(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate()
      );

      const todayOnly = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      return selectedOnly <= todayOnly;
    }, {
      message: "Effective Date cannot be a future date",
    }),
  comment: z.string().optional(),
});

export type RetirementFormValues = z.infer<typeof retirementSchema>;

export interface RetirementFormRef {
  saveDraft: () => void;
  submitForm: () => void;
}

const RetirementForm = forwardRef<RetirementFormRef>((_, ref) => {
  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<RetirementFormValues>({
    resolver: zodResolver(retirementSchema),
  });

  const today = new Date();
  


  const onValid = (data: RetirementFormValues) => {
    console.log("Validated Data:", data);
  };
  const onInvalid = (errors: any) => {
    console.log("Validation Errors:", errors);
  };


  
  useImperativeHandle(ref, () => ({
    
    saveDraft: async () => {
      const isValid = await trigger(); // validate full form
      if (!isValid) {
        console.log("Cannot save: validation errors", errors);
        return;
      }
      const data = getValues();
      console.log("Saved Draft (frontend-only)", data);
      alert("Draft Saved "); // Frontend feedback
    },

    // Submit final
    submitForm: handleSubmit((data) => {
      console.log("Submitted (frontend-only)", data);
      alert("Form Submitted "); // Frontend feedback
    }, (errors) => {
      console.log("Validation Errors on Submit", errors);
      
    }),
  }));

  return (
    <form  onSubmit={handleSubmit(onValid, onInvalid)}className="space-y-6">
      <p className="text-[#953002] text-xl font-bold">
        Request Details
      </p>

      <div className="grid grid-cols-2 gap-4">

        {/* Requested Date */}
        <div>
          <label className="block font-medium mb-1">
            Requested Date
          </label>
          <Input type="date" {...register("requestedDate")} />
          
          {errors.requestedDate && (
            <p className="text-red-500 text-sm">
              {errors.requestedDate.message}
            </p>
          )}
        </div>

        {/* Effective Date */}
        <div>
          <label className="block font-medium mb-1">
            Effective Date
          </label>
          <Input
            type="date"
            {...register("effectiveDate")}
          />
          {errors.effectiveDate && (
            <p className="text-red-500 text-sm">
              {errors.effectiveDate.message}
            </p>
          )}
        </div>
        
        {/* Marks Obtained */}
        <div className="col-span-2">
          <label className="block font-medium mb-1">
            Comment
          </label>
          <div className="flex gap-6">
          <textarea className="w-full min-h-[100px] rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]"
            {...register("comment")} />
          
          </div>
        </div>
      </div>
    </form>
  );
});

export default RetirementForm;
