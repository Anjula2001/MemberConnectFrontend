"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { apiClient } from "@/lib/api/client";

/**
 * These endpoints sit under .anyRequest().authenticated() in SecurityConfig -
 * only the literal /api/documents/**, /api/uploaded-documents/** and
 * /api/file/** paths are permitAll, and none of the per-request document paths
 * used here match those. They therefore need the JWT, which is why every call
 * goes through apiClient rather than a bare fetch to a hardcoded host.
 */

const SUBMITTED_STATUSES = [
  "SUBMITTED_FOR_APPROVAL",
  // The two Member Death escalation levels. A record with a committee is as
  // locked as a submitted one - only the District Office may change its files.
  "DISTRICT_COMMITTEE",
  "PD_COMMITTEE",
  "SUBMITTED_FOR_NORMAL_APPROVAL",
  "SUBMITTED_FOR_DEVIATION_APPROVAL",
  "ADDED_TO_APPROVAL_LIST",
  "ADDED_TO_SCHOLARSHIP_NORMAL_APPROVAL_LIST",
  "ADDED_TO_SCHOLARSHIP_DEVIATION_APPROVAL_LIST",
  "APPROVED",
  "REJECTED",
];

interface RequiredDocument {
  id: number;
  documentName: string;
  mandatory: boolean;
  uploaded: boolean;
}

