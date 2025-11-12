import { z } from "zod";
export declare const droneStateSchema: z.ZodObject<{
    droneId: z.ZodString;
    lat: z.ZodNumber;
    lon: z.ZodNumber;
    alt_m: z.ZodNumber;
    speed_m_s: z.ZodNumber;
    heading_deg: z.ZodNumber;
    battery_pct: z.ZodNumber;
    low_battery: z.ZodOptional<z.ZodBoolean>;
    signal_ok: z.ZodBoolean;
    signal_loss_prob: z.ZodNumber;
    ts: z.ZodString;
}, z.core.$strict>;
export type DroneState = z.infer<typeof droneStateSchema>;
//# sourceMappingURL=drone-state.d.ts.map