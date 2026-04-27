"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "../ui/button";
import { Trash2, UploadCloud } from "lucide-react";

export type DocumentFileItem = {
  file: File;
  documentType: string;
};

export type RequiredDocType = {
  id: number;
  documentType: string;
  displayName: string;
  mandatory: boolean;
};

type DocumentProps = {
  requestId: number | null;
  disabled: boolean;
  isSaved: boolean;
  files: DocumentFileItem[];
  setFiles: React.Dispatch<React.SetStateAction<DocumentFileItem[]>>;
  documentTypes: RequiredDocType[];
};

export default function Document({
  disabled,
  isSaved,
  files,
  setFiles,
  documentTypes,
}: DocumentProps) {
  const [selectedDocumentType, setSelectedDocumentType] = useState("");

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled || !selectedDocumentType) return;

      const newFiles = acceptedFiles.map((file) => ({
        file,
        documentType: selectedDocumentType,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [disabled, selectedDocumentType, setFiles]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    disabled: disabled || !selectedDocumentType,
  });

  const removeFile = (index: number) => {
    if (disabled) return;
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getDocumentLabel = (value: string) => {
    return (
      documentTypes.find((type) => type.documentType === value)?.displayName ||
      value
    );
  };

  return (
    <div className="space-y-4 text-left">
      <h3 className="text-xl font-bold text-center text-[#953002]">Documents</h3>

      {!isSaved && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500 bg-gray-50">
          Please save the request before uploading documents.
        </div>
      )}

      {isSaved && !disabled && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 text-left">
              Document Type <span className="text-red-500">*</span>
            </label>

            <select
              value={selectedDocumentType}
              onChange={(e) => setSelectedDocumentType(e.target.value)}
              className="h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Select Document Type</option>

              {documentTypes.map((type) => (
                <option key={type.id} value={type.documentType}>
                  {type.displayName} {type.mandatory ? "(Mandatory)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div
            {...getRootProps()}
            className={`border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-left text-sm ${
              selectedDocumentType
                ? "cursor-pointer text-muted-foreground hover:bg-gray-50"
                : "cursor-not-allowed bg-gray-50 text-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="h-8 w-8 text-[#953002] mb-2" />
            <p>
              {selectedDocumentType
                ? "Upload selected document"
                : "Select document type before uploading"}
            </p>
          </div>
        </>
      )}

      {isSaved && disabled && (
        <div className="rounded-lg border border-dashed p-6 text-sm text-center text-gray-500 bg-gray-50">
          Document upload is disabled after submission.
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((item, index) => (
            <li
              key={`${item.file.name}-${index}`}
              className="flex justify-between items-center border rounded px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {getDocumentLabel(item.documentType)}
                </p>
                <p className="truncate text-gray-600">{item.file.name}</p>
              </div>

              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeFile(index)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}