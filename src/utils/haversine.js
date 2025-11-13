// src/utils/haversine.ts
const EARTH_RADIUS_M = 6371000; // mean Earth radius in meters
const toRad = (deg) => (deg * Math.PI) / 180;
/**
 * Compute distance between two lat/lon pairs using the haversine formula.
 */
export function haversineMeters(lat1, lon1, lat2, lon2) {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_M * c;
}
//# sourceMappingURL=haversine.js.map