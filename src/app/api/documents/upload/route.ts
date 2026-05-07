import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
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
    const applicationIdRaw = formData.get("applicationId");
    const documentType = String(formData.get("documentType") || "").trim();
    const file = formData.get("file");

    if (!applicationIdRaw || !documentType || !(file instanceof File)) {
      return NextResponse.json(
        { message: "applicationId, documentType and file are required" },
        { status: 400 }
      );
    }

    const applicationId = Number(applicationIdRaw);
    if (!Number.isFinite(applicationId) || applicationId <= 0) {
      return NextResponse.json(
        { message: "Invalid applicationId" },
        { status: 400 }
      );
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    if (inputBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { message: "File is too large. Max size is 10MB." },
        { status: 413 }
      );
    }

    const processed = await processBuffer(file, inputBuffer);

    const backendBaseUrl =
      process.env.BACKEND_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:8080";

    const uploadFormData = new FormData();
    const blob = new Blob([new Uint8Array(processed.buffer)], { type: processed.processedFileType });
    uploadFormData.append("file", blob, processed.processedFileName);

    const uploadResponse = await fetch(`${backendBaseUrl}/api/file/upload`, {
      method: "POST",
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file to S3: ${uploadResponse.statusText}`);
    }

    const s3FileName = await uploadResponse.text();

    const metadataResponse = await fetch(`${backendBaseUrl}/api/documents/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        applicationId,
        documentType,
        fileName: processed.processedFileName,
        fileType: processed.processedFileType,
        storagePath: s3FileName,
        fileSize: processed.buffer.byteLength,
      }),
    });

    if (!metadataResponse.ok) {
      const errText = await metadataResponse.text();
      return NextResponse.json(
        {
          message: `Failed to save document metadata: ${errText || metadataResponse.statusText}`,
        },
        { status: 502 }
      );
    }

    const metadata = await metadataResponse.json();

    return NextResponse.json({
      ...metadata,
      storagePath: s3FileName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
