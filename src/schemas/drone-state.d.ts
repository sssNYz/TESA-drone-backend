import { z } from "zod";
export declare const droneStateSchema: z.ZodObject<{
    kind: z.ZodOptional<z.ZodLiteral<"drone_state">>;
    droneId: z.ZodString;
    lat: z.ZodNumber;
    lon: z.ZodNumber;
    alt_m: z.ZodOptional<z.ZodNumber>;
    speed_m_s: z.ZodOptional<z.ZodNumber>;
    heading_deg: z.ZodOptional<z.ZodNumber>;
    battery_pct: z.ZodOptional<z.ZodNumber>;
    signal_ok: z.ZodOptional<z.ZodBoolean>;
    signal_loss_prob: z.ZodOptional<z.ZodNumber>;
    ts: z.ZodString;
}, z.core.$strict>;
export type DroneState = z.infer<typeof droneStateSchema>;
//# sourceMappingURL=drone-state.d.ts.map