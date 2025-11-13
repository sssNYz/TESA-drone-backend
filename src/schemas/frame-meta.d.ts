import { z } from "zod";
export declare const frameMetaSchema: z.ZodObject<{
    kind: z.ZodLiteral<"frame_meta">;
    frame_id: z.ZodNumber;
    timestamp: z.ZodString;
    source_id: z.ZodString;
    image_info: z.ZodObject<{
        mime: z.ZodString;
        width: z.ZodNumber;
        height: z.ZodNumber;
        quality: z.ZodNumber;
    }, z.core.$strict>;
    objects: z.ZodArray<z.ZodObject<{
        drone_id: z.ZodString;
        type: z.ZodOptional<z.ZodString>;
        lat: z.ZodNumber;
        lon: z.ZodNumber;
        alt_m: z.ZodNumber;
        speed_mps: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        bbox: z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>;
        confidence: z.ZodOptional<z.ZodNumber>;
        timestamp: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type FrameMetaPayload = z.infer<typeof frameMetaSchema>;
//# sourceMappingURL=frame-meta.d.ts.map