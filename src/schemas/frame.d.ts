import { z } from "zod";
export declare const frameSchema: z.ZodObject<{
    frame_id: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>;
    timestamp: z.ZodCoercedDate<unknown>;
    source_id: z.ZodString;
    image_base64: z.ZodOptional<z.ZodString>;
    objects: z.ZodArray<z.ZodObject<{
        drone_id: z.ZodString;
        type: z.ZodOptional<z.ZodString>;
        lat: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>;
        lon: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>;
        alt_m: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>;
        speed_mps: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>;
        bbox: z.ZodTuple<[z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>], null>;
        confidence: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNumber>>;
        timestamp: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type FramePayload = z.infer<typeof frameSchema>;
//# sourceMappingURL=frame.d.ts.map