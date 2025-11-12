// src/routes/drone.ts
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { getLatestDroneDetection, listDetections } from "../services/drone-detections.js";
import { getDronePaths } from "../services/Drone/path.js";
import { parseDronePathQuery, DronePathValidationError } from "../schemas/drone-path-query.js";

const bboxItemSchema = {
  anyOf: [{ type: "number" }, { type: "null" }],
};

const droneDetectionResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    receivedAt: { type: ["string", "null"], format: "date-time" },
    deviceTs: { type: ["string", "null"], format: "date-time" },
    drone_id: { type: ["string", "null"] },
    latitude: { type: ["number", "null"] },
    longitude: { type: ["number", "null"] },
    altitude_m: { type: ["number", "null"] },
    speed_mps: { type: ["number", "null"] },
    radius_m: { type: ["number", "null"] },
    angle_deg: { type: ["number", "null"] },
    source_id: { type: ["string", "null"] },
    confidence: { type: ["number", "null"] },
    bbox: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: bboxItemSchema,
    },
    type: { type: ["string", "null"] },
  },
};

const emptyObjectSchema = { type: "object", additionalProperties: false };

const droneLatestResponseSchema = {
  anyOf: [emptyObjectSchema, droneDetectionResponseSchema],
};

const detectionHistoryItemSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    ts: { type: ["string", "null"], format: "date-time" },
    lat: { type: ["number", "null"] },
    lon: { type: ["number", "null"] },
    alt_m: { type: ["number", "null"] },
    speed_mps: { type: ["number", "null"] },
    radius_m: { type: ["number", "null"] },
    angle_deg: { type: ["number", "null"] },
    source_id: { type: ["string", "null"] },
    confidence: { type: ["number", "null"] },
    bbox: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: bboxItemSchema,
    },
    type: { type: ["string", "null"] },
  },
};

const detectionHistoryResponseSchema = {
  type: "array",
  items: detectionHistoryItemSchema,
};

const errorResponseSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    error: { type: "string" },
    issues: {
      anyOf: [{ type: "array" }, { type: "object" }, { type: "null" }],
    },
  },
};

const dronePathQuerySchema = {
  type: "object",
  required: ["drone_ids", "start", "end"],
  properties: {
    drone_ids: {
      type: "string",
      description: "Comma-separated list of drone IDs.",
    },
    start: {
      type: "string",
      format: "date-time",
      description: "ISO timestamp for the inclusive start of the range.",
    },
    end: {
      type: "string",
      format: "date-time",
      description: "ISO timestamp for the inclusive end of the range.",
    },
  },
};

const dronePathResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    range: {
      type: "object",
      additionalProperties: false,
      properties: {
        start: { type: "string", format: "date-time" },
        end: { type: "string", format: "date-time" },
      },
    },
    drones: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          droneId: { type: "string" },
          points: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                ts: { type: "string", format: "date-time" },
                lat: { type: "number" },
                lon: { type: "number" },
                alt_m: { type: ["number", "null"] },
                speed_mps: { type: ["number", "null"] },
              },
            },
          },
        },
      },
    },
  },
};

export default async function droneRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get("/drone/latest", {
    schema: {
      tags: ["Drones"],
      summary: "Fetch the latest detection (optionally filtered by drone_id).",
      querystring: {
        type: "object",
        properties: {
          drone_id: {
            type: "string",
            description: "Optional drone identifier to filter on.",
          },
        },
      },
      response: {
        200: droneLatestResponseSchema,
      },
    },
  }, async (req, reply) => {
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

  app.get("/drone/history", {
    schema: {
      tags: ["Drones"],
      summary: "List historical detections for a single drone.",
      querystring: {
        type: "object",
        required: ["drone_id"],
        properties: {
          drone_id: {
            type: "string",
            description: "Drone identifier to fetch history for.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 1000,
            description: "Maximum number of rows to return (default 100).",
          },
        },
      },
      response: {
        200: detectionHistoryResponseSchema,
        400: errorResponseSchema,
      },
    },
  }, async (req, reply) => {
    const { drone_id, limit } = (req.query as any) ?? {};
    if (!drone_id) return reply.status(400).send({ error: "drone_id required" });
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

  app.get("/drone/path", {
    schema: {
      tags: ["Drones"],
      summary: "Retrieve path points for multiple drones over a time window.",
      querystring: dronePathQuerySchema,
      response: {
        200: dronePathResponseSchema,
        400: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
  }, async (req, reply) => {
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
