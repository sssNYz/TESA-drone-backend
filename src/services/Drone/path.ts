// src/services/Drone/path.ts
import { prisma } from "../../db/prisma.js";

export interface DronePathPoint {
  id: string;
  ts: string;
  lat: number;
  lon: number;
  alt_m: number | null;
  speed_mps: number | null;
}

export interface DronePath {
  droneId: string;
  points: DronePathPoint[];
}

export interface GetDronePathParams {
  droneIds: string[];
  start: Date;
  end: Date;
}

export interface DronePathResult {
  range: { start: string; end: string };
  drones: DronePath[];
}

export async function getDronePaths(params: GetDronePathParams): Promise<DronePathResult> {
  const uniqueDroneIds = Array.from(new Set(params.droneIds.filter(Boolean)));
  if (!uniqueDroneIds.length) {
    return {
      range: { start: params.start.toISOString(), end: params.end.toISOString() },
      drones: [],
    };
  }
  if (params.start > params.end) {
    throw new Error("start must be earlier than end");
  }

  const rows = await prisma.droneDetection.findMany({
    where: {
      droneId: { in: uniqueDroneIds },
      deviceTs: {
        gte: params.start,
        lte: params.end,
      },
    },
    orderBy: [
      { droneId: "asc" },
      { deviceTs: "asc" },
    ],
    select: {
      id: true,
      droneId: true,
      deviceTs: true,
      latDeg: true,
      lonDeg: true,
      altM: true,
      speedMps: true,
    },
  });

  const grouped = new Map<string, DronePathPoint[]>();
  for (const row of rows) {
    const points = grouped.get(row.droneId) ?? [];
    points.push({
      id: row.id.toString?.() ?? String(row.id),
      ts: row.deviceTs.toISOString(),
      lat: row.latDeg,
      lon: row.lonDeg,
      alt_m: row.altM ?? null,
      speed_mps: row.speedMps ?? null,
    });
    grouped.set(row.droneId, points);
  }

  const drones: DronePath[] = uniqueDroneIds.map((droneId) => ({
    droneId,
    points: grouped.get(droneId) ?? [],
  }));

  return {
    range: { start: params.start.toISOString(), end: params.end.toISOString() },
    drones,
  };
}
