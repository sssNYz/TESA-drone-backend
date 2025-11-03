// src/routes/health.ts
import type { FastifyInstance, FastifyPluginOptions } from "fastify";

export default async function healthRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // ใช้ดูว่าตัวเซิร์ฟเวอร์ยังตอบอยู่ไหม
  app.get("/health", async () => ({ ok: true }));

  // ใช้ดู readiness แบบง่าย ๆ (อนาคตค่อยเช็ค DB/MQTT จริง)
  app.get("/ready", async () => ({
    server: "up",
    mqtt: "assumed-up",
    db: "assumed-up",
  }));

  // ตัวอย่าง echo—ส่งอะไรมาก็สะท้อนคืน (ไว้เทส POST/JSON)
  app.post("/echo", async (req, _reply) => {
    return { received: req.body };
  });
}