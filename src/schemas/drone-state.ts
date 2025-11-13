// src/schemas/drone-state.ts
import { z } from "zod";

const isoTimestamp = z.string().datetime();

export const droneStateSchema = z
  .object({
    kind: z.literal("drone_state").optional(),
    droneId: z.string().min(1),
    lat: z.number(),
    lon: z.number(),
    alt_m: z.number().optional(),
    speed_m_s: z.number().optional(),
    heading_deg: z.number().optional(),
    battery_pct: z.number().min(0).max(100).optional(),
    signal_ok: z.boolean().optional(),
    signal_loss_prob: z.number().min(0).max(1).optional(),
    ts: isoTimestamp,
  })
  .strict();

export type DroneState = z.infer<typeof droneStateSchema>;


