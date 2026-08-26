"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

import { Button } from "@/src/components/ui/button";

/**
 * The app's confirmation dialog.
 *
 * Exists to replace window.confirm(), which renders the browser's own
 * "localhost:3000 says" box — unstyled, unbranded, and impossible to theme. It also
 * blocks synchronously, so every caller has to be restructured into
 * "open the dialog" / "act on confirm"; that split is the caller's job, this component
 * only handles presentation.
 *
 * Markup mirrors the New Registrations delete confirmation, which was the established
 * pattern in the app before this was extracted.
 */
export type ConfirmDialogProps = {
  open: boolean;
  /** Heading. A noun phrase naming the thing being confirmed. */
  title: string;
  /** Optional context line under the heading — a record id, a selection count. */
  subtitle?: ReactNode;
  /** The question itself. */
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Shown on the confirm button while the action runs; also disables every control. */
  busy?: boolean;
  busyLabel?: string;
  /** Red heading and confirm button, for irreversible actions. */
  tone?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  subtitle,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "No, Cancel",
  busy = false,
  busyLabel = "Working...",
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Escape closes, matching what people expect of a modal — but not while the action
  // is running, since the dialog is the only thing showing that it is in progress.
  useEffect(() => {
    if (!open || busy) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const destructive = tone === "destructive";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-[460px] rounded-lg border bg-white shadow-xl">
        <div className="flex items-start justify-between px-5 pt-5">
          <div>
            <h2
              className={`text-[29px] font-semibold ${
                destructive ? "text-red-600" : "text-[#953002]"
              }`}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-gray-500"
            onClick={onCancel}
            aria-label="Close dialog"
            disabled={busy}
          >
            <X size={18} />
          </Button>
        </div>

        <div className="px-5 pb-5 pt-4">
          <p className="text-base leading-relaxed text-gray-600">{message}</p>

          <div className="mt-7 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-gray-700"
              onClick={onCancel}
              disabled={busy}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              className={
                destructive
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-[#953002] text-white hover:bg-[#7a2700]"
              }
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? busyLabel : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
