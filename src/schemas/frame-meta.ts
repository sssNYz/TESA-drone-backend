import { z } from "zod";

const isoTimestamp = z.string().datetime();
const positiveInt = z.number().int().positive();

const bboxTuple = z.tuple([
  z.number().int(),
  z.number().int(),
  z.number().int(),
  z.number().int(),
]);

export const frameMetaSchema = z
  .object({
    kind: z.literal("frame_meta"),
    frame_id: z.number().int().nonnegative(),
    timestamp: isoTimestamp,
    source_id: z.string().min(1),
    image_info: z
      .object({
        mime: z.string().min(1),
        width: positiveInt,
        height: positiveInt,
        quality: z.number().int().min(1).max(100),
      })
      .strict(),
    objects: z.array(
      z
        .object({
          drone_id: z.string().min(1),
          type: z.string().min(1).optional(),
          lat: z.number(),
          lon: z.number(),
          alt_m: z.number(),
          speed_mps: z.number().nullable().optional(),
          bbox: bboxTuple,
          confidence: z.number().min(0).max(1).optional(),
          timestamp: isoTimestamp.optional(),
        })
        .strict(),
    ),
  })
  .strict();

export type FrameMetaPayload = z.infer<typeof frameMetaSchema>;
