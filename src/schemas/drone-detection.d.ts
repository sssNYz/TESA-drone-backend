import { z } from "zod";
export declare const droneDetectionSchema: z.ZodObject<{
    drone_id: z.ZodString;
    timestamp: z.ZodCoercedDate<unknown>;
    latitude: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>;
    longitude: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>;
    altitude_m: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>;
    speed_mps: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>;
    radius_m: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>;
    angle_deg: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>;
}, z.core.$loose>;
export type DroneDetection = z.infer<typeof droneDetectionSchema>;
//# sourceMappingURL=drone-detection.d.ts.map