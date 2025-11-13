// src/services/trips.ts
import { prisma } from "../db/prisma.js";
import { haversineMeters } from "../utils/haversine.js";
import { mqttClient } from "../mqtt/client.js";
import { getConfig } from "../config/config-service.js";
const DEFAULT_SPEED_MS = 10; // fallback speed if unknown
function normalizeWaypoints(waypoints) {
    return waypoints.map((w) => ({
        lat: Number(w.lat),
        lon: Number(w.lon),
        ...(w.alt_m !== undefined ? { alt_m: Number(w.alt_m) } : {}),
    }));
}
function computePlannedSeconds(waypoints, speedMS, currentStart) {
    const s = Math.max(0.1, speedMS);
    // Per requirement: use first and last lat/lon to compute distance/time
    // If single waypoint and currentStart provided, use currentStart -> single waypoint
    let from;
    let to;
    if (waypoints.length === 1 && currentStart != null) {
        const cs = currentStart; // narrowed
        const only = waypoints[0];
        from = { lat: cs.lat, lon: cs.lon };
        to = { lat: only.lat, lon: only.lon };
    }
    else if (waypoints.length >= 2) {
        const first = waypoints[0];
        const last = waypoints[waypoints.length - 1];
        from = { lat: first.lat, lon: first.lon };
        to = { lat: last.lat, lon: last.lon };
    }
    else if (waypoints.length === 1) {
        // No current start provided; zero-length plan
        const only = waypoints[0];
        from = { lat: only.lat, lon: only.lon };
        to = { lat: only.lat, lon: only.lon };
    }
    else {
        throw new Error("waypoints must be non-empty");
    }
    const distM = haversineMeters(from.lat, from.lon, to.lat, to.lon);
    const seconds = Math.round(distM / s);
    return { seconds, from, to };
}
export async function createTrip(droneId, waypoints, options) {
    if (!droneId)
        throw new Error("droneId required");
    if (!Array.isArray(waypoints) || waypoints.length === 0)
        throw new Error("waypoints must be non-empty");
    const normalized = normalizeWaypoints(waypoints);
    // Determine speed: explicit > drone.lastSpeedMS > default
    const drone = await prisma.drone.findUnique({ where: { id: droneId }, select: { lastLat: true, lastLon: true, lastSpeedMS: true } });
    const speedMS = Number(options?.speedMS ?? (drone?.lastSpeedMS ?? DEFAULT_SPEED_MS)) || DEFAULT_SPEED_MS;
    const now = new Date();
    const currentStart = options?.useCurrentAsStart && drone?.lastLat != null && drone?.lastLon != null
        ? { lat: drone.lastLat, lon: drone.lastLon }
        : undefined;
    const { seconds: estimatedSeconds } = computePlannedSeconds(normalized, speedMS, currentStart);
    const estimatedEndAt = new Date(now.getTime() + estimatedSeconds * 1000);
    const created = await prisma.trip.create({
        data: {
            droneId,
            waypoints: normalized,
            speedMS,
            startsAt: now,
            estimatedSeconds,
            estimatedEndAt,
        },
        select: {
            id: true,
            droneId: true,
            waypoints: true,
            startsAt: true,
            estimatedEndAt: true,
            estimatedSeconds: true,
        },
    });
    // Sync existing readings within the planned window
    await prisma.droneReading.updateMany({
        where: {
            droneId,
            ts: { gte: created.startsAt, lte: created.estimatedEndAt },
        },
        data: { tripId: created.id },
    });
    const readings = await prisma.droneReading.findMany({
        where: { droneId, tripId: created.id },
        orderBy: { ts: "asc" },
        select: { ts: true, lat: true, lon: true },
    });
    // Send MQTT move command to the drone (first waypoint only)
    try {
        const { armyPrefix } = getConfig();
        const first = normalized[0];
        const topic = `${armyPrefix}${droneId}/move/lat/long`;
        const payload = JSON.stringify({
            lat: first.lat,
            lon: first.lon,
            speed_m_s: speedMS,
        });
        mqttClient.publish(topic, payload);
        console.log("📤 Published move command", { topic, payload });
    }
    catch (e) {
        console.error("❌ Failed to publish MQTT move command:", e?.message ?? e);
    }
    return {
        id: created.id.toString(),
        droneId: created.droneId,
        waypoints: created.waypoints,
        actualPath: readings.map((r) => ({ ts: r.ts.toISOString(), lat: r.lat, lon: r.lon })),
        startsAt: created.startsAt.toISOString(),
        estimatedEndAt: created.estimatedEndAt.toISOString(),
        estimatedSeconds: created.estimatedSeconds,
    };
}
export async function listTrips() {
    const rows = await prisma.trip.findMany({
        orderBy: { startsAt: "desc" },
        select: {
            id: true,
            droneId: true,
            startsAt: true,
            estimatedEndAt: true,
            estimatedSeconds: true,
            waypoints: true,
        },
    });
    return rows.map((t) => ({
        id: t.id.toString(),
        droneId: t.droneId,
        startsAt: t.startsAt.toISOString(),
        estimatedEndAt: t.estimatedEndAt.toISOString(),
        estimatedSeconds: t.estimatedSeconds,
        waypointCount: Array.isArray(t.waypoints) ? t.waypoints.length : 0,
    }));
}
export async function getTripDetail(id) {
    const bid = typeof id === "string" ? BigInt(id) : BigInt(id);
    const t = await prisma.trip.findUnique({
        where: { id: bid },
        select: {
            id: true,
            droneId: true,
            waypoints: true,
            startsAt: true,
            estimatedEndAt: true,
            estimatedSeconds: true,
        },
    });
    if (!t)
        return null;
    const readings = await prisma.droneReading.findMany({
        where: { droneId: t.droneId, tripId: t.id },
        orderBy: { ts: "asc" },
        select: { ts: true, lat: true, lon: true },
    });
    return {
        id: t.id.toString(),
        droneId: t.droneId,
        waypoints: t.waypoints,
        actualPath: readings.map((r) => ({ ts: r.ts.toISOString(), lat: r.lat, lon: r.lon })),
        startsAt: t.startsAt.toISOString(),
        estimatedEndAt: t.estimatedEndAt.toISOString(),
        estimatedSeconds: t.estimatedSeconds,
    };
}
//# sourceMappingURL=trips.js.map