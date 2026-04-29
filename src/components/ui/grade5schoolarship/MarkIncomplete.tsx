"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../button";

const MIN_REASON_LENGTH = 1;
const MAX_REASON_LENGTH = 250;

/**
 * Validation schema for incomplete reason.
 * Zod is used here to keep form validation clear, reusable, and type-safe.
 */
const incompleteSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(MIN_REASON_LENGTH, "Reason is required")
    .max(MAX_REASON_LENGTH, "Reason cannot exceed 250 characters"),
});

type IncompleteFormValues = z.infer<typeof incompleteSchema>;

interface MarkIncompleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function MarkIncompleteModal({
  open,
  onClose,
  onConfirm,
}: MarkIncompleteModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<IncompleteFormValues>({
    resolver: zodResolver(incompleteSchema),
    mode: "onChange",
    defaultValues: {
      reason: "",
    },
  });

  if (!open) return null;

  /**
   * Submits the validated reason to the parent component.
   * The reason is trimmed before sending to avoid saving unnecessary spaces.
   */
  const onSubmit = (data: IncompleteFormValues) => {
    onConfirm(data.reason.trim());
    reset();
  };

  /**
   * Resets form values and validation errors when closing the modal.
   * This prevents old errors from showing when the modal opens again.
   */
  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white w-[450px] rounded-lg shadow-lg p-6 relative">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Close modal"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold text-[#953002]">
          Mark as Incomplete
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Provide a reason for marking this request as incomplete.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <textarea
              placeholder="Reason..."
              className="w-full min-h-[100px] rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]"
              {...register("reason")}
            />

            {errors.reason && (
              <p className="text-red-500 text-sm mt-1">
                {errors.reason.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" onClick={handleClose} variant="secondary">
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={!isValid}
              className="bg-[#953002] text-white hover:bg-[#672102]"
            >
              Confirm
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}