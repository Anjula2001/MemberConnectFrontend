"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";

const API_BASE_URL = "http://localhost:8080";

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
}

export default function DocumentUpload({
  requestId,
  memberId,
  requestStatus,
  requestType,
}: DocumentUploadProps) {
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const isSubmitted = requestStatus === "SUBMITTED_FOR_APPROVAL";
  const canUpload = !!requestId && !isSubmitted;

  useEffect(() => {
    if (!requestType || !memberId) return;

    fetchRequiredDocuments();

    if (requestId) {
      fetchUploadedDocuments();
    } else {
      setUploadedDocuments([]);
    }
  }, [requestId, requestType, memberId]);

  const fetchRequiredDocuments = async () => {
    try {
      const url = requestId
        ? `${API_BASE_URL}/api/${requestType}/${requestId}/required-documents?memberId=${memberId}`
        : `${API_BASE_URL}/api/${requestType}/required-documents-preview?memberId=${memberId}`;

      const res = await fetch(url);

      if (!res.ok) {
        const text = await res.text();
        console.error("Required documents API failed:", {
          url,
          status: res.status,
          body: text,
        });
        throw new Error("Failed to load required documents");
      }

      const data = await res.json();
      setRequiredDocuments(data);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load required documents.");
    }
  };

  const fetchUploadedDocuments = async () => {
    if (!requestId) {
      setUploadedDocuments([]);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/${requestType}/${requestId}/uploaded-documents`
      );

      if (!res.ok) {
        throw new Error("Failed to load uploaded documents");
      }

      const data = await res.json();
      setUploadedDocuments(data);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load uploaded documents.");
    }
  };

  const fetchUploadedDocumentsBySelectedDocument = async (
    requiredDocumentId: number
  ) => {
    if (!requestId) {
      setUploadedDocuments([]);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/${requestType}/${requestId}/documents/${requiredDocumentId}/uploaded`
      );

      if (!res.ok) {
        throw new Error("Failed to load uploaded documents");
      }

      const data = await res.json();
      setUploadedDocuments(data);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load uploaded documents.");
    }
  };

  const handleUpload = async () => {
    setMessage("");

    if (!requestId) {
      setMessage("Please save request before uploading documents.");
      return;
    }

    if (isSubmitted) {
      setMessage("Cannot upload documents after request is submitted.");
      return;
    }

    if (!selectedDocumentId) {
      setMessage("Please select a required document type.");
      return;
    }

    if (!selectedFile) {
      setMessage("Please select a file.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(
        `${API_BASE_URL}/api/${requestType}/${requestId}/documents/${selectedDocumentId}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const text = await res.text();
        setMessage(text || "Failed to upload document.");
        return;
      }

      setSelectedFile(null);
      setSelectedDocumentId(null);
      setMessage("Document uploaded successfully.");

      await fetchRequiredDocuments();
      await fetchUploadedDocuments();
    } catch (error) {
      console.error(error);
      setMessage("Failed to upload document.");
    }
  };

  const handleDelete = async (uploadedDocumentId: number) => {
    setMessage("");

    if (isSubmitted) {
      setMessage("Cannot delete documents after request is submitted.");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/${requestType}/documents/${uploadedDocumentId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const text = await res.text();
        setMessage(text || "Failed to delete document.");
        return;
      }

      setMessage("Document deleted successfully.");

      await fetchRequiredDocuments();
      await fetchUploadedDocuments();
    } catch (error) {
      console.error(error);
      setMessage("Failed to delete document.");
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <p className="text-sm text-red-500">
          {message}
        </p>
      )}
      
      <div className="border rounded-lg p-4 space-y-4">
        <p className="font-semibold">Upload Document</p>

        {!requestId && (
          <p className="text-gray-500 text-sm">
            Save request before uploading documents.
          </p>
        )}

        {isSubmitted && (
          <p className="text-sm text-gray-500">
            Documents cannot be added or deleted after submission.
          </p>
        )}

        <select
          value={selectedDocumentId ?? ""}
          disabled={isSubmitted}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null;
            setSelectedDocumentId(id);

            if (requestId) {
              fetchUploadedDocuments();
            }
          }}
          className="border rounded-md px-3 py-2 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select document type</option>

          {requiredDocuments.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.documentName} {doc.mandatory ? "(Mandatory)" : "(Optional)"}
            </option>
          ))}
        </select>

        <input
          type="file"
          disabled={!canUpload}
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          className="border rounded-md px-3 py-2 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
        />

        {selectedFile && (
          <p className="text-sm text-gray-600">
            Selected file: {selectedFile.name}
          </p>
        )}

        <div className="flex justify-center">
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!canUpload}
            className="bg-[#953002] text-white hover:bg-[#672102] px-6 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Add
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
                {!isSubmitted && (
                  <th className="text-left px-4 py-2 border-b">Action</th>
                )}
              </tr>
            </thead>

            <tbody>
              {uploadedDocuments.map((file) => {
                const doc = requiredDocuments.find(
                  (d) => d.id === file.requiredDocumentId
                );

                return (
                  <tr key={file.id}>
                    <td className="px-4 py-2 border-b">
                      {doc?.documentName || "Unknown"}
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

                    {!isSubmitted && (
                      <td className="px-4 py-2 border-b">
                        <Button
                          type="button"
                          onClick={() => handleDelete(file.id)}
                          className="bg-red-500 text-white hover:bg-red-600"
                        >
                          Delete
                        </Button>
                      </td>
                    )}
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