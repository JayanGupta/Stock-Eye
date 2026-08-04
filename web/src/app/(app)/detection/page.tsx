import { requireRole } from "@/lib/auth-utils";
import { VIEWER } from "@/lib/roles";
import { db } from "@/lib/db";
import { DetectionClient } from "@/components/detection/detection-client";

export const dynamic = "force-dynamic";

export default async function DetectionPage() {
  const { organizationId } = await requireRole(VIEWER);

  const logs = await db.detectionLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      imageName: true,
      totalObjects: true,
      detections: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Realtime detection</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Count objects with YOLOv8 on a live camera feed or an uploaded image.
        </p>
      </div>
      <DetectionClient history={logs} />
    </div>
  );
}
