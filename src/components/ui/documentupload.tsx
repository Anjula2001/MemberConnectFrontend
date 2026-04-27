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
}

export default function DocumentUpload({
  requestId,
  memberId,
  requestStatus
}: DocumentUploadProps) {

  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const isSubmitted = requestStatus === "SUBMITTED_FOR_APPROVAL";

  useEffect(() => {
    fetchRequiredDocuments();
    fetchUploadedDocuments();
  }, [requestId]);

  const fetchRequiredDocuments = async () => {
    try {
      const url = requestId
        ? `${API_BASE_URL}/api/retirement-requests/${requestId}/required-documents?memberId=${memberId}`
        : `${API_BASE_URL}/api/retirement-requests/required-documents-preview?memberId=${memberId}`;

      const res = await fetch(url);

      if (!res.ok) {
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
        `${API_BASE_URL}/api/retirement-requests/${requestId}/uploaded-documents`
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
      setMessage("Please save retirement request before uploading documents.");
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
        `${API_BASE_URL}/api/retirement-requests/${requestId}/documents/${selectedDocumentId}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        setMessage(errorData.message || "Failed to upload document.");
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
        `${API_BASE_URL}/api/retirement-requests/documents/${uploadedDocumentId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        setMessage(errorData.message || "Failed to delete document.");
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

  const fetchUploadedDocumentsBySelectedDocument = async (
    requiredDocumentId: number
  ) => {
    if (!requestId) {
      setUploadedDocuments([]);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/retirement-requests/${requestId}/documents/${requiredDocumentId}/uploaded`
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

  return (
    <div className="space-y-6">
      {message && (
        <p className="text-sm text-red-500">
          {message}
        </p>
      )}

      <div>
        <p className="font-semibold mb-2">Required Documents</p>

        {requiredDocuments.length === 0 ? (
          <p className="text-gray-500 text-sm">No required documents configured.</p>
        ) : (
          <table className="w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-2 border-b">Document</th>
                <th className="text-left px-4 py-2 border-b">Mandatory</th>
                <th className="text-left px-4 py-2 border-b">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {requiredDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-4 py-2 border-b">
                    {doc.documentName}
                  </td>
                  <td className="px-4 py-2 border-b">
                    {doc.mandatory ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-2 border-b">
                    {doc.uploaded ? "Uploaded" : "Not Uploaded"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {requestId ? (
        <div className="border rounded-lg p-4 space-y-4">
          <p className="font-semibold">Upload Document</p>

          <select
            value={selectedDocumentId ?? ""}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              setSelectedDocumentId(id);

              if (id && requestId) {
                fetchUploadedDocumentsBySelectedDocument(id);
              } else {
                setUploadedDocuments([]);
              }
            }}
            className="border rounded-md px-3 py-2 w-full"
          >
            <option value="">Select document type</option>

            {requiredDocuments.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.documentName} {doc.mandatory ? "*" : ""}
              </option>
            ))}
          </select>

          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="border rounded-md px-3 py-2 w-full"
          />

          <Button
            type="button"
            onClick={handleUpload}
            className="bg-[#953002] text-white hover:bg-[#672102]"
          >
            Add
          </Button>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">
          Save retirement request before uploading documents.
        </p>
      )}

      {isSubmitted && (
        <p className="text-sm text-gray-500">
          Documents cannot be added or deleted after submission.
        </p>
      )}

      <div>
        <p className="font-semibold mb-2">Uploaded Files</p>

        {uploadedDocuments.length === 0 ? (
          <p className="text-gray-500 text-sm">No uploaded files.</p>
        ) : (
          <table className="w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-2 border-b">File Name</th>
                <th className="text-left px-4 py-2 border-b">File Type</th>
                <th className="text-left px-4 py-2 border-b">Uploaded At</th>
                {!isSubmitted && (
                  <th className="text-left px-4 py-2 border-b">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {uploadedDocuments.map((file) => (
                <tr key={file.id}>
                  <td className="px-4 py-2 border-b">
                    <a
                      href={`${API_BASE_URL}/api/retirement-requests/documents/${file.id}/download`}
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}