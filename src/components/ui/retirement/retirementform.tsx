"use client";

import { forwardRef, useImperativeHandle, useState, useEffect } from "react";

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
}

const RetirementForm = forwardRef<RetirementFormRef, Props>(
  ({ initialData }, ref) => {
    const [requestedDate, setRequestedDate] = useState("");
    const [effectiveDate, setEffectiveDate] = useState("");
    const [comment, setComment] = useState("");

    const [error, setError] = useState("");

    // ✅ Load initial data (EDIT mode)
    useEffect(() => {
      if (initialData) {
        setRequestedDate(initialData.requestedDate || "");
        setEffectiveDate(initialData.effectiveDate || "");
        setComment(initialData.comment || "");
      }
    }, [initialData]);

    // ✅ Expose validation to parent
    useImperativeHandle(ref, () => ({
      validateAndGetData: () => {
        setError("");

        if (!requestedDate) {
          setError("Requested Date is required");
          return null;
        }

        if (!effectiveDate) {
          setError("Effective Date is required");
          return null;
        }

        const today = new Date().toISOString().split("T")[0];

        if (requestedDate > today) {
          setError("Requested Date cannot be a future date");
          return null;
        }

        // ❗ Effective date CAN be future → backend will validate
        return {
          requestedDate,
          effectiveDate,
          comment,
        };
      },
    }));

    return (
      <div className="space-y-4">
        {/* ❌ Error Message */}
        {error && (
          <div className="text-red-500 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          {/* Requested Date */}
          <div>
            <label className="block font-medium mb-1">
              Requested Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={requestedDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setRequestedDate(e.target.value)}
              className="border rounded-md px-3 py-2 w-full"
            />
          </div>

          {/* Effective Date */}
          <div>
            <label className="block font-medium mb-1">
              Effective Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="border rounded-md px-3 py-2 w-full"
            />
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block font-medium mb-1">
            Comments
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
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