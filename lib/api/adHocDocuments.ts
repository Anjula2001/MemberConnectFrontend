import { apiClient } from "@/lib/api/client";

/**
 * Ad-hoc documents on a Member Profile (Requirement 05, MMD09).
 *
 * Distinct from lib/api/documents.ts, which handles documents belonging to a request or
 * an application. These belong to the member directly - the papers a District Office
 * receives with no process to file them against.
 *
 * There is no delete: MMD09 permits removing only files staged before Save, and those
 * never leave the browser.
 */

export interface AdHocDocumentDTO {
  id: number;
  memberId: string;
  fileName: string;
  fileType: string | null;
  uploadedAt: string;
  uploadedBy: string | null;
}

/** The document type these are filed under, and the label the profile shows. */
export const AD_HOC_DOCUMENT_TYPE = "AD_HOC_DOCUMENTS";
export const AD_HOC_DISPLAY_NAME = "Ad-hoc Documents";

const basePath = (memberId: string) =>
  `/api/members/${encodeURIComponent(memberId)}/adhoc-documents`;

/** Oldest first, so callers can read the first-upload date off the head of the list. */
export async function getAdHocDocuments(memberId: string) {
  const { data } = await apiClient.get<AdHocDocumentDTO[]>(basePath(memberId));
  return data;
}

/**
 * Uploads one file. The screen posts a staged batch one at a time on Save, so a failure
 * partway through keeps what already succeeded rather than losing every file.
 */
export async function uploadAdHocDocument(memberId: string, file: File) {
  const form = new FormData();
  form.append("file", file);

  const { data } = await apiClient.post<AdHocDocumentDTO>(basePath(memberId), form);
  return data;
}

/**
 * Fetches a saved document as a blob so the click-to-download works through the
 * authenticated client - a bare href would reach the endpoint without the JWT.
 */
export async function downloadAdHocDocument(memberId: string, documentId: number) {
  const { data } = await apiClient.get<Blob>(
    `${basePath(memberId)}/${documentId}/download`,
    { responseType: "blob" }
  );
  return data;
}
