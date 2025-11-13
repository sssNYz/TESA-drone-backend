// src/services/drone-state-service.ts
import { prisma } from "../db/prisma.js";
const numberOr = (value, fallback) => typeof value === "number" ? value : fallback;
export async function upsertDroneAndInsertReading(state, _rawId) {
    const ts = new Date(state.ts);
    const normalized = {
        alt_m: numberOr(state.alt_m, 0),
        speed_m_s: numberOr(state.speed_m_s, 0),
        heading_deg: numberOr(state.heading_deg, 0),
        battery_pct: numberOr(state.battery_pct, 100),
        signal_ok: state.signal_ok ?? true,
        signal_loss_prob: numberOr(state.signal_loss_prob, 0),
    };
    // Upsert Drone last-known state
    await prisma.drone.upsert({
        where: { id: state.droneId },
        update: {
            lastSeenAt: new Date(),
            lastLat: state.lat,
            lastLon: state.lon,
            lastAltM: normalized.alt_m,
            lastSpeedMS: normalized.speed_m_s,
            lastHeadingDeg: normalized.heading_deg,
            batteryPct: normalized.battery_pct,
            signalOk: normalized.signal_ok,
            signalLossProb: normalized.signal_loss_prob,
        },
        create: {
            id: state.droneId,
            lastSeenAt: new Date(),
            lastLat: state.lat,
            lastLon: state.lon,
            lastAltM: normalized.alt_m,
            lastSpeedMS: normalized.speed_m_s,
            lastHeadingDeg: normalized.heading_deg,
            batteryPct: normalized.battery_pct,
            signalOk: normalized.signal_ok,
            signalLossProb: normalized.signal_loss_prob,
        },
    });
    // Find active trip (if any) covering this timestamp
    const activeTrip = await prisma.trip.findFirst({
        where: {
            droneId: state.droneId,
            startsAt: { lte: ts },
            estimatedEndAt: { gte: ts },
        },
        orderBy: { startsAt: "desc" },
        select: { id: true },
    });
    // Insert reading
    await prisma.droneReading.create({
        data: {
            droneId: state.droneId,
            ts,
            lat: state.lat,
            lon: state.lon,
            altM: normalized.alt_m,
            speedMS: normalized.speed_m_s,
            headingDeg: normalized.heading_deg,
            batteryPct: normalized.battery_pct,
            signalOk: normalized.signal_ok,
            signalLossProb: normalized.signal_loss_prob,
            ...(activeTrip ? { tripId: activeTrip.id } : {}),
        },
        select: { id: true },
    });
    // Return normalized payload for WS broadcast
    return {
        droneId: state.droneId,
        lat: state.lat,
        lon: state.lon,
        alt_m: normalized.alt_m,
        speed_m_s: state.speed_m_s,
        heading_deg: normalized.heading_deg,
        battery_pct: normalized.battery_pct,
        signal_ok: normalized.signal_ok,
        signal_loss_prob: normalized.signal_loss_prob,
        ts: ts.toISOString(),
    };
}
//# sourceMappingURL=drone-state-service.js.map