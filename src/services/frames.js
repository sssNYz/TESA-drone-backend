import { prisma } from "../db/prisma.js";
// save one frame row
// A2 note: this is frame meta, not each drone
export async function saveFrame(params) {
    // cast any because prisma types may be old before generate
    const rec = await prisma.frame.create({
        data: {
            frameNo: params.frameNo,
            deviceTs: params.deviceTs,
            sourceId: params.sourceId,
            objectsCount: params.objectsCount,
            imageBase64: params.imageBase64 ?? null,
        },
        select: { id: true }
    });
    return rec.id;
}
//# sourceMappingURL=frames.js.map