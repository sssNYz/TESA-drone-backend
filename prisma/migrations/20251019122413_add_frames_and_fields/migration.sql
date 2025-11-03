-- AlterTable
ALTER TABLE "public"."DroneDetection" ADD COLUMN     "bboxH" INTEGER,
ADD COLUMN     "bboxW" INTEGER,
ADD COLUMN     "bboxX" INTEGER,
ADD COLUMN     "bboxY" INTEGER,
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "frameId" BIGINT,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "type" TEXT;

-- CreateTable
CREATE TABLE "public"."Frame" (
    "id" BIGSERIAL NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "frameNo" INTEGER NOT NULL,
    "deviceTs" TIMESTAMP(3) NOT NULL,
    "sourceId" TEXT NOT NULL,
    "imageBase64" TEXT,
    "objectsCount" INTEGER NOT NULL,

    CONSTRAINT "Frame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Frame_deviceTs_idx" ON "public"."Frame"("deviceTs");

-- CreateIndex
CREATE INDEX "Frame_sourceId_deviceTs_idx" ON "public"."Frame"("sourceId", "deviceTs");

-- CreateIndex
CREATE INDEX "DroneDetection_frameId_idx" ON "public"."DroneDetection"("frameId");

-- AddForeignKey
ALTER TABLE "public"."DroneDetection" ADD CONSTRAINT "DroneDetection_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "public"."Frame"("id") ON DELETE SET NULL ON UPDATE CASCADE;
