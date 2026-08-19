import { NextResponse } from "next/server";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function processBuffer(file: File, inputBuffer: Buffer) {
  const contentType = file.type || "application/octet-stream";
  const originalName = sanitizeFileName(file.name || "document");

  if (contentType.startsWith("image/")) {
    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const baseName = originalName.replace(/\.[^.]+$/, "") || "image";
    return {
      buffer: outputBuffer,
      processedFileName: `${baseName}.jpg`,
      processedFileType: "image/jpeg",
    };
  }

  if (contentType === "application/pdf") {
    const sourcePdf = await PDFDocument.load(inputBuffer);
    sourcePdf.setProducer("MemberConnect Document Pipeline");
    sourcePdf.setCreator("MemberConnect");
    const outputBytes = await sourcePdf.save();

    const baseName = originalName.endsWith(".pdf")
      ? originalName
      : `${originalName}.pdf`;

    return {
      buffer: Buffer.from(outputBytes),
      processedFileName: baseName,
      processedFileType: "application/pdf",
    };
  }

  return {
    buffer: inputBuffer,
    processedFileName: originalName,
    processedFileType: contentType,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const editId = formData.get("editId");
    const memberId = formData.get("memberId");
    const dob = formData.get("dob");
    const nic = formData.get("nic");
    const gender = formData.get("gender");
    const address = formData.get("address");
    const privateTelephone = formData.get("privateTelephone");
    const mobile = formData.get("mobile");
    const email = formData.get("email");
    const language = formData.get("language");
    const designation = formData.get("designation");
    const occupation = formData.get("occupation");
    const status = formData.get("status");
    const submissionLocation = formData.get("submissionLocation");
    const documentStoragePath = formData.get("documentStoragePath");
    const file = formData.get("file");

    const backendBaseUrl =
      process.env.BACKEND_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:8080";

    const requestPayload: Record<string, any> = {
      memberId: memberId ? String(memberId) : null,
      newBirthDate: dob ? String(dob) : null,
      newNIC: nic ? String(nic) : null,
      newGender: gender ? String(gender) : null,
      newPreferredLanguage: language ? String(language) : null,
      newPermanentPrivateAddress: address ? String(address) : null,
      newPrivateTelephone: privateTelephone ? String(privateTelephone) : null,
      newMobileNumber: mobile ? String(mobile) : null,
      newEmailAddress: email ? String(email) : null,
      newDesignation: designation ? String(designation) : null,
      newNatureOfOccupation: occupation ? String(occupation) : null,
      status: status ? String(status) : null,
      submissionLocation: submissionLocation ? String(submissionLocation) : null,
      documentStoragePath: documentStoragePath ? String(documentStoragePath) : null,
    };

    const backendFormData = new FormData();

    if (file instanceof File) {
      const inputBuffer = Buffer.from(await file.arrayBuffer());
      if (inputBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { message: "File is too large. Max size is 10MB." },
          { status: 413 }
        );
      }

      const processed = await processBuffer(file, inputBuffer);
      const blob = new Blob([new Uint8Array(processed.buffer)], { type: processed.processedFileType });
      
      backendFormData.append("file", blob, processed.processedFileName);
      
      requestPayload.documentType = "SUPPORTING_DOC";
      requestPayload.documentFileName = processed.processedFileName;
      requestPayload.documentFileType = processed.processedFileType;
      requestPayload.documentFileSize = processed.buffer.byteLength;
    }

    const requestDtoJson = JSON.stringify(requestPayload);
    backendFormData.append(
      "request",
      new Blob([requestDtoJson], { type: "application/json" })
    );

    const isEditMode = !!editId;
    const url = isEditMode
      ? `${backendBaseUrl}/api/v2/updateRequestWithDocument/${editId}`
      : `${backendBaseUrl}/api/v2/saveRequestWithDocument`;

    // Every backend route except the public ones requires a bearer token. This handler
    // called the backend with no Authorization header at all, so the save was rejected
    // with 401 before it ever reached the service.
    const authHeader = request.headers.get("Authorization");

    const response = await fetch(url, {
      method: isEditMode ? "PUT" : "POST",
      headers: authHeader ? { Authorization: authHeader } : undefined,
      body: backendFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { message: `Failed to save request: ${errText || response.statusText}` },
        { status: response.status }
      );
    }

    let responseData: any;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = { message: text };
      }
    }
    return NextResponse.json(responseData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
