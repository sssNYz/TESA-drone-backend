import { prisma } from "../db/prisma.js";
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
const dronePathPointSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        ts: { type: "string", format: "date-time" },
        lat: { type: "number" },
        lon: { type: "number" },
        altM: { type: ["number", "null"] },
        speedMS: { type: ["number", "null"] },
        headingDeg: { type: ["number", "null"] },
    },
};
const dronePathResponseSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        droneId: { type: "string" },
        count: { type: "integer" },
        path: {
            type: "array",
            items: dronePathPointSchema,
        },
    },
};
const waypointSchema = {
    type: "object",
    additionalProperties: false,
    required: ["lat", "lon"],
    properties: {
        lat: { type: "number" },
        lon: { type: "number" },
        alt_m: { type: "number" },
    },
};
// Accept either a single waypoint body { lat, lon, alt_m? }
// or a batch body { waypoints: [ {lat,lon,alt_m?}, ... ] }
const commandBodySchema = {
    oneOf: [
        waypointSchema,
        {
            type: "object",
            additionalProperties: false,
            required: ["waypoints"],
            properties: {
                waypoints: {
                    type: "array",
                    minItems: 1,
                    items: waypointSchema,
                },
            },
        },
    ],
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
export default async function apiDronesRoutes(app, _opts) {
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
        const id = req.params?.id;
        const limit = Number(req.query?.limit ?? 200);
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
    // GET /api/drones/:id/path - get drone path (max 300 records)
    app.get("/api/drones/:id/path", {
        schema: {
            tags: ["Drones"],
            summary: "Get drone path points (maximum 300 records, ordered by time ascending).",
            params: {
                type: "object",
                required: ["id"],
                properties: { id: { type: "string" } },
            },
            response: {
                200: dronePathResponseSchema,
                404: {
                    type: "object",
                    properties: { error: { type: "string" } },
                },
            },
        },
    }, async (req, reply) => {
        const id = req.params?.id;
        // Check if drone exists
        const drone = await prisma.drone.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!drone) {
            return reply.status(404).send({ error: "Drone not found" });
        }
        // Get most recent 300 path points, then reverse to show oldest first (for path drawing)
        const rows = await prisma.droneReading.findMany({
            where: { droneId: id },
            orderBy: { ts: "desc" },
            take: 300,
            select: {
                ts: true,
                lat: true,
                lon: true,
                altM: true,
                speedMS: true,
                headingDeg: true,
            },
        });
        // Reverse to show path in chronological order (oldest first)
        const path = rows.reverse();
        return {
            droneId: id,
            count: path.length,
            path,
        };
    });
    // NOTE: move endpoints migrated to OFFENSIVE routes creating Trips.
}
//# sourceMappingURL=api-drones.js.map