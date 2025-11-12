import { getRawById } from "../services/raw.js";
import { droneDetectionSchema } from "../schemas/drone-detection.js";
import { saveDroneDetection } from "../services/drone-detections.js";
const adminReprocessBodySchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        set: {
            type: "object",
            additionalProperties: true,
            description: "Partial payload override merged before validation.",
        },
    },
};
const adminSuccessResponseSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        ok: { type: "boolean", const: true },
        id: { type: "string", description: "Newly created detection ID." },
    },
    required: ["ok", "id"],
};
const adminErrorResponseSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        ok: { type: "boolean", const: false },
        error: { type: "string" },
    },
    required: ["ok", "error"],
};
export default async function adminRoutes(app) {
    // reprocess จาก raw id (พร้อม patch บางฟิลด์)
    app.post("/admin/reprocess/:rawId", {
        schema: {
            tags: ["Admin"],
            summary: "Re-run ingestion logic for a stored raw row.",
            params: {
                type: "object",
                required: ["rawId"],
                properties: {
                    rawId: {
                        type: "string",
                        description: "Raw payload identifier to reprocess.",
                    },
                },
            },
            body: adminReprocessBodySchema,
            response: {
                200: adminSuccessResponseSchema,
                400: adminErrorResponseSchema,
                404: adminErrorResponseSchema,
            },
        },
    }, async (req, reply) => {
        const { rawId } = req.params;
        const raw = await getRawById(rawId);
        if (!raw)
            return reply.code(404).send({ ok: false, error: "raw not found" });
        let json;
        try {
            json = JSON.parse(raw.payload);
        }
        catch {
            return reply.code(400).send({ ok: false, error: "invalid raw json" });
        }
        const patch = req.body?.set ?? {};
        const patched = { ...json, ...patch };
        try {
            const d = droneDetectionSchema.parse(patched);
            const id = await saveDroneDetection(d, BigInt(rawId));
            return { ok: true, id: id.toString() };
        }
        catch (e) {
            return reply.code(400).send({ ok: false, error: e?.message ?? String(e) });
        }
    });
}
//# sourceMappingURL=admin.js.map