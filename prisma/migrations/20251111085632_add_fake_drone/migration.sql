-- CreateTable
CREATE TABLE "public"."Drone" (
    "id" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLat" DOUBLE PRECISION NOT NULL,
    "lastLon" DOUBLE PRECISION NOT NULL,
    "lastAltM" DOUBLE PRECISION NOT NULL,
    "lastSpeedMS" DOUBLE PRECISION NOT NULL,
    "lastHeadingDeg" DOUBLE PRECISION NOT NULL,
    "batteryPct" DOUBLE PRECISION NOT NULL,
    "signalOk" BOOLEAN NOT NULL,
    "signalLossProb" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DroneReading" (
    "id" TEXT NOT NULL,
    "droneId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "altM" DOUBLE PRECISION NOT NULL,
    "speedMS" DOUBLE PRECISION NOT NULL,
    "headingDeg" DOUBLE PRECISION NOT NULL,
    "batteryPct" DOUBLE PRECISION NOT NULL,
    "signalOk" BOOLEAN NOT NULL,
    "signalLossProb" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DroneReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DroneReading_droneId_ts_idx" ON "public"."DroneReading"("droneId", "ts" DESC);

-- CreateIndex
CREATE INDEX "DroneReading_ts_idx" ON "public"."DroneReading"("ts");

-- AddForeignKey
ALTER TABLE "public"."DroneReading" ADD CONSTRAINT "DroneReading_droneId_fkey" FOREIGN KEY ("droneId") REFERENCES "public"."Drone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
