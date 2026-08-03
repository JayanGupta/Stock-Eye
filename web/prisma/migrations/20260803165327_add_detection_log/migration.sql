-- CreateTable
CREATE TABLE "DetectionLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "imageName" TEXT NOT NULL,
    "totalObjects" INTEGER NOT NULL DEFAULT 0,
    "detections" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DetectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DetectionLog_organizationId_createdAt_idx" ON "DetectionLog"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "DetectionLog" ADD CONSTRAINT "DetectionLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
