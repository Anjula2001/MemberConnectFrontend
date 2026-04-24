import { apiClient } from "@/lib/api/client";

export type DocumentType =
  | "NIC_COPY"
  | "APPOINTMENT_LETTER"
  | "PAYSLIP_COPY"
  | "BIRTH_CERTIFICATE"
  | "PROFILE_PHOTO";

export interface UploadDocumentRequestDTO {
  applicationId: number;
  documentType: DocumentType;
  fileName: string;
  fileType: string;
  storagePath?: string;
  fileSize?: number;
}

export interface UploadDocumentResponseDTO {
  id: number;
  documentId: string;
  applicationId: number;
  documentType: DocumentType;
  fileName: string;
  fileType: string;
  storagePath?: string;
  fileSize?: number;
  uploadedAt: string;
}

export interface DocumentSummaryDTO {
  mandatoryDocumentCount: number;
  uploadedMandatoryDocumentCount: number;
  totalUploadedDocumentCount: number;
}

const BASE_PATH = "/api/documents";

export async function uploadDocumentMetadata(payload: UploadDocumentRequestDTO) {
  const { data } = await apiClient.post<UploadDocumentResponseDTO>(
    `${BASE_PATH}/upload`,
    payload
  );
  return data;
}

export async function uploadDocumentFile(payload: {
  applicationId: number;
  documentType: DocumentType;
  file: File;
}) {
  const formData = new FormData();
  formData.append("applicationId", String(payload.applicationId));
  formData.append("documentType", payload.documentType);
  formData.append("file", payload.file);

  const response = await fetch("/api/documents/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message ?? "Failed to upload document");
  }

  return data as UploadDocumentResponseDTO;
}

export async function getDocumentSummary(applicationId: number) {
  const { data } = await apiClient.get<DocumentSummaryDTO>(
    `${BASE_PATH}/summary/${applicationId}`
  );
  return data;
}

export async function getDocumentsByApplication(applicationId: number) {
  const { data } = await apiClient.get<UploadDocumentResponseDTO[]>(
    `${BASE_PATH}/application/${applicationId}`
  );
  return data;
}
