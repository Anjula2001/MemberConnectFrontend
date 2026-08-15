"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../button";

const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Reject comment is required")
    .max(250, "Reject comment cannot exceed 250 characters"),
});

type RejectFormValues = z.infer<typeof rejectSchema>;

interface RejectRequestModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function RejectRequestModal({
  open,
  onClose,
  onConfirm,
  isLoading = false,
}: RejectRequestModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    mode: "onChange",
    defaultValues: {
      reason: "",
    },
  });

  if (!open) return null;

  const onSubmit = (data: RejectFormValues) => {
    onConfirm(data.reason.trim());
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[450px] rounded-lg bg-white p-6 shadow-lg">
        <button
          type="button"
          onClick={handleClose}
          disabled={isLoading}
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          aria-label="Close modal"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold text-[#953002]">Reject Death Donation Request</h2>
        <p className="mt-1 text-sm text-gray-500">
          Provide a comment explaining why this request is being rejected.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <textarea
              placeholder="Reject comment..."
              className="min-h-[100px] w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]"
              {...register("reason")}
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-500">{errors.reason.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" onClick={handleClose} variant="secondary" disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isLoading}
              className="bg-[#D4183D] text-white hover:bg-[#b31334] disabled:opacity-70"
            >
              {isLoading ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
