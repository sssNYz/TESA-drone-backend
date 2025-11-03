-- CreateTable
CREATE TABLE "public"."Frame" (
    "id" BIGSERIAL NOT NULL,
    "timestampUtc" TIMESTAMP(3) NOT NULL,
    "frameId" INTEGER NOT NULL,
    "camWidth" INTEGER NOT NULL,
    "camHeight" INTEGER NOT NULL,
    "focalPx" DOUBLE PRECISION NOT NULL,
    "principalCx" DOUBLE PRECISION NOT NULL,
    "principalCy" DOUBLE PRECISION NOT NULL,
    "yawDeg" DOUBLE PRECISION NOT NULL,
    "pitchDeg" DOUBLE PRECISION NOT NULL,
    "latDeg" DOUBLE PRECISION NOT NULL,
    "lonDeg" DOUBLE PRECISION NOT NULL,
    "altMmsl" DOUBLE PRECISION NOT NULL,
    "latencyMs" DOUBLE PRECISION NOT NULL,
    "detectorVer" TEXT NOT NULL,

    CONSTRAINT "Frame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Detection" (
    "id" BIGSERIAL NOT NULL,
    "frameId" BIGINT NOT NULL,
    "klass" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "x1" DOUBLE PRECISION NOT NULL,
    "y1" DOUBLE PRECISION NOT NULL,
    "x2" DOUBLE PRECISION NOT NULL,
    "y2" DOUBLE PRECISION NOT NULL,
    "cx" DOUBLE PRECISION NOT NULL,
    "cy" DOUBLE PRECISION NOT NULL,
    "w" DOUBLE PRECISION NOT NULL,
    "h" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Detection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Frame_timestampUtc_idx" ON "public"."Frame"("timestampUtc");

-- CreateIndex
CREATE INDEX "Detection_klass_confidence_idx" ON "public"."Detection"("klass", "confidence");

-- AddForeignKey
ALTER TABLE "public"."Detection" ADD CONSTRAINT "Detection_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "public"."Frame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
