import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mlFetch, MLServiceError } from "@/lib/ml";
import { requireRole } from "@/lib/auth-utils";
import { MANAGER } from "@/lib/roles";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { organizationId } = await requireRole(MANAGER);

  let body: { imageBase64?: string; filterClasses?: string; imageName?: string; persist?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.imageBase64) {
    return NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
  }

  let result: Record<string, unknown>;
  try {
    result = await mlFetch("/api/detect/frame", {
      method: "POST",
      body: JSON.stringify({
        image_base64: body.imageBase64,
        filter_classes: body.filterClasses ?? null,
        include_annotated: true,
      }),
    });
  } catch (err) {
    const message = err instanceof MLServiceError ? err.message : "Detection failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  if (body.persist) {
    await db.detectionLog.create({
      data: {
        organizationId,
        imageName: body.imageName ?? "upload.jpg",
        totalObjects: Number(result.total_objects ?? 0),
        detections: (result.detections as unknown[]) ?? [],
      },
    });
  }

  return NextResponse.json(result);
}
