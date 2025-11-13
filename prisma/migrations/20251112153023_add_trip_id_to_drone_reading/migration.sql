-- AlterTable
ALTER TABLE "public"."DroneReading" ADD COLUMN     "tripId" BIGINT NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "DroneReading_tripId_idx" ON "public"."DroneReading"("tripId");
