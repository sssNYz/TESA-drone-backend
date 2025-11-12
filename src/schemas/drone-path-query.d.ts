import type { GetDronePathParams } from "../services/Drone/path.js";
export declare class DronePathValidationError extends Error {
    issues?: unknown;
    constructor(message: string, issues?: unknown);
}
export declare function parseDronePathQuery(query: unknown): GetDronePathParams;
//# sourceMappingURL=drone-path-query.d.ts.map