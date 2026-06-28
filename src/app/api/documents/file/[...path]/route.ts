import { NextResponse } from "next/server";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;

    const s3Key = segments.join("/");

    const backendBaseUrl =
      process.env.BACKEND_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:8080";

    const response = await fetch(`${backendBaseUrl}/api/file/download?fileName=${encodeURIComponent(s3Key)}`);

    if (!response.ok) {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }

    const buffer = await response.arrayBuffer();

    // Infer content type from extension
    const ext = path.extname(s3Key).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
    };
    const contentType = contentTypeMap[ext] ?? "application/octet-stream";

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }
}
