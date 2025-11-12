import { prisma } from "../db/prisma.js";
export async function createArea(params) {
    return prisma.area.create({
        data: {
            name: params.name,
            kind: params.kind,
            points: normalizePoints(params.points),
        },
    });
}
export async function listAreas(kind) {
    return prisma.area.findMany({
        ...(kind ? { where: { kind } } : {}),
        orderBy: { createdAt: "desc" },
    });
}
export async function deleteAreaById(id, kind) {
    const result = await prisma.area.deleteMany({
        where: {
            id,
            ...(kind ? { kind } : {}),
        },
    });
    return result.count > 0;
}
function normalizePoints(points) {
    return points.map((point) => ({
        lat: point.lat,
        lon: point.lon,
    }));
}
//# sourceMappingURL=areas.js.map