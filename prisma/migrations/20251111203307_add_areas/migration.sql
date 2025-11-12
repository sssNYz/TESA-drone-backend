-- CreateEnum
CREATE TYPE "public"."AreaKind" AS ENUM ('FRIENDLY', 'ANAMY');

-- CreateTable
CREATE TABLE "public"."Area" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "public"."AreaKind" NOT NULL DEFAULT 'FRIENDLY',
    "points" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Area_kind_idx" ON "public"."Area"("kind");
