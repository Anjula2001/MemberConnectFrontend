"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { ChangeEvent } from "react";
import { z } from "zod";

export interface TerminationReason {
  id: string;
  name: string;
}

export interface TerminationFormRef {
  // Only the master id is returned. The reason text is resolved from the
  // Termination Reasons Master on the server and is never sent by the client.
  validateAndGetData: () => {
    terminationReasonId: string;
    requestedDate: string;
    effectiveDate: string;
    comment: string;
  } | null;
}

interface Props {
  initialData?: {
    terminationReasonId: string;
    terminationReason: string;
    requestedDate: string;
    effectiveDate: string;
    comment: string;
  };
  reasons: TerminationReason[];
  readOnly?: boolean;
}

const getTodayDate = () => new Date().toISOString().split("T")[0];

const getEffectiveDateError = (date: string) =>
  date && date > getTodayDate() ? "Effective Date cannot be a future date" : "";

const TerminationForm = forwardRef<TerminationFormRef, Props>(
  ({ initialData, reasons, readOnly = false }, ref) => {
    // Held as a string because an HTML <select> value always is one; ids coming
    // from the master are normalised the same way, so the two always compare.
    const [terminationReasonId, setTerminationReasonId] = useState(
      initialData?.terminationReasonId ? String(initialData.terminationReasonId) : ""
    );
    const [requestedDate, setRequestedDate] = useState(initialData?.requestedDate || "");
    const [effectiveDate, setEffectiveDate] = useState(initialData?.effectiveDate || "");
    const [comment, setComment] = useState(initialData?.comment || "");
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{
      terminationReasonId?: string;
      requestedDate?: string;
      effectiveDate?: string;
    }>({
      effectiveDate: getEffectiveDateError(initialData?.effectiveDate || ""),
    });

    useEffect(() => {
      setTerminationReasonId(
        initialData?.terminationReasonId ? String(initialData.terminationReasonId) : ""
      );
      setRequestedDate(initialData?.requestedDate || "");
      setEffectiveDate(initialData?.effectiveDate || "");
      setComment(initialData?.comment || "");
      setFieldErrors({
        effectiveDate: getEffectiveDateError(initialData?.effectiveDate || ""),
      });
    }, [initialData]);

    const terminationFormSchema = z
      .object({
        terminationReasonId: z.string().min(1, "Termination reason is required"),
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

    const handleReasonChange = (e: ChangeEvent<HTMLSelectElement>) => {
      setTerminationReasonId(e.target.value);
      setFieldErrors((prev) => ({
        ...prev,
        terminationReasonId: e.target.value ? "" : prev.terminationReasonId,
      }));
    };

    const handleRequestedDateChange = (e: ChangeEvent<HTMLInputElement>) => {
      const selectedDate = e.target.value;
      setRequestedDate(selectedDate);
      setFieldErrors((prev) => ({
        ...prev,
        requestedDate: selectedDate ? "" : prev.requestedDate,
      }));
    };

    const handleEffectiveDateChange = (e: ChangeEvent<HTMLInputElement>) => {
      const selectedDate = e.target.value;
      setEffectiveDate(selectedDate);
      setFieldErrors((prev) => ({
        ...prev,
        effectiveDate: getEffectiveDateError(selectedDate),
      }));
    };

    useImperativeHandle(ref, () => ({
      validateAndGetData: () => {
        setError("");

        const validationResult = terminationFormSchema.safeParse({
          terminationReasonId,
          requestedDate,
          effectiveDate,
          comment,
        });

        if (!validationResult.success) {
          const errors = validationResult.error.flatten().fieldErrors;
          const nextFieldErrors = {
            terminationReasonId: errors.terminationReasonId?.[0] || "",
            requestedDate: errors.requestedDate?.[0] || "",
            effectiveDate: errors.effectiveDate?.[0] || "",
          };

          setFieldErrors(nextFieldErrors);
          setError(
            nextFieldErrors.terminationReasonId ||
              nextFieldErrors.requestedDate ||
              nextFieldErrors.effectiveDate ||
              "Please check the form details."
          );
          return null;
        }

        // Guards against submitting an id that is not one of the options the
        // master actually offered - the server rejects those anyway, this just
        // reports it in the field instead of as a save failure.
        const selectedReason = reasons.find(
          (reason) => String(reason.id) === terminationReasonId
        );

        if (!selectedReason) {
          setFieldErrors({ terminationReasonId: "Please select a valid termination reason" });
          setError("Please select a valid termination reason");
          return null;
        }

        setFieldErrors({});

        return {
          terminationReasonId: validationResult.data.terminationReasonId,
          requestedDate: validationResult.data.requestedDate,
          effectiveDate: validationResult.data.effectiveDate,
          comment: validationResult.data.comment.trim(),
        };
      },
    }));

    return (
      <div className="space-y-4">
        <div>
          <label className="block font-medium mb-1">
            Termination due to <span className="text-red-500">*</span>
          </label>

          <select
            value={terminationReasonId}
            onChange={handleReasonChange}
            disabled={readOnly}
            className="border rounded-md px-3 py-2 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select termination reason</option>
            {reasons.map((reason) => (
              <option key={String(reason.id)} value={String(reason.id)}>
                {reason.name}
              </option>
            ))}
          </select>

          {fieldErrors.terminationReasonId && (
            <div className="text-red-500 text-sm mt-1">{fieldErrors.terminationReasonId}</div>
          )}
        </div>

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
              className="border rounded-md px-3 py-2 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
            />

            {fieldErrors.requestedDate && (
              <div className="text-red-500 text-sm mt-1">{fieldErrors.requestedDate}</div>
            )}
          </div>

          <div>
            <label className="block font-medium mb-1">
              Effective Date <span className="text-red-500">*</span>
            </label>

            <input
              type="date"
              value={effectiveDate}
              max={getTodayDate()}
              onChange={handleEffectiveDateChange}
              disabled={readOnly}
              className="border rounded-md px-3 py-2 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
            />

            {fieldErrors.effectiveDate && (
              <div className="text-red-500 text-sm mt-1">{fieldErrors.effectiveDate}</div>
            )}
          </div>
        </div>

        <div>
          <label className="block font-medium mb-1">Comment</label>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={readOnly}
            className="border rounded-md px-3 py-2 w-full min-h-[90px] disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Any remarks regarding the termination request"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    );
  }
);

TerminationForm.displayName = "TerminationForm";

export default TerminationForm;