interface UploadedDocument {
  id: number;
  requestNo: String;
  requiredDocumentId: number;
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

interface DocumentUploadProps {
  requestNo: string | null;
  memberId: string;
  requestStatus: string;
  requestType:
    | "retirement-requests"
    | "grade5-requests"
    | "termination-requests"
    | "member-death-records";
  readOnly?: boolean;
}

//Validates the selected file before upload.
const validateSelectedFile = (file: File | null) => {
  if (!file) {
    return "Please select a file.";
  }

  return "";
};

export default function DocumentUpload({
  requestNo,
  memberId,
  requestStatus,
  requestType,
  readOnly = false,
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const [uploading, setUploading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);

  const isSubmitted = SUBMITTED_STATUSES.includes(requestStatus);
  const isReadOnly = readOnly || isSubmitted;
  const canUpload = !!requestNo && !isReadOnly && !uploading;

  const isDocumentTypeUploaded = (documentId: number) => {
    return uploadedDocuments.some(
      (file) => file.requiredDocumentId === documentId
    );
  };


  // Loads required documents and uploaded documents when request details change.
  useEffect(() => {
    if (!requestType || !memberId) return;

    fetchRequiredDocuments();

    if (requestNo) {
      fetchUploadedDocuments();
    } else {
      setUploadedDocuments([]);
    }
  }, [requestNo, requestType, memberId]);


  // Fetches the list of documents required for this request type.
  const fetchRequiredDocuments = async () => {
    try {
      const url = requestNo
        ? `/api/${requestType}/${requestNo}/required-documents?memberId=${encodeURIComponent(memberId)}`
        : `/api/${requestType}/required-documents-preview?memberId=${encodeURIComponent(memberId)}`;

      const { data } = await apiClient.get<RequiredDocument[]>(url);
      setRequiredDocuments(data);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load required documents.");
    }
  };


  //Fetches already uploaded documents for the current request.
  const fetchUploadedDocuments = async () => {
    if (!requestNo) {
      setUploadedDocuments([]);
      return;
    }

    try {
      const { data } = await apiClient.get<UploadedDocument[]>(
        `/api/${requestType}/${requestNo}/uploaded-documents`
      );
      setUploadedDocuments(data);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load uploaded documents.");
    }
  };

  //handle add button
  const handleAddClick = () => {
    setMessage("");

    if (!requestNo) {
      setMessage("Please save request before uploading documents.");
      return;
    }

    if (isReadOnly) {
      setMessage("Cannot upload documents while request is read-only.");
      return;
    }

    if (!selectedDocumentId) {
      setMessage("Please select a required document type.");
      return;
    }

    if (isDocumentTypeUploaded(selectedDocumentId)) {
      setMessage("Only one file is allowed for this document type. Delete the existing file first.");
      return;
    }

    fileInputRef.current?.click();
  };

  //Handle Document Uploaded part
  const handleUpload = async (file: File | null) => {
    setMessage("");

    if (!requestNo) {
      setMessage("Please save request before uploading documents.");
      return;
    }

    if (isReadOnly) {
      setMessage("Cannot upload documents while request is read-only.");
      return;
    }

    if (!selectedDocumentId) {
      setMessage("Please select a required document type.");
      return;
    }

    const fileValidationMessage = validateSelectedFile(file);

    if (fileValidationMessage) {
      setMessage(fileValidationMessage);
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file as File);

      await apiClient.post(
        `/api/${requestType}/${requestNo}/documents/${selectedDocumentId}/upload`,
        formData
      );

      setSelectedDocumentId(null);
      setMessage("Document uploaded successfully.");

      await fetchRequiredDocuments();
      await fetchUploadedDocuments();
    } catch (error) {
      console.error(error);
      setMessage("Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  /**
   * Downloads an uploaded file.
   *
   * A plain <a href> cannot carry the Authorization header, and this endpoint
   * requires it, so the file is fetched as a blob and handed to the browser
   * through a temporary object URL instead.
   */
  const handleDownload = async (uploadedDocumentId: number, fileName: string) => {
    try {
      const { data } = await apiClient.get<Blob>(
        `/api/${requestType}/documents/${uploadedDocumentId}/download`,
        { responseType: "blob" }
      );

      const objectUrl = window.URL.createObjectURL(data);
      const link = window.document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error(error);
      setMessage("Failed to download document.");
    }
  };

  //Deletes a selected uploaded document.
  const handleDelete = async (uploadedDocumentId: number) => {
    setMessage("");

    if (isReadOnly) {
      setMessage("Cannot delete documents while request is read-only.");
      return;
    }

    try {
      setDeletingDocumentId(uploadedDocumentId);

      await apiClient.delete(
        `/api/${requestType}/documents/${uploadedDocumentId}/file`
      );

      setMessage("Document deleted successfully.");

      await fetchRequiredDocuments();
      await fetchUploadedDocuments();
    } catch (error) {
      console.error(error);
      setMessage("Failed to delete document.");
    } finally {
      setDeletingDocumentId(null);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <p
          className={`text-sm ${
            message.toLowerCase().includes("success")
              ? "text-green-600"
              : "text-red-500"
          }`}
        >
          {message}
        </p>
      )}

      <div className="border rounded-lg p-4 space-y-4">
        <p className="font-semibold">Upload Document</p>

        {!requestNo && (
          <p className="text-gray-500 text-sm">
            Save request before uploading documents.
          </p>
        )}

        {isReadOnly && (
          <p className="text-sm text-gray-500">
            Documents cannot be added or deleted while viewing this request.
          </p>
        )}

        <select
          value={selectedDocumentId ?? ""}
          disabled={isReadOnly}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null;
            setSelectedDocumentId(id);
          }}
          className="border rounded-md px-3 py-2 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select document type</option>

          {requiredDocuments.map((document) => {
            const alreadyUploaded = isDocumentTypeUploaded(document.id);

            return (
              <option
                key={document.id}
                value={document.id}
                disabled={alreadyUploaded}
              >
                {document.documentName}{" "}
                {document.mandatory ? "(Mandatory)" : "(Optional)"}
                {alreadyUploaded ? " - Already uploaded" : ""}
              </option>
            );
          })}
        </select>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          disabled={isReadOnly}
          onChange={async (e) => {
            const file = e.target.files?.[0] || null;
            await handleUpload(file);
            e.target.value = "";
          }}
        />

        <div className="flex justify-center">
          <Button
            type="button"
            onClick={handleAddClick}
            disabled={!canUpload}
            className="bg-[#953002] text-white hover:bg-[#672102] px-6 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Add"}
          </Button>
        </div>
      </div>

      <div>
        <p className="font-semibold mb-2">Uploaded Files</p>

        {uploadedDocuments.length === 0 ? (
          <p className="text-gray-500 text-sm">No uploaded files.</p>
        ) : (
          <table className="w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-2 border-b">Document</th>
                <th className="text-left px-4 py-2 border-b">File Name</th>
                <th className="text-left px-4 py-2 border-b">File Type</th>
                <th className="text-left px-4 py-2 border-b">Uploaded At</th>
                <th className="text-left px-4 py-2 border-b">Action</th>
              </tr>
            </thead>

            <tbody>
              {uploadedDocuments.map((file) => {
                const document = requiredDocuments.find(
                  (item) => item.id === file.requiredDocumentId
                );

                const isDeleting = deletingDocumentId === file.id;

                return (
                  <tr key={file.id}>
                    <td className="px-4 py-2 border-b">
                      {document?.documentName || "Unknown"}
                    </td>

                    <td className="px-4 py-2 border-b">
                      <button
                        type="button"
                        onClick={() => handleDownload(file.id, file.fileName)}
                        className="text-blue-600 hover:underline"
                      >
                        {file.fileName}
                      </button>
                    </td>

                    <td className="px-4 py-2 border-b">{file.fileType}</td>

                    <td className="px-4 py-2 border-b">{file.uploadedAt}</td>

                    <td className="px-4 py-2 border-b">
                      <Button
                        type="button"
                        onClick={() => handleDelete(file.id)}
                        disabled={isReadOnly || isDeleting}
                        className="bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
