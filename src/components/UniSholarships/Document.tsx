"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Trash2, UploadCloud } from "lucide-react";

export type DocumentFileItem = {
  file: File;
  documentType: string;
  uploadedAt?: string;
  id?: number;
};

export type RequiredDocType = {
  id: number;
  documentType: string;
  displayName: string;
  mandatory: boolean;
};

type DocumentProps = {
  requestId: number | string | null;
  disabled: boolean;
  isSaved: boolean;
  isSubmitted?: boolean;
  files: DocumentFileItem[];
  setFiles: React.Dispatch<React.SetStateAction<DocumentFileItem[]>>;
  documentTypes: RequiredDocType[];
  uploadedDocuments?: any[];
};

export default function Document({
  requestId,
  disabled,
  isSaved,
  isSubmitted,
  files,
  setFiles,
  documentTypes,
  uploadedDocuments = [],
}: DocumentProps) {
  const [selectedDocumentType, setSelectedDocumentType] = useState("");

  //Handle file drop
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled || !selectedDocumentType) return;

      const newFiles = acceptedFiles.map((file) => ({
        file,
        documentType: selectedDocumentType,
        uploadedAt: new Date().toISOString(),
      }));

      setFiles((prev) => [...prev, ...newFiles]);
      setSelectedDocumentType("");
    },
    [disabled, selectedDocumentType, setFiles]
  );

  //Initialize react-dropzone
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    disabled: disabled || !selectedDocumentType,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
  });

  //Handle file removal
  const removeFile = (index: number) => {
    if (disabled) return;
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  //Get document label from document type
  const getDocumentLabel = (value: string) => {
    return (
      documentTypes.find((type) => type.documentType === value)?.displayName ||
      value
    );
  };

  //Format date time for display
  const formatDateTime = (value?: string) => {
    if (!value) return "Not uploaded yet";
    return new Date(value).toLocaleString();
  };

  return (
    <div className="space-y-4 text-left">
      <h3 className="text-xl font-bold text-center text-[#953002]">
        Documents
      </h3>

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

              {documentTypes.map((type) => {
                const isUploaded = uploadedDocuments?.some(
                  (doc) =>
                    doc.requiredDocumentId === type.id ||
                    doc.documentType === type.documentType
                );
                const isStaged = files.some(
                  (file) => file.documentType === type.documentType
                );
                const isAlreadyAdded = Boolean(isUploaded || isStaged);

                return (
                  <option
                    key={type.id}
                    value={type.documentType}
                    disabled={isAlreadyAdded}
                  >
                    {type.displayName} {type.mandatory ? "(Mandatory)" : ""}{" "}
                    {isAlreadyAdded ? "(Already Added)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/*
            `relative` is load-bearing, not cosmetic.

            react-dropzone hides its file input with the visually-hidden recipe:
            position:absolute, 1x1px, clipped. That recipe assumes a positioned
            ancestor. With every ancestor static the input's containing block becomes
            the initial containing block — the document — so it is NOT clipped by the
            <main> scroll container it visually sits in, and its offset is measured
            down the whole page. Measured here at top:1643px against a 1135px
            viewport, which stretched documentElement to 1644px and gave the app a
            second, outer scrollbar over ~500px of blank space below the form.

            Making this div the containing block keeps the input inside <main>, where
            it is clipped like everything else.
          */}
          <div
            {...getRootProps()}
            className={`relative border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center text-sm ${
              selectedDocumentType
                ? "cursor-pointer text-muted-foreground hover:bg-gray-50"
                : "cursor-not-allowed bg-gray-50 text-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="h-8 w-8 text-[#953002] mb-2" />
            <p>
              {selectedDocumentType
                ? "Upload selected document (PDF, PNG, JPG)"
                : "Select document type before uploading"}
            </p>
          </div>
        </>
      )}

      {isSaved && disabled && (
        <div className="rounded-lg border border-dashed p-6 text-sm text-center text-gray-500 bg-gray-50">
          {isSubmitted
            ? "Document upload is disabled after submission."
            : "Can't upload files in view mode."}
        </div>
      )}

      {files.length > 0 && (
        <div className="overflow-x-auto rounded border">
          <Table className="border-collapse">
            <TableHeader>
              <TableRow className="bg-[#fafafa] hover:bg-[#fafafa]">
                <TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">Document Type</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">File Name</TableHead>
                {!disabled && (
                  <TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase text-right">Action</TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {files.map((item, index) => (
                <TableRow key={`${item.file.name}-${index}`} className="hover:bg-neutral-50">
                  <TableCell className="px-4 py-4 text-neutral-700">
                    {getDocumentLabel(item.documentType)}
                  </TableCell>

                  <TableCell className="px-4 py-4">
                    {item.id ? (
                      <a
                        href={`http://localhost:8080/api/uploaded-documents/download/${item.id}?requestId=${encodeURIComponent(requestId ? String(requestId) : "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[#953002] hover:underline"
                      >
                        {item.file.name}
                      </a>
                    ) : (
                      <span className="font-medium text-neutral-700">
                        {item.file.name}
                      </span>
                    )}
                  </TableCell>

                  {!disabled && (
                    <TableCell className="px-4 py-4 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove document"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
