"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "../ui/button";
import { Trash2, UploadCloud } from "lucide-react";

type DocumentProps = {
  requestId: number | null;
  disabled: boolean;
  isSaved: boolean;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
};

export default function Document({ requestId, disabled,isSaved,files,setFiles,}: DocumentProps) {

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled) return;
      setFiles((prev) => [...prev, ...acceptedFiles]);
    },
    [disabled]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: true,
    disabled,
  });

  const removeFile = (index: number) => {
    if (disabled) return;
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-[#953002]">Documents</h3>

      {!isSaved && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500 bg-gray-50">
          Please save the request before uploading documents.
        </div>
      )}

      {isSaved && !disabled && (
        <div
          {...getRootProps()}
          className="cursor-pointer border border-dashed rounded-lg p-6
                    flex flex-col items-center justify-center text-center
                    text-sm text-muted-foreground hover:bg-gray-50"
        >
          <input {...getInputProps()} />
          <UploadCloud className="h-8 w-8 text-[#953002] mb-2" />
          <p>Upload documents one by one</p>
        </div>
      )}

      {isSaved && disabled && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500 bg-gray-50">
          Document upload is disabled after submission.
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex justify-between items-center border rounded px-3 py-2 text-sm"
            >
              <span className="truncate">{file.name}</span>

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