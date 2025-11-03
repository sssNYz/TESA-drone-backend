/*
  Warnings:

  - You are about to drop the `Detection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Frame` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Detection" DROP CONSTRAINT "Detection_frameId_fkey";

-- DropTable
DROP TABLE "public"."Detection";

-- DropTable
DROP TABLE "public"."Frame";

-- CreateTable
CREATE TABLE "public"."RawMessage" (
    "id" BIGSERIAL NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parseOk" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,

    CONSTRAINT "RawMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DroneDetection" (
    "id" BIGSERIAL NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceTs" TIMESTAMP(3) NOT NULL,
    "droneId" TEXT NOT NULL,
    "latDeg" DOUBLE PRECISION NOT NULL,
    "lonDeg" DOUBLE PRECISION NOT NULL,
    "altM" DOUBLE PRECISION NOT NULL,
    "speedMps" DOUBLE PRECISION NOT NULL,
    "radiusM" DOUBLE PRECISION,
    "angleDeg" DOUBLE PRECISION,
    "rawId" BIGINT,

    CONSTRAINT "DroneDetection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RawMessage_receivedAt_idx" ON "public"."RawMessage"("receivedAt");

-- CreateIndex
CREATE INDEX "DroneDetection_deviceTs_idx" ON "public"."DroneDetection"("deviceTs");

-- CreateIndex
CREATE INDEX "DroneDetection_droneId_deviceTs_idx" ON "public"."DroneDetection"("droneId", "deviceTs" DESC);
