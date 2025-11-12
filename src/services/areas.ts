// src/services/areas.ts
import type { Area, AreaKind, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import type { AreaPoint } from "../schemas/area.js";

export interface CreateAreaParams {
  name: string;
  points: AreaPoint[];
  kind: AreaKind;
}

export async function createArea(params: CreateAreaParams): Promise<Area> {
  return prisma.area.create({
    data: {
      name: params.name,
      kind: params.kind,
      points: normalizePoints(params.points),
    },
  });
}

export async function listAreas(kind?: AreaKind): Promise<Area[]> {
  return prisma.area.findMany({
    ...(kind ? { where: { kind } } : {}),
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteAreaById(id: string, kind?: AreaKind): Promise<boolean> {
  const result = await prisma.area.deleteMany({
    where: {
      id,
      ...(kind ? { kind } : {}),
    },
  });
  return result.count > 0;
}

function normalizePoints(points: AreaPoint[]): Prisma.InputJsonValue {
  return points.map((point) => ({
    lat: point.lat,
    lon: point.lon,
  }));
}
