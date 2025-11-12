import type { Area, AreaKind } from "@prisma/client";
import type { AreaPoint } from "../schemas/area.js";
export interface CreateAreaParams {
    name: string;
    points: AreaPoint[];
    kind: AreaKind;
}
export declare function createArea(params: CreateAreaParams): Promise<Area>;
export declare function listAreas(kind?: AreaKind): Promise<Area[]>;
export declare function deleteAreaById(id: string, kind?: AreaKind): Promise<boolean>;
//# sourceMappingURL=areas.d.ts.map