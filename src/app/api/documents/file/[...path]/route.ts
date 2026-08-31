import { NextResponse } from "next/server";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;

    const s3Key = segments.join("/");

    const backendBaseUrl =
      process.env.BACKEND_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:8080";

    const authHeader = request.headers.get("Authorization");
    const headers: HeadersInit = authHeader ? { Authorization: authHeader } : {};

    // Backend authenticates and streams the file from S3.
    // Files are never publicly exposed; URLs never expire; access is controlled server-side.
    const response = await fetch(
      `${backendBaseUrl}/api/file/download?fileName=${encodeURIComponent(s3Key)}`,
      { headers }
    );

    if (!response.ok) {
      console.error(`[file] backend returned ${response.status} for: ${s3Key}`);
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }

    const buffer = await response.arrayBuffer();

    // Use Content-Type from the backend if set, otherwise infer from extension
    const backendContentType = response.headers.get("Content-Type");
    const ext = path.extname(s3Key).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
    };
    const contentType =
      backendContentType && !backendContentType.includes("octet-stream")
        ? backendContentType
        : (contentTypeMap[ext] ?? "application/octet-stream");

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": "inline",
      },
    });
  } catch (err) {
    console.error("[file] error:", err);
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }
}
