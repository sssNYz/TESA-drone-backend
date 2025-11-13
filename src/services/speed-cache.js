// src/services/speed-cache.ts
import { haversineMeters } from "../utils/haversine.js";
const lastSamples = new Map();
const toTimestampMs = (ts) => {
    if (typeof ts === "string") {
        const parsed = Date.parse(ts);
        return Number.isFinite(parsed) ? parsed : null;
    }
    const ms = ts.getTime();
    return Number.isFinite(ms) ? ms : null;
};
/**
 * Track the most recent reading for a drone and return the computed speed.
 */
export function trackAndComputeSpeed(droneId, lat, lon, timestamp) {
    const ts = toTimestampMs(timestamp);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || ts === null) {
        return undefined;
    }
    const prev = lastSamples.get(droneId);
    lastSamples.set(droneId, { lat, lon, ts });
    if (!prev)
        return undefined;
    const deltaSeconds = (ts - prev.ts) / 1000;
    if (deltaSeconds <= 0)
        return undefined;
    const distance = haversineMeters(prev.lat, prev.lon, lat, lon);
    if (!Number.isFinite(distance))
        return undefined;
    return distance / deltaSeconds;
}
export function resetSpeedCache(droneId) {
    if (typeof droneId === "string") {
        lastSamples.delete(droneId);
    }
    else {
        lastSamples.clear();
    }
}
//# sourceMappingURL=speed-cache.js.map