// src/routes/admin.ts  (แก้ย้อนหลัง/รีโปรเซสแบบง่าย)
import type { FastifyInstance } from "fastify";
import { getRawById } from "../services/raw.js";
import { droneDetectionSchema } from "../schemas/drone-detection.js";
import { saveDroneDetection } from "../services/drone-detections.js";

export default async function adminRoutes(app: FastifyInstance) {
  // reprocess จาก raw id (พร้อม patch บางฟิลด์)
  app.post("/admin/reprocess/:rawId", async (req, reply) => {
    const { rawId } = req.params as { rawId: string };
    const raw = await getRawById(rawId);
    if (!raw) return reply.code(404).send({ ok: false, error: "raw not found" });

    let json: any;
    try { json = JSON.parse(raw.payload); } catch { return reply.code(400).send({ ok:false, error:"invalid raw json" }); }

    const patch = (req.body as any)?.set ?? {};
    const patched = { ...json, ...patch };
    try {
      const d = droneDetectionSchema.parse(patched);
      const id = await saveDroneDetection(d, BigInt(rawId));
      return { ok: true, id: id.toString() };
    } catch (e: any) {
      return reply.code(400).send({ ok: false, error: e?.message ?? String(e) });
    }
  });
}