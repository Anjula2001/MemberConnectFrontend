"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileUp, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/src/components/ui/button";

type DocumentUploadCardProps = {
  label: string;
  disabled?: boolean;
  isUploading?: boolean;
  onFileSelected: (file: File) => void;
};

export default function DocumentUploadCard({
  label,
  disabled = false,
  isUploading = false,
  onFileSelected,
}: DocumentUploadCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [pdfPreviewDataUrl, setPdfPreviewDataUrl] = useState<string | null>(null);
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
    disabled: disabled || isUploading,
    maxFiles: 1,
    multiple: false,
    noClick: true,
    accept: {
      "image/*": [],
      "application/pdf": [],
    },
  });

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

  useEffect(() => {
    const renderPdfPreview = async () => {
      if (!selectedFile || selectedFile.type !== "application/pdf") {
        return;
      }

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

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        setPdfPreviewDataUrl(canvas.toDataURL("image/png"));
      } catch {
        setPdfPreviewDataUrl(null);
      }
    };

    renderPdfPreview();
  }, [selectedFile]);

  const fileHint = useMemo(() => {
    if (!selectedFile) return "Drop image/PDF here or click Browse";
    return `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`;
  }, [selectedFile]);

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[#953002]">{label}</p>
        {isUploading && <span className="text-xs text-gray-500">Uploading...</span>}
      </div>

      <div
        {...getRootProps()}
        className={`rounded-md border border-dashed p-4 transition ${
          isDragActive
            ? "border-[#953002] bg-[#fff6f2]"
            : "border-gray-300 bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex min-h-28 items-center justify-center">
          {selectedFile && previewUrl ? (
            isPdf ? (
              <div className="w-full text-center">
                {pdfPreviewDataUrl ? (
                  // Using PDF.js rendered first page preview.
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
            ) : (
              <img
                src={previewUrl}
                alt="Document preview"
                className="mx-auto max-h-32 rounded border object-contain"
              />
            )
          ) : (
            <div className="text-center">
              <FileUp className="mx-auto mb-1 h-6 w-6 text-gray-400" />
              <p className="text-xs text-gray-500">Drop file here</p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">{fileHint}</p>

      <Button
        type="button"
        variant="outline"
        onClick={open}
        disabled={disabled || isUploading}
        className="mt-3 w-full border-gray-300 bg-white text-sm text-gray-700"
      >
        <Upload className="h-4 w-4" />
        Browse File
      </Button>
    </div>
  );
}
