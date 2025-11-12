// src/routes/api-drones.ts
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { prisma } from "../db/prisma.js";
import { mqttClient } from "../mqtt/client.js";

const droneSummarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    lastSeenAt: { type: ["string", "null"], format: "date-time" },
    lastLat: { type: ["number", "null"] },
    lastLon: { type: ["number", "null"] },
    lastAltM: { type: ["number", "null"] },
    lastSpeedMS: { type: ["number", "null"] },
    lastHeadingDeg: { type: ["number", "null"] },
    batteryPct: { type: ["number", "null"] },
    signalOk: { type: ["boolean", "null"] },
    signalLossProb: { type: ["number", "null"] },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const droneSummaryListSchema = {
  type: "array",
  items: droneSummarySchema,
};

const droneHistoryRowSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    ts: { type: "string", format: "date-time" },
    lat: { type: ["number", "null"] },
    lon: { type: ["number", "null"] },
    altM: { type: ["number", "null"] },
    speedMS: { type: ["number", "null"] },
    headingDeg: { type: ["number", "null"] },
    batteryPct: { type: ["number", "null"] },
    signalOk: { type: ["boolean", "null"] },
    signalLossProb: { type: ["number", "null"] },
  },
};

const droneHistoryListSchema = {
  type: "array",
  items: droneHistoryRowSchema,
};

const commandBodySchema = {
  type: "object",
  required: ["lat", "lon"],
  properties: {
    lat: { type: "number" },
    lon: { type: "number" },
  },
};

const commandSuccessSchema = {
  type: "object",
  additionalProperties: false,
  properties: { ok: { type: "boolean", const: true } },
  required: ["ok"],
};

const commandErrorSchema = {
  type: "object",
  additionalProperties: false,
  properties: { error: { type: "string" } },
  required: ["error"],
};

export default async function apiDronesRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // GET /api/drones - list drones with last-known fields
  app.get("/api/drones", {
    schema: {
      tags: ["Drones"],
      summary: "List drones and their latest known telemetry.",
      response: {
        200: droneSummaryListSchema,
      },
    },
  }, async () => {
    const drones = await prisma.drone.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        lastSeenAt: true,
        lastLat: true,
        lastLon: true,
        lastAltM: true,
        lastSpeedMS: true,
        lastHeadingDeg: true,
        batteryPct: true,
        signalOk: true,
        signalLossProb: true,
        updatedAt: true,
      },
    });
    return drones;
  });

  // GET /api/drones/:id/history?limit=200 - recent readings
  app.get("/api/drones/:id/history", {
    schema: {
      tags: ["Drones"],
      summary: "Return recent readings for a drone.",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      querystring: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 1000,
            default: 200,
          },
        },
      },
      response: {
        200: droneHistoryListSchema,
      },
    },
  }, async (req) => {
    const id = (req.params as any)?.id as string;
    const limit = Number((req.query as any)?.limit ?? 200);
    const rows = await prisma.droneReading.findMany({
      where: { droneId: id },
      orderBy: { ts: "desc" },
      take: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 1000)) : 200,
      select: {
        id: true,
        ts: true,
        lat: true,
        lon: true,
        altM: true,
        speedMS: true,
        headingDeg: true,
        batteryPct: true,
        signalOk: true,
        signalLossProb: true,
      },
    });
    return rows;
  });

  // Optional: POST /api/drones/:id/move to publish a move command
  app.post("/api/drones/:id/move", {
    schema: {
      tags: ["Drones"],
      summary: "Publish a move command to the MQTT broker.",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      body: commandBodySchema,
      response: {
        200: commandSuccessSchema,
        400: commandErrorSchema,
      },
    },
  }, async (req, reply) => {
    const id = (req.params as any)?.id as string;
    const body = (req.body as any) ?? {};
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return reply.status(400).send({ error: "lat and lon required (numbers)" });
    }
    const topic = `army/${id}/move/lat/long`;
    const payload = { lat, lon };
    mqttClient.publish(topic, JSON.stringify(payload), { qos: 0 });
    return { ok: true };
  });
}

