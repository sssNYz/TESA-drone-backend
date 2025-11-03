// src/routes/drone.ts
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { getLatestDroneDetection, listDetections } from "../services/drone-detections.js";
import { getDronePaths } from "../services/Drone/path.js";
import { parseDronePathQuery, DronePathValidationError } from "../schemas/drone-path-query.js";

export default async function droneRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get("/drone/latest", async (req, reply) => {
    const { drone_id } = (req.query as any) ?? {};
    const r = await getLatestDroneDetection(drone_id);
    if (!r) return reply.send({});
    return reply.send({
      id: r.id.toString?.() ?? r.id,
      receivedAt: r.receivedAt,
      deviceTs: r.deviceTs,
      drone_id: r.droneId,
      latitude: r.latDeg,
      longitude: r.lonDeg,
      altitude_m: r.altM,
      speed_mps: r.speedMps,
      radius_m: r.radiusM,
      angle_deg: r.angleDeg,
      // new fields
      source_id: (r as any).sourceId ?? null,
      confidence: (r as any).confidence ?? null,
      bbox: [
        (r as any).bboxX ?? null,
        (r as any).bboxY ?? null,
        (r as any).bboxW ?? null,
        (r as any).bboxH ?? null,
      ],
      type: (r as any).type ?? null,
    });
  });

  app.get("/drone/history", async (req) => {
    const { drone_id, limit } = (req.query as any) ?? {};
    if (!drone_id) return { error: "drone_id required" };
    const rows = await listDetections(drone_id, Number(limit) || 100);
    return rows.map(r => ({
      id: r.id.toString?.() ?? r.id,
      ts: r.deviceTs,
      lat: r.latDeg, lon: r.lonDeg,
      alt_m: r.altM, speed_mps: r.speedMps,
    radius_m: r.radiusM, angle_deg: r.angleDeg,
    // new fields
    source_id: (r as any).sourceId ?? null,
    confidence: (r as any).confidence ?? null,
    bbox: [
      (r as any).bboxX ?? null,
      (r as any).bboxY ?? null,
      (r as any).bboxW ?? null,
      (r as any).bboxH ?? null,
    ],
    type: (r as any).type ?? null,
    }));
  });

  app.get("/drone/path", async (req, reply) => {
    try {
      const params = parseDronePathQuery(req.query);
      const data = await getDronePaths(params);
      return reply.send(data);
    } catch (err: unknown) {
      if (err instanceof DronePathValidationError) {
        return reply.status(400).send({ error: err.message, issues: err.issues ?? null });
      }
      console.error("Failed to fetch drone path", err);
      return reply.status(500).send({ error: "Failed to fetch drone path" });
    }
  });
}
