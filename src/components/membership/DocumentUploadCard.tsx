"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileUp, Trash2, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/src/components/ui/button";

type DocumentUploadCardProps = {
  label: string;
  disabled?: boolean;
  isUploading?: boolean;
  existingUrl?: string | null;
  existingDocId?: number | null;
  existingFileName?: string | null;
  onFileSelected: (file: File) => void;
  onDelete?: () => Promise<void>;
};

export default function DocumentUploadCard({
  label,
  disabled = false,
  isUploading = false,
  existingUrl = null,
  existingDocId = null,
  existingFileName = null,
  onFileSelected,
  onDelete,
}: DocumentUploadCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [pdfPreviewDataUrl, setPdfPreviewDataUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setSelectedFile(file);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    disabled: disabled || isUploading || isDeleting,
    maxFiles: 1,
    multiple: false,
    noClick: true,
    accept: {
      "image/*": [],
      "application/pdf": [],
    },
  });

  // Local file object URL
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      setIsPdf(false);
      setPdfPreviewDataUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setIsPdf(selectedFile.type === "application/pdf");

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  // PDF.js first-page render for locally selected PDFs
  useEffect(() => {
    const renderPdfPreview = async () => {
      if (!selectedFile || selectedFile.type !== "application/pdf") return;

      try {
        const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs";

        const buffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        setPdfPreviewDataUrl(canvas.toDataURL("image/png"));
      } catch {
        setPdfPreviewDataUrl(null);
      }
    };

    renderPdfPreview();
  }, [selectedFile]);

  const handleDownload = () => {
    if (!existingUrl) return;
    const downloadName = existingFileName ?? label.replace(/\s+/g, "_") + "_document";
    const link = document.createElement("a");
    link.href = existingUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm(`Are you sure you want to delete the "${label}" document? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await onDelete();
      setSelectedFile(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const fileHint = useMemo(() => {
    if (selectedFile) return `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`;
    if (existingFileName) return existingFileName;
    if (existingUrl) return "Previously uploaded — select a new file to replace";
    return "Drop image/PDF here or click Browse";
  }, [selectedFile, existingUrl, existingFileName]);

  const hasExisting = !!existingUrl && !selectedFile;

  const renderPreview = () => {
    // Local newly-selected file
    if (selectedFile && previewUrl) {
      if (isPdf) {
        return (
          <div className="w-full text-center">
            {pdfPreviewDataUrl ? (
              <img
                src={pdfPreviewDataUrl}
                alt="PDF preview"
                className="mx-auto max-h-32 rounded border"
              />
            ) : (
              <p className="text-xs text-gray-500">PDF selected</p>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        );
      }
      return (
        <img
          src={previewUrl}
          alt="Document preview"
          className="mx-auto max-h-32 rounded border object-contain"
        />
      );
    }

    // Server-stored existing file
    if (existingUrl) {
      const isPdfUrl = existingUrl.toLowerCase().endsWith(".pdf");
      if (isPdfUrl) {
        return (
          <div className="w-full text-center space-y-1">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-[#f7ede8]">
              <FileUp className="h-8 w-8 text-[#953002]" />
            </div>
            <p className="text-xs font-medium text-gray-600">PDF Document</p>
          </div>
        );
      }
      return (
        <img
          src={existingUrl}
          alt="Uploaded document"
          className="mx-auto max-h-32 rounded border object-contain"
        />
      );
    }

    // Nothing uploaded yet
    return (
      <div className="text-center">
        <FileUp className="mx-auto mb-1 h-6 w-6 text-gray-400" />
        <p className="text-xs text-gray-500">Drop file here</p>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Card header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[#953002]">{label}</p>
        <div className="flex items-center gap-1.5">
          {isUploading && (
            <span className="text-xs text-gray-400">Uploading...</span>
          )}
          {isDeleting && (
            <span className="text-xs text-gray-400">Deleting...</span>
          )}
          {!isUploading && !isDeleting && hasExisting && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700 border border-green-200">
              ✓ Uploaded
            </span>
          )}
        </div>
      </div>

      {/* Drop zone / preview */}
      <div
        {...getRootProps()}
        className={`rounded-lg border border-dashed p-4 transition ${
          isDragActive
            ? "border-[#953002] bg-[#fff6f2]"
            : hasExisting
            ? "border-green-300 bg-green-50/40"
            : "border-gray-300 bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex min-h-28 items-center justify-center">
          {renderPreview()}
        </div>
      </div>

      {/* File hint */}
      <p className="mt-2 truncate text-xs text-gray-500">{fileHint}</p>

      {/* Action buttons */}
      <div className="mt-3 flex flex-col gap-2">
        {/* Download + Delete row (only when a server file exists and no new file selected) */}
        {hasExisting && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              className="flex-1 border-[#953002] text-[#953002] hover:bg-[#fff6f2] hover:text-[#7a2700] text-sm"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting || disabled}
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 text-sm"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            )}
          </div>
        )}

        {/* Browse / Replace button */}
        <Button
          type="button"
          variant="outline"
          onClick={open}
          disabled={disabled || isUploading || isDeleting}
          className="w-full border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
        >
          <Upload className="h-4 w-4" />
          {hasExisting ? "Replace File" : "Browse File"}
        </Button>
      </div>
    </div>
  );
}
