import type { DroneState } from "../schemas/drone-state.js";
type PersistedDroneState = Omit<DroneState, "kind">;
export declare function upsertDroneAndInsertReading(state: PersistedDroneState, _rawId?: bigint): Promise<{
    droneId: string;
    lat: number;
    lon: number;
    alt_m: number;
    speed_m_s: number | undefined;
    heading_deg: number;
    battery_pct: number;
    signal_ok: boolean;
    signal_loss_prob: number;
    ts: string;
}>;
export {};
//# sourceMappingURL=drone-state-service.d.ts.map