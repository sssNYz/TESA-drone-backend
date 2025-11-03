import { z } from "zod";

// simple helper: allow string numbers
const num = z.preprocess(v => typeof v === "string" ? parseFloat(v) : v, z.number());
const int = z.preprocess(v => typeof v === "string" ? parseInt(String(v), 10) : v, z.number().int());

// frame message schema (topic: drones/frames)
export const frameSchema = z.object({
  frame_id: int,                 // frame number
  timestamp: z.coerce.date(),    // time of frame
  source_id: z.string().min(1),  // camera id
  image_base64: z.string().optional(),
  objects: z.array(z.object({
    drone_id: z.string().min(1),
    type: z.string().optional(),
    lat: num,
    lon: num,
    alt_m: num,
    speed_mps: num,
    bbox: z.tuple([int, int, int, int]),
    confidence: num.optional(),
    timestamp: z.coerce.date().optional(),
  })),
});

export type FramePayload = z.infer<typeof frameSchema>;






