import { prisma } from "../db/prisma.js";
const frameSummarySchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        id: { type: "string" },
        frameNo: { type: "integer" },
        deviceTs: { type: "string", format: "date-time" },
        sourceId: { type: "string" },
        objectsCount: { type: "integer" },
        hasImage: { type: "boolean" },
    },
    required: ["id", "frameNo", "deviceTs", "sourceId", "objectsCount", "hasImage"],
};
const frameListSchema = {
    type: "array",
    items: frameSummarySchema,
};
const detectionSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        id: { type: "string" },
        droneId: { type: "string" },
        deviceTs: { type: "string", format: "date-time" },
        lat: { type: "number" },
        lon: { type: "number" },
        altM: { type: ["number", "null"] },
        speedMps: { type: ["number", "null"] },
        type: { type: ["string", "null"] },
        confidence: { type: ["number", "null"] },
        bbox: {
            anyOf: [
                { type: "null" },
                { type: "array", items: { type: "integer" }, minItems: 4, maxItems: 4 },
            ],
        },
    },
};
const frameDetailSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        id: { type: "string" },
        frameNo: { type: "integer" },
        deviceTs: { type: "string", format: "date-time" },
        sourceId: { type: "string" },
        objectsCount: { type: "integer" },
        hasImage: { type: "boolean" },
        detections: { type: "array", items: detectionSchema },
    },
    required: ["id", "frameNo", "deviceTs", "sourceId", "objectsCount", "hasImage", "detections"],
};
export default async function wsDroneRoutes(app, _opts) {
    // List frames (recent first)
    app.get("/api/wsdrones/frames", {
        schema: {
            tags: ["WS-Drone"],
            summary: "List frames ingested over WebSocket.",
            querystring: {
                type: "object",
                properties: {
                    sourceId: { type: "string" },
                    limit: { type: "integer", minimum: 1, maximum: 500, default: 50 },
                },
            },
            response: { 200: frameListSchema },
        },
    }, async (req) => {
        const qs = req.query || {};
        const where = qs.sourceId ? { sourceId: qs.sourceId } : {};
        const limit = Number.isFinite(qs.limit) ? Math.max(1, Math.min(Number(qs.limit), 500)) : 50;
        const rows = await prisma.frame.findMany({
            where,
            orderBy: { deviceTs: "desc" },
            take: limit,
            select: { id: true, frameNo: true, deviceTs: true, sourceId: true, objectsCount: true },
        });
        const withImageFlags = await Promise.all(rows.map(async (r) => {
            const hasImage = (await prisma.frameBinary.count({ where: { frameId: r.id } })) > 0;
            return { id: r.id.toString(), frameNo: r.frameNo, deviceTs: r.deviceTs.toISOString(), sourceId: r.sourceId, objectsCount: r.objectsCount, hasImage };
        }));
        return withImageFlags;
    });
    // Frame detail with detections
    app.get("/api/wsdrones/frames/:id", {
        schema: {
            tags: ["WS-Drone"],
            summary: "Get frame detail and detections.",
            params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
            response: { 200: frameDetailSchema, 404: { type: "object", properties: { error: { type: "string" } } } },
        },
    }, async (req, reply) => {
        const id = req.params.id;
        const bid = BigInt(id);
        const frame = await prisma.frame.findUnique({ where: { id: bid }, select: { id: true, frameNo: true, deviceTs: true, sourceId: true, objectsCount: true } });
        if (!frame)
            return reply.status(404).send({ error: "Frame not found" });
        const hasImage = (await prisma.frameBinary.count({ where: { frameId: frame.id } })) > 0;
        const dets = await prisma.droneDetection.findMany({
            where: { frameId: frame.id },
            orderBy: { id: "asc" },
            select: { id: true, droneId: true, deviceTs: true, latDeg: true, lonDeg: true, altM: true, speedMps: true, type: true, confidence: true, bboxX: true, bboxY: true, bboxW: true, bboxH: true },
        });
        const detections = dets.map((d) => ({
            id: d.id.toString(),
            droneId: d.droneId,
            deviceTs: d.deviceTs.toISOString(),
            lat: d.latDeg,
            lon: d.lonDeg,
            altM: d.altM ?? null,
            speedMps: d.speedMps ?? null,
            type: d.type ?? null,
            confidence: d.confidence ?? null,
            bbox: d.bboxX == null ? null : [d.bboxX, d.bboxY, d.bboxW, d.bboxH],
        }));
        return {
            id: frame.id.toString(),
            frameNo: frame.frameNo,
            deviceTs: frame.deviceTs.toISOString(),
            sourceId: frame.sourceId,
            objectsCount: frame.objectsCount,
            hasImage,
            detections,
        };
    });
    // Frame image bytes
    app.get("/api/wsdrones/frames/:id/image", {
        schema: {
            tags: ["WS-Drone"],
            summary: "Get frame image bytes (if present).",
            params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
            response: {
                200: { type: "string", description: "binary image", contentMediaType: "application/octet-stream" },
                404: { type: "object", properties: { error: { type: "string" } } },
            },
        },
    }, async (req, reply) => {
        const id = req.params.id;
        const bid = BigInt(id);
        const row = await prisma.frameBinary.findFirst({ where: { frameId: bid }, orderBy: { id: "desc" }, select: { bytes: true, mime: true } });
        if (!row)
            return reply.status(404).send({ error: "Image not found" });
        reply.type(row.mime);
        return Buffer.from(row.bytes);
    });
}
//# sourceMappingURL=ws-drone.js.map