// src/routes/offensive-trips.ts
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { createTrip, listTrips, getTripDetail } from "../services/trips.js";

const waypointSchema = {
  type: "object",
  additionalProperties: false,
  required: ["lat", "lon"],
  properties: {
    lat: { type: "number" },
    lon: { type: "number" },
    alt_m: { type: "number" },
  },
} as const;

const postSingleBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["lat", "lon"],
  properties: {
    lat: { type: "number" },
    lon: { type: "number" },
    alt_m: { type: "number" },
    speed_m_s: { type: "number" },
  },
} as const;

const postBatchBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["waypoints"],
  properties: {
    waypoints: { type: "array", minItems: 1, items: waypointSchema },
    speed_m_s: { type: "number" },
  },
} as const;

const tripSummarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    droneId: { type: "string" },
    startsAt: { type: "string", format: "date-time" },
    estimatedEndAt: { type: "string", format: "date-time" },
    estimatedSeconds: { type: "integer" },
    waypointCount: { type: "integer" },
  },
  required: ["id", "droneId", "startsAt", "estimatedEndAt", "estimatedSeconds", "waypointCount"],
} as const;

const tripDetailSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    droneId: { type: "string" },
    waypoints: { type: "array", items: waypointSchema },
    actualPath: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          ts: { type: "string", format: "date-time" },
          lat: { type: "number" },
          lon: { type: "number" },
        },
        required: ["ts", "lat", "lon"],
      },
    },
    startsAt: { type: "string", format: "date-time" },
    estimatedEndAt: { type: "string", format: "date-time" },
    estimatedSeconds: { type: "integer" },
  },
  required: ["id", "droneId", "waypoints", "actualPath", "startsAt", "estimatedEndAt", "estimatedSeconds"],
} as const;

export default async function offensiveTripRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // POST /api/drones/:id/move (single waypoint -> create Trip)
  app.post("/api/drones/:id/move", {
    schema: {
      tags: ["OFFENSIVE"],
      summary: "Create a trip (single waypoint). Also tags future readings with the trip.",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      body: postSingleBodySchema,
      response: { 200: tripDetailSchema },
    },
  }, async (req) => {
    const droneId = (req.params as any).id as string;
    const b = (req.body as any) ?? {};
    const detail = await createTrip(droneId, [{ lat: b.lat, lon: b.lon, alt_m: b.alt_m }], {
      speedMS: b.speed_m_s,
      useCurrentAsStart: true,
    });
    return detail;
  });

  // POST /api/drones/:id/move/batch (waypoints array -> create Trip)
  app.post("/api/drones/:id/move/batch", {
    schema: {
      tags: ["OFFENSIVE"],
      summary: "Create a trip (batch waypoints). Also tags future readings with the trip.",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      body: postBatchBodySchema,
      response: { 200: tripDetailSchema },
    },
  }, async (req) => {
    const droneId = (req.params as any).id as string;
    const b = (req.body as any) ?? {};
    const waypoints = (Array.isArray(b?.waypoints) ? b.waypoints : []) as any[];
    const detail = await createTrip(droneId, waypoints, { speedMS: b.speed_m_s });
    return detail;
  });

  // GET /api/trips (list all trips)
  app.get("/api/trips", {
    schema: {
      tags: ["OFFENSIVE"],
      summary: "List all trips.",
      response: { 200: { type: "array", items: tripSummarySchema } },
    },
  }, async () => {
    const trips = await listTrips();
    return trips;
  });

  // GET /api/trips/:id (trip detail)
  app.get("/api/trips/:id", {
    schema: {
      tags: ["OFFENSIVE"],
      summary: "Get trip detail: 1) droneId 2) waypoints 3) actual path (lat/lon) 4) time.",
      params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      response: {
        200: tripDetailSchema,
        404: { type: "object", properties: { error: { type: "string" } } },
      },
    },
  }, async (req, reply) => {
    const id = (req.params as any).id as string;
    const detail = await getTripDetail(id);
    if (!detail) return reply.status(404).send({ error: "Trip not found" });
    return detail;
  });
}

