// src/services/drone-detections.ts
import { prisma } from "../db/prisma.js";
import type { DroneDetection } from "../schemas/drone-detection.js";

export async function saveDroneDetection(d: DroneDetection, rawId?: bigint) {
  const rec = await (prisma as any).droneDetection.create({
    data: {
      deviceTs: d.timestamp,
      droneId: d.drone_id,
      latDeg: d.latitude,
      lonDeg: d.longitude,
      altM: d.altitude_m,
      speedMps: d.speed_mps,
      radiusM: d.radius_m ?? null,
      angleDeg: d.angle_deg ?? null,
      rawId: rawId ?? null,
    },
    select: { id: true }
  });
  return rec.id;
}

// save one detection that came from a frame (new format)
// A2 note: this uses new fields like bbox, confidence
export async function saveDroneDetectionFromFrame(obj: {
  droneId: string;
  deviceTs: Date;
  lat: number;
  lon: number;
  altM: number;
  speedMps: number;
  sourceId: string;
  type?: string;
  confidence?: number;
  bbox?: [number, number, number, number];
  frameId?: bigint;
  rawId?: bigint;
}) {
  const rec = await (prisma as any).droneDetection.create({
    data: {
      deviceTs: obj.deviceTs,
      droneId: obj.droneId,
      latDeg: obj.lat,
      lonDeg: obj.lon,
      altM: obj.altM,
      speedMps: obj.speedMps,
      sourceId: obj.sourceId,
      type: obj.type ?? null,
      confidence: obj.confidence ?? null,
      bboxX: obj.bbox ? obj.bbox[0] : null,
      bboxY: obj.bbox ? obj.bbox[1] : null,
      bboxW: obj.bbox ? obj.bbox[2] : null,
      bboxH: obj.bbox ? obj.bbox[3] : null,
      frameId: obj.frameId ?? null,
      rawId: obj.rawId ?? null,
    },
    select: { id: true }
  });
  return rec.id;
}

export function getLatestDroneDetection(droneId?: string) {
  return prisma.droneDetection.findFirst({
    ...(droneId ? { where: { droneId } } : {}),
    orderBy: { id: "desc" },
  });
}

export function listDetections(droneId: string, limit = 100) {
  return prisma.droneDetection.findMany({
    where: { droneId },
    orderBy: { deviceTs: "desc" },
    take: limit,
  });
}