"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./button";

const API_BASE_URL = "http://localhost:8080";
const SUBMITTED_STATUSES = [
  "SUBMITTED_FOR_APPROVAL",
  "SUBMITTED_FOR_NORMAL_APPROVAL",
  "SUBMITTED_FOR_DEVIATION_APPROVAL",
  "ADDED_TO_APPROVAL_LIST",
  "ADDED_TO_SCHOLARSHIP_NORMAL_APPROVAL_LIST",
  "ADDED_TO_SCHOLARSHIP_DEVIATION_APPROVAL_LIST",
  "APPROVED",
  "REJECTED",
];
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png",];

interface RequiredDocument {
  id: number;
  documentName: string;
  mandatory: boolean;
  uploaded: boolean;
}

interface UploadedDocument {
  id: number;
  requestId: number;
  requiredDocumentId: number;
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

interface DocumentUploadProps {
  requestId: number | null;
  memberId: string;
  requestStatus: string;
  requestType: "retirement-requests" | "grade5-requests";
  readOnly?: boolean;
}

/**
 * Validates the selected file before upload.
 * This prevents unsupported file types and large files from being sent.
 */
const validateSelectedFile = (file: File | null) => {
  if (!file) {
    return "Please select a file.";
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return "Only PDF, JPG, and PNG files are allowed.";
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File size must be less than ${MAX_FILE_SIZE_MB}MB.`;
  }

  return "";
};

export default function DocumentUpload({
  requestId,
  memberId,
  requestStatus,
  requestType,
  readOnly = false,
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [requiredDocuments, setRequiredDocuments] = useState<
    RequiredDocument[]
  >([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<
    UploadedDocument[]
  >([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null
  );
  const [message, setMessage] = useState("");

  const [uploading, setUploading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(
    null
  );

  const isSubmitted = SUBMITTED_STATUSES.includes(requestStatus);
  const isReadOnly = readOnly || isSubmitted;
  const canUpload = !!requestId && !isReadOnly && !uploading;

  /**
   * Loads required documents and uploaded documents when request details change.
   * If the request is not saved yet, uploaded documents are cleared.
   */
  useEffect(() => {
    if (!requestType || !memberId) return;

    fetchRequiredDocuments();

    if (requestId) {
      fetchUploadedDocuments();
    } else {
      setUploadedDocuments([]);
    }
  }, [requestId, requestType, memberId]);

  /**
   * Fetches the list of documents required for this request type.
   * It supports both saved requests and preview mode before saving.
   */
  const fetchRequiredDocuments = async () => {
    try {
      const url = requestId
        ? `${API_BASE_URL}/api/${requestType}/${requestId}/required-documents?memberId=${memberId}`
        : `${API_BASE_URL}/api/${requestType}/required-documents-preview?memberId=${memberId}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Required documents API failed:", {
          url,
          status: response.status,
          body: errorText,
        });

        throw new Error("Failed to load required documents");
      }

      const documents: RequiredDocument[] = await response.json();
      setRequiredDocuments(documents);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load required documents.");
    }
  };

  /**
   * Fetches already uploaded documents for the current request.
   */
  const fetchUploadedDocuments = async () => {
    if (!requestId) {
      setUploadedDocuments([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/${requestType}/${requestId}/uploaded-documents`
      );

      if (!response.ok) {
        throw new Error("Failed to load uploaded documents");
      }

      const documents: UploadedDocument[] = await response.json();
      setUploadedDocuments(documents);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load uploaded documents.");
    }
  };

  /**
   * Uploads the selected document file after checking request status,
   * document type selection, and file validation.
   */
  const handleAddClick = () => {
    setMessage("");

    if (!requestId) {
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

    fileInputRef.current?.click();
  };

  const handleUpload = async (file: File | null) => {
    setMessage("");

    if (!requestId) {
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

      const response = await fetch(
        `${API_BASE_URL}/api/${requestType}/${requestId}/documents/${selectedDocumentId}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        setMessage(errorText || "Failed to upload document.");
        return;
      }

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
   * Deletes a selected uploaded document.
   * Deleting is blocked after the request is submitted.
   */
  const handleDelete = async (uploadedDocumentId: number) => {
    setMessage("");

    if (isReadOnly) {
      setMessage("Cannot delete documents while request is read-only.");
      return;
    }

    try {
      setDeletingDocumentId(uploadedDocumentId);

      const response = await fetch(
        `${API_BASE_URL}/api/${requestType}/documents/${uploadedDocumentId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        setMessage(errorText || "Failed to delete document.");
        return;
      }

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
      {message && <p className="text-sm text-red-500">{message}</p>}

      <div className="border rounded-lg p-4 space-y-4">
        <p className="font-semibold">Upload Document</p>

        {!requestId && (
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

          {requiredDocuments.map((document) => (
            <option key={document.id} value={document.id}>
              {document.documentName}{" "}
              {document.mandatory ? "(Mandatory)" : "(Optional)"}
            </option>
          ))}
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
                      <a
                        href={`${API_BASE_URL}/api/${requestType}/documents/${file.id}/download`}
                        className="text-blue-600 hover:underline"
                      >
                        {file.fileName}
                      </a>
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
