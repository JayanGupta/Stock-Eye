import { db } from "@/lib/db";

export async function getDetectionLogs(organizationId: string, limit = 20) {
  return db.detectionLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      imageName: true,
      totalObjects: true,
      createdAt: true,
    },
  });
}
