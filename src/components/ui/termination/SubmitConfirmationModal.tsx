"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";

interface SubmitConfirmationModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  footerNote?: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SubmitConfirmationModal({
  open,
  title,
  description,
  confirmLabel = "Submit for Approval",
  cancelLabel = "Cancel",
  footerNote,
  isLoading = false,
  onClose,
  onConfirm,
}: SubmitConfirmationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-confirmation-title"
      >
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h2
                id="submit-confirmation-title"
                className="text-lg font-semibold text-[#953002]"
              >
                {title}
              </h2>
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {footerNote && (
          <div className="rounded-b-xl bg-amber-50 px-6 py-3">
            <p className="text-sm text-amber-900">{footerNote}</p>
          </div>
        )}

        <div className={`flex justify-end gap-3 px-6 py-4 ${footerNote ? "" : "border-t"}`}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-gray-300"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-[#953002] text-white hover:bg-[#7a2702] disabled:opacity-70"
          >
            {isLoading ? "Submitting..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SubmitSuccessModalProps {
  open: boolean;
  title?: string;
  description?: string;
  requestId?: string;
  onClose: () => void;
}

export function SubmitSuccessModal({
  open,
  title = "Submitted for Approval",
  description = "The termination request has been submitted for approval and can no longer be edited.",
  requestId,
  onClose,
}: SubmitSuccessModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-success-title"
      >
        <div className="px-6 py-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>

          <h2
            id="submit-success-title"
            className="text-xl font-semibold text-[#953002]"
          >
            {title}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {description}
          </p>

          {requestId && (
            <p className="mt-3 inline-block rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
              Request ID: {requestId}
            </p>
          )}
        </div>

        <div className="flex justify-center border-t px-6 py-4">
          <Button
            type="button"
            onClick={onClose}
            className="min-w-[120px] bg-[#953002] text-white hover:bg-[#7a2702]"
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
