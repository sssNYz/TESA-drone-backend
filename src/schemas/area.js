// src/schemas/area.ts
import { z } from "zod";
export const areaPointSchema = z.object({
    lat: z.number().min(-90, "lat must be between -90 and 90").max(90, "lat must be between -90 and 90"),
    lon: z.number().min(-180, "lon must be between -180 and 180").max(180, "lon must be between -180 and 180"),
});
export const createAreaSchema = z.object({
    name: z.string().min(1, "name cannot be empty").max(120, "name must be at most 120 characters"),
    points: z.array(areaPointSchema).min(3, "Provide at least three points to shape an area"),
});
export const areaIdParamSchema = z.object({
    id: z.string().min(1, "id cannot be empty"),
});
//# sourceMappingURL=area.js.map