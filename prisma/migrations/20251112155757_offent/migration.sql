-- AlterTable
ALTER TABLE "public"."DroneReading" ALTER COLUMN "tripId" DROP NOT NULL,
ALTER COLUMN "tripId" DROP DEFAULT;

-- Clean up legacy sentinel values before adding the FK
UPDATE "public"."DroneReading" SET "tripId" = NULL WHERE "tripId" = 0;

-- CreateTable
CREATE TABLE "public"."Trip" (
    "id" BIGSERIAL NOT NULL,
    "droneId" TEXT NOT NULL,
    "waypoints" JSONB NOT NULL,
    "speedMS" DOUBLE PRECISION NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedSeconds" INTEGER NOT NULL,
    "estimatedEndAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trip_droneId_startsAt_idx" ON "public"."Trip"("droneId", "startsAt");

-- AddForeignKey
ALTER TABLE "public"."DroneReading" ADD CONSTRAINT "DroneReading_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trip" ADD CONSTRAINT "Trip_droneId_fkey" FOREIGN KEY ("droneId") REFERENCES "public"."Drone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
