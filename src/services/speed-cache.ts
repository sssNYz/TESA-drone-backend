// src/services/speed-cache.ts
import { haversineMeters } from "../utils/haversine.js";

type Sample = { lat: number; lon: number; ts: number };

const lastSamples = new Map<string, Sample>();

const toTimestampMs = (ts: string | Date): number | null => {
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
export function trackAndComputeSpeed(
  droneId: string,
  lat: number,
  lon: number,
  timestamp: string | Date,
): number | undefined {
  const ts = toTimestampMs(timestamp);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || ts === null) {
    return undefined;
  }

  const prev = lastSamples.get(droneId);
  lastSamples.set(droneId, { lat, lon, ts });

  if (!prev) return undefined;
  const deltaSeconds = (ts - prev.ts) / 1000;
  if (deltaSeconds <= 0) return undefined;

  const distance = haversineMeters(prev.lat, prev.lon, lat, lon);
  if (!Number.isFinite(distance)) return undefined;

  return distance / deltaSeconds;
}

export function resetSpeedCache(droneId?: string) {
  if (typeof droneId === "string") {
    lastSamples.delete(droneId);
  } else {
    lastSamples.clear();
  }
}
