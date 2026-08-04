import { NextResponse } from "next/server";
import { mlFetch, MLServiceError } from "@/lib/ml";
import { requireRole } from "@/lib/auth-utils";
import { VIEWER } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET() {
  const { organizationId } = await requireRole(VIEWER);

  try {
    const [items, meta] = await Promise.all([
      mlFetch(`/api/forecast?org=${encodeURIComponent(organizationId)}&limit=300`),
      mlFetch(`/api/forecast/meta?org=${encodeURIComponent(organizationId)}`),
    ]);
    return NextResponse.json({ items, meta });
  } catch (err) {
    const message =
      err instanceof MLServiceError ? err.message : "Forecast failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
