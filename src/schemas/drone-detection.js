// src/schemas/drone-detection.ts
import { z } from "zod";
export const droneDetectionSchema = z.object({
    drone_id: z.string().min(1),
    timestamp: z.coerce.date(), // ISO 8601
    latitude: z.preprocess(v => typeof v === "string" ? parseFloat(v) : v, z.number()),
    longitude: z.preprocess(v => typeof v === "string" ? parseFloat(v) : v, z.number()),
    altitude_m: z.preprocess(v => typeof v === "string" ? parseFloat(v) : v, z.number()),
    speed_mps: z.preprocess(v => typeof v === "string" ? parseFloat(v) : v, z.number()),
    radius_m: z.preprocess(v => typeof v === "string" ? parseFloat(v) : v, z.number().optional()),
    angle_deg: z.preprocess(v => typeof v === "string" ? parseFloat(v) : v, z.number().optional()),
}).passthrough(); // อนุโลมฟิลด์เกินเพื่ออนาคต
//# sourceMappingURL=drone-detection.js.map