"use client";

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/lib/toast-context";
import { X, CheckCircle, AlertCircle } from "lucide-react";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <Alert
            variant={toast.variant}
            className="min-w-80 max-w-md shadow-md rounded-lg border"
          >
            {toast.variant === "destructive" ? (
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            )}
            <div className="flex items-start justify-between gap-3 flex-1">
              <AlertDescription className="text-sm font-medium">
                {toast.message}
              </AlertDescription>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </Alert>
        </div>
      ))}
    </div>
  );
}
