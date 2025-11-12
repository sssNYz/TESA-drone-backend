const readinessResponse = {
    type: "object",
    additionalProperties: false,
    properties: {
        server: { type: "string" },
        mqtt: { type: "string" },
        db: { type: "string" },
    },
};
export default async function healthRoutes(app, _opts) {
    // ใช้ดูว่าตัวเซิร์ฟเวอร์ยังตอบอยู่ไหม
    app.get("/health", {
        schema: {
            tags: ["Health"],
            summary: "Simple liveness probe.",
            response: {
                200: {
                    type: "object",
                    additionalProperties: false,
                    properties: { ok: { type: "boolean" } },
                },
            },
        },
    }, async () => ({ ok: true }));
    // ใช้ดู readiness แบบง่าย ๆ (อนาคตค่อยเช็ค DB/MQTT จริง)
    app.get("/ready", {
        schema: {
            tags: ["Health"],
            summary: "Readiness probe (best-effort placeholders for now).",
            response: { 200: readinessResponse },
        },
    }, async () => ({
        server: "up",
        mqtt: "assumed-up",
        db: "assumed-up",
    }));
    // ตัวอย่าง echo—ส่งอะไรมาก็สะท้อนคืน (ไว้เทส POST/JSON)
    app.post("/echo", {
        schema: {
            tags: ["Health"],
            summary: "Debug helper that echos JSON payloads.",
            body: {
                type: "object",
                additionalProperties: true,
                description: "Any JSON payload to echo back.",
            },
            response: {
                200: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        received: {
                            type: "object",
                            additionalProperties: true,
                        },
                    },
                },
            },
        },
    }, async (req) => {
        return { received: req.body };
    });
}
//# sourceMappingURL=health.js.map