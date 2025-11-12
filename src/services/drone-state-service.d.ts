import type { DroneState } from "../schemas/drone-state.js";
export declare function upsertDroneAndInsertReading(state: DroneState, _rawId?: bigint): Promise<{
    droneId: string;
    lat: number;
    lon: number;
    alt_m: number;
    speed_m_s: number;
    heading_deg: number;
    battery_pct: number;
    signal_ok: boolean;
    signal_loss_prob: number;
    ts: string;
}>;
//# sourceMappingURL=drone-state-service.d.ts.map