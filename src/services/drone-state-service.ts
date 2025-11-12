// src/services/drone-state-service.ts
import { prisma } from "../db/prisma.js";
import type { DroneState } from "../schemas/drone-state.js";

export async function upsertDroneAndInsertReading(
  state: DroneState,
  _rawId?: bigint
) {
  const ts = new Date(state.ts);

  // Upsert Drone last-known state
  await prisma.drone.upsert({
    where: { id: state.droneId },
    update: {
      lastSeenAt: new Date(),
      lastLat: state.lat,
      lastLon: state.lon,
      lastAltM: state.alt_m,
      lastSpeedMS: state.speed_m_s,
      lastHeadingDeg: state.heading_deg,
      batteryPct: state.battery_pct,
      signalOk: state.signal_ok,
      signalLossProb: state.signal_loss_prob,
    },
    create: {
      id: state.droneId,
      lastSeenAt: new Date(),
      lastLat: state.lat,
      lastLon: state.lon,
      lastAltM: state.alt_m,
      lastSpeedMS: state.speed_m_s,
      lastHeadingDeg: state.heading_deg,
      batteryPct: state.battery_pct,
      signalOk: state.signal_ok,
      signalLossProb: state.signal_loss_prob,
    },
  });

  // Insert reading
  await prisma.droneReading.create({
    data: {
      droneId: state.droneId,
      ts,
      lat: state.lat,
      lon: state.lon,
      altM: state.alt_m,
      speedMS: state.speed_m_s,
      headingDeg: state.heading_deg,
      batteryPct: state.battery_pct,
      signalOk: state.signal_ok,
      signalLossProb: state.signal_loss_prob,
    },
    select: { id: true },
  });

  // Return normalized payload for WS broadcast
  return {
    droneId: state.droneId,
    lat: state.lat,
    lon: state.lon,
    alt_m: state.alt_m,
    speed_m_s: state.speed_m_s,
    heading_deg: state.heading_deg,
    battery_pct: state.battery_pct,
    signal_ok: state.signal_ok,
    signal_loss_prob: state.signal_loss_prob,
    ts: ts.toISOString(),
  };
}







