// src/schemas/drone-path-query.ts
import { z } from "zod";
const baseSchema = z.object({
    drone_ids: z.string().min(1, "drone_ids is required"),
    start: z.string().min(1, "start is required"),
    end: z.string().min(1, "end is required"),
});
export class DronePathValidationError extends Error {
    issues;
    constructor(message, issues) {
        super(message);
        this.name = "DronePathValidationError";
        this.issues = issues;
    }
}
export function parseDronePathQuery(query) {
    const parsed = baseSchema.safeParse(query ?? {});
    if (!parsed.success) {
        throw new DronePathValidationError("Invalid query parameters", parsed.error.flatten());
    }
    const droneIds = parsed.data.drone_ids
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    if (!droneIds.length) {
        throw new DronePathValidationError("drone_ids must include at least one drone name");
    }
    const start = new Date(parsed.data.start);
    const end = new Date(parsed.data.end);
    if (Number.isNaN(start.getTime())) {
        throw new DronePathValidationError("start must be a valid ISO date string");
    }
    if (Number.isNaN(end.getTime())) {
        throw new DronePathValidationError("end must be a valid ISO date string");
    }
    if (start > end) {
        throw new DronePathValidationError("start must be earlier than end");
    }
    return { droneIds, start, end };
}
//# sourceMappingURL=drone-path-query.js.map