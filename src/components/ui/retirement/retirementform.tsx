"use client";

import {
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import type { ChangeEvent } from "react";
import { z } from "zod";

export interface RetirementFormRef {
  validateAndGetData: () => {
    requestedDate: string;
    effectiveDate: string;
    comment: string;
  } | null;
}

interface Props {
  initialData?: {
    requestedDate: string;
    effectiveDate: string;
    comment: string;
  };
  readOnly?: boolean;
}

/**
 * Get today's date in YYYY-MM-DD format.
 * This avoids repeating the same date logic in multiple places.
 */
const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

const getEffectiveDateError = (date: string) => {
  return date && date > getTodayDate()
    ? "Effective Date cannot be a future date"
    : "";
};

const retirementFormSchema = z
  .object({
    requestedDate: z.string().min(1, "Requested Date is required"),
    effectiveDate: z.string().min(1, "Effective Date is required"),
    comment: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.requestedDate && data.requestedDate > getTodayDate()) {
      ctx.addIssue({
        code: "custom",
        message: "Requested Date cannot be a future date",
        path: ["requestedDate"],
      });
    }

    if (data.effectiveDate && data.effectiveDate > getTodayDate()) {
      ctx.addIssue({
        code: "custom",
        message: "Effective Date cannot be a future date",
        path: ["effectiveDate"],
      });
    }
  });

type RetirementFormErrors = {
  requestedDate?: string;
  effectiveDate?: string;
};

const RetirementForm = forwardRef<RetirementFormRef, Props>(
  ({ initialData, readOnly = false }, ref) => {
    const [requestedDate, setRequestedDate] = useState(
      initialData?.requestedDate || ""
    );
    const [effectiveDate, setEffectiveDate] = useState(
      initialData?.effectiveDate || ""
    );
    const [comment, setComment] = useState(initialData?.comment || "");
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<RetirementFormErrors>({
      effectiveDate: getEffectiveDateError(initialData?.effectiveDate || ""),
    });

    const handleRequestedDateChange = (e: ChangeEvent<HTMLInputElement>) => {
      const selectedDate = e.target.value;

      setRequestedDate(selectedDate);
      setFieldErrors((previousErrors) => ({
        ...previousErrors,
        requestedDate: selectedDate ? "" : previousErrors.requestedDate,
      }));
    };

    const handleEffectiveDateChange = (e: ChangeEvent<HTMLInputElement>) => {
      const selectedDate = e.target.value;

      setEffectiveDate(selectedDate);
      setFieldErrors((previousErrors) => ({
        ...previousErrors,
        effectiveDate: getEffectiveDateError(selectedDate),
      }));
    };

    /**
     * Expose validation to the parent component.
     * The parent page can call this before saving the retirement request.
     */
    useImperativeHandle(ref, () => ({
      validateAndGetData: () => {
        setError("");

        const validationResult = retirementFormSchema.safeParse({
          requestedDate,
          effectiveDate,
          comment,
        });

        if (!validationResult.success) {
          const errors = validationResult.error.flatten().fieldErrors;
          const nextFieldErrors = {
            requestedDate: errors.requestedDate?.[0] || "",
            effectiveDate: errors.effectiveDate?.[0] || "",
          };

          setFieldErrors(nextFieldErrors);
          setError(
            nextFieldErrors.requestedDate ||
              nextFieldErrors.effectiveDate ||
              "Please check the form details."
          );
          return null;
        }

        setFieldErrors({});

        return {
          ...validationResult.data,
          comment: validationResult.data.comment.trim(),
        };
      },
    }));

    return (
      <div className="space-y-4">

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">
              Requested Date <span className="text-red-500">*</span>
            </label>

            <input
              type="date"
              value={requestedDate}
              max={getTodayDate()}
              onChange={handleRequestedDateChange}
              disabled={readOnly}
              className="border rounded-md px-3 py-2 w-full"
            />

            {fieldErrors.requestedDate && (
              <div className="text-red-500 text-sm mt-1">
                {fieldErrors.requestedDate}
              </div>
            )}
          </div>

          <div>
            <label className="block font-medium mb-1">
              Effective Date <span className="text-red-500">*</span>
            </label>

            <input
              type="date"
              value={effectiveDate}
              onChange={handleEffectiveDateChange}
              disabled={readOnly}
              className="border rounded-md px-3 py-2 w-full"
            />

            {fieldErrors.effectiveDate && (
              <div className="text-red-500 text-sm mt-1">
                {fieldErrors.effectiveDate}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block font-medium mb-1">Comments</label>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={readOnly}
            className="border rounded-md px-3 py-2 w-full min-h-[90px]"
            placeholder="Any remarks regarding the retirement request"
          />
        </div>
      </div>
    );
  }
);

RetirementForm.displayName = "RetirementForm";

export default RetirementForm;
