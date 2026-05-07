import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;

    // Reconstruct relative path and resolve against project root
    const relPath = segments.join("/");
    const absolutePath = path.join(process.cwd(), relPath);

    // Security: ensure the resolved path is still inside the uploads/ directory
    const uploadsRoot = path.join(process.cwd(), "uploads");
    if (!absolutePath.startsWith(uploadsRoot)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const buffer = await fs.readFile(absolutePath);

    // Infer content type from extension
    const ext = path.extname(absolutePath).toLowerCase();
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
