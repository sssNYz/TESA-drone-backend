-- CreateTable
CREATE TABLE "public"."FrameBinary" (
    "id" BIGSERIAL NOT NULL,
    "frameId" BIGINT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameBinary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FrameBinary_frameId_idx" ON "public"."FrameBinary"("frameId");
CREATE INDEX "FrameBinary_createdAt_idx" ON "public"."FrameBinary"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."FrameBinary" ADD CONSTRAINT "FrameBinary_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "public"."Frame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

