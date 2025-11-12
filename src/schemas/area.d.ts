import { z } from "zod";
export declare const areaPointSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lon: z.ZodNumber;
}, z.core.$strip>;
export declare const createAreaSchema: z.ZodObject<{
    name: z.ZodString;
    points: z.ZodArray<z.ZodObject<{
        lat: z.ZodNumber;
        lon: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const areaIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export type AreaPoint = z.infer<typeof areaPointSchema>;
export type CreateAreaInput = z.infer<typeof createAreaSchema>;
//# sourceMappingURL=area.d.ts.map