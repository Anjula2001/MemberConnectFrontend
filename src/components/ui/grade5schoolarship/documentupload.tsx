"use client";

import { Button } from "../../ui/button"; 
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Trash2, UploadCloud } from "lucide-react";

export default function DocumentUpload(){

  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };


  return (
    <div className="p-6 bg-white rounded-lg shadow-sm flex flex-col gap-6">
      <h2 className="text-[#953002] text-xl font-bold">Document</h2>
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

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={index}
              className="flex justify-between items-center border rounded px-3 py-2 text-sm"
            >
              <span className="truncate">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeFile(index)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

