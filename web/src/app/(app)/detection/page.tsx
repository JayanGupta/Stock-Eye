import { requireOrgUser } from "@/lib/auth-utils";
import { getDetectionLogs } from "@/lib/queries/detection";
import { DetectionUploader } from "@/components/detection/detection-uploader";

export default async function DetectionPage() {
  const { organizationId } = await requireOrgUser();
  const logs = await getDetectionLogs(organizationId);

  const history = logs.map((log) => ({
    id: log.id,
    imageName: log.imageName,
    totalObjects: log.totalObjects,
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Detection</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Computer-vision inventory counting via YOLOv8. Upload an image to
          detect and count objects automatically.
        </p>
      </div>
      <DetectionUploader history={history} />
    </div>
  );
}
