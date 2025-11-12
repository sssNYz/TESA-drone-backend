// src/schemas/drone-state.ts
import { z } from "zod";

export const droneStateSchema = z
  .object({
    droneId: z.string(),
    lat: z.number(),
    lon: z.number(),
    alt_m: z.number(),
    speed_m_s: z.number(),
    heading_deg: z.number(),
    battery_pct: z.number().min(0).max(100),
    low_battery: z.boolean().optional(),
    signal_ok: z.boolean(),
    signal_loss_prob: z.number().min(0).max(1),
    ts: z.string(),
  })
  .strict();

export type DroneState = z.infer<typeof droneStateSchema>;




