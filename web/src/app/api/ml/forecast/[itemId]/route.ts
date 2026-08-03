import { NextResponse } from "next/server";
import { mlFetch, MLServiceError } from "@/lib/ml";
import { requireRole } from "@/lib/auth-utils";
import { VIEWER } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ itemId: string }> },
) {
  const { organizationId } = await requireRole(VIEWER);
  const { itemId } = await ctx.params;

  try {
    const result = await mlFetch(
      `/api/forecast/${encodeURIComponent(itemId)}?org=${encodeURIComponent(organizationId)}`,
    );
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof MLServiceError ? err.message : "Forecast failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
