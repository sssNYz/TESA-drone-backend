// src/ws/hub.ts
import type { FastifyRequest } from "fastify";
import type { RawData, WebSocket } from "ws";
import { frameMetaSchema, type FrameMetaPayload } from "../schemas/frame-meta.js";
import { droneStateSchema } from "../schemas/drone-state.js";
import { trackAndComputeSpeed } from "../services/speed-cache.js";
import { saveFrame } from "../services/frames.js";
import { saveDroneDetectionFromFrame } from "../services/drone-detections.js";
import { prisma } from "../db/prisma.js";
import { upsertDroneAndInsertReading } from "../services/drone-state-service.js";

type Role = "pi" | "front" | "unknown";

type FrameObject = FrameMetaPayload["objects"][number];

type BroadcastFrameObject = FrameObject & {
  timestamp: string;
  speed_m_s?: number;
};

type BroadcastFrameMeta = Omit<FrameMetaPayload, "objects"> & {
  objects: BroadcastFrameObject[];
};

type ClientContext = {
  id: string;
  role: Role;
  socket: WebSocket;
  pendingFrames: BroadcastFrameMeta[];
  latestPerSource: Map<string, { frameId: number; meta: BroadcastFrameMeta; prismaFrameId?: bigint }>;
  hasBackpressure: boolean;
};

const clients = new Set<ClientContext>();
const FRONT_BACKPRESSURE_THRESHOLD =
  Number(process.env.WS_FRONT_MAX_BUFFER ?? 2 * 1024 * 1024);

const WS_READY_STATE_OPEN = 1;

export function registerClient(socket: WebSocket, req: FastifyRequest) {
  const role = normalizeRole((req.query as { role?: string } | undefined)?.role);
  const ctx: ClientContext = {
    id: `ws-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role,
    socket,
    pendingFrames: [],
    latestPerSource: new Map(),
    hasBackpressure: false,
  };

  clients.add(ctx);
  console.log("🔌 WS connected", { id: ctx.id, role: ctx.role });

  socket.on("close", () => handleDisconnect(ctx));
  socket.on("error", () => handleDisconnect(ctx));
  socket.on("message", (data, isBinary) => handleMessage(ctx, data, isBinary));

  safeSend(ctx, JSON.stringify({ type: "hello", role, ok: true }));
}

export function broadcast(payload: unknown) {
  const message = JSON.stringify(payload);
  for (const client of clients) {
    if (client.role !== "front") continue;
    safeSend(client, message);
  }
}

function handleDisconnect(ctx: ClientContext) {
  if (clients.has(ctx)) {
    clients.delete(ctx);
    ctx.pendingFrames.length = 0;
    ctx.latestPerSource.clear();
    console.log("🔌 WS disconnected", { id: ctx.id, role: ctx.role });
  }
}

function handleMessage(ctx: ClientContext, data: RawData, isBinary: boolean) {
  if (ctx.role === "front") {
    // front clients are read-only
    return;
  }

  if (isBinary) {
    handleBinaryFrame(ctx, data);
    return;
  }

  const text = typeof data === "string" ? data : data.toString();
  handleJsonMessage(ctx, text);
}

async function handleBinaryFrame(ctx: ClientContext, data: RawData) {
  if (ctx.role !== "pi") {
    console.warn("⚠️ Binary payload from non-pi client dropped", { id: ctx.id });
    return;
  }
  const frame = ctx.pendingFrames.shift();
  if (!frame) {
    console.warn("⚠️ Dropped binary frame without pending meta", { id: ctx.id });
    return;
  }

  ctx.latestPerSource.delete(frame.source_id);
  const buffer = toBuffer(data);
  console.log("📦 frame_binary", {
    id: ctx.id,
    role: ctx.role,
    source_id: frame.source_id,
    frame_id: frame.frame_id,
    bytes: buffer.length,
  });
  try {
    // Try to find prisma frame id, prefer cached mapping
    let prismaFrameId = undefined as undefined | bigint;
    const cached = ctx.latestPerSource.get(frame.source_id);
    if (cached && cached.frameId === frame.frame_id && cached.prismaFrameId) {
      prismaFrameId = cached.prismaFrameId;
    } else {
      // fallback: look up by (sourceId, frameNo, deviceTs ~ frame.timestamp)
      const maybe = await prisma.frame.findFirst({
        where: { sourceId: frame.source_id, frameNo: frame.frame_id },
        orderBy: { id: "desc" },
        select: { id: true },
      });
      if (maybe) prismaFrameId = maybe.id as unknown as bigint;
    }
    if (prismaFrameId) {
      await (prisma as any).frameBinary.create({
        data: {
          frameId: prismaFrameId,
          mime: "image/jpeg",
          bytes: buffer,
          size: buffer.length,
        },
        select: { id: true },
      });
    }
  } catch (err: any) {
    console.warn("⚠️ failed to store frame binary", { error: err?.message });
  }

  broadcastFrameMetaBinary(frame, buffer);
}

function handleJsonMessage(ctx: ClientContext, raw: string) {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn("⚠️ Invalid JSON from WS client", { id: ctx.id });
    return;
  }

  if (parsed?.kind === "frame_meta") {
    processFrameMeta(ctx, parsed);
    return;
  }

  if (parsed?.kind === "drone_state") {
    processDroneState(parsed, ctx);
    return;
  }

  console.warn("⚠️ Unsupported WS payload", { id: ctx.id, kind: parsed?.kind });
}

async function processFrameMeta(ctx: ClientContext, payload: unknown) {
  if (ctx.role !== "pi") {
    console.warn("⚠️ frame_meta ignored for non-pi client", { id: ctx.id });
    return;
  }
  try {
    const meta = frameMetaSchema.parse(payload);
    // Persist frame and detections
    const frameId = await saveFrame({
      frameNo: meta.frame_id,
      deviceTs: new Date(meta.timestamp),
      sourceId: meta.source_id,
      objectsCount: meta.objects.length,
    });

    for (const obj of meta.objects) {
      try {
        const speed =
          typeof (obj as any).speed_mps === "number"
            ? (obj as any).speed_mps
            : typeof (obj as any).speed_m_s === "number"
            ? (obj as any).speed_m_s
            : 0;
        const detParams: {
          droneId: string;
          deviceTs: Date;
          lat: number;
          lon: number;
          altM: number;
          speedMps: number;
          sourceId: string;
          type?: string;
          confidence?: number;
          bbox?: [number, number, number, number];
          frameId?: bigint;
          rawId?: bigint;
        } = {
          droneId: obj.drone_id,
          deviceTs: obj.timestamp ? new Date(obj.timestamp) : new Date(meta.timestamp),
          lat: obj.lat,
          lon: obj.lon,
          altM: obj.alt_m,
          speedMps: speed,
          sourceId: meta.source_id,
          frameId: BigInt(frameId),
        };
        if (typeof obj.type === "string") detParams.type = obj.type;
        if (typeof obj.confidence === "number") detParams.confidence = obj.confidence;
        if (obj.bbox) detParams.bbox = obj.bbox as any;
        await saveDroneDetectionFromFrame(detParams);
      } catch (e: any) {
        console.warn("⚠️ save detection failed", { error: e?.message });
      }
    }

    const enriched = enrichFrameMeta(meta);
    ctx.pendingFrames.push(enriched);
    ctx.latestPerSource.set(enriched.source_id, {
      frameId: enriched.frame_id,
      meta: enriched,
      prismaFrameId: BigInt(frameId),
    });

    console.log("📥 frame_meta", {
      id: ctx.id,
      role: ctx.role,
      source_id: enriched.source_id,
      frame_id: enriched.frame_id,
      objects: enriched.objects.length,
    });
    broadcastFrameMeta(enriched);
  } catch (err: any) {
    console.warn("⚠️ frame_meta rejected", { id: ctx.id, error: err?.message });
  }
}

async function processDroneState(payload: unknown, ctx?: ClientContext) {
  try {
    const { kind: _kind, ...state } = droneStateSchema.parse(payload);
    const computed = trackAndComputeSpeed(
      state.droneId,
      state.lat,
      state.lon,
      state.ts,
    );
    try {
      await upsertDroneAndInsertReading({
        droneId: state.droneId,
        lat: state.lat,
        lon: state.lon,
        alt_m: (state as any).alt_m,
        speed_m_s: (state as any).speed_m_s ?? (typeof computed === "number" ? computed : undefined),
        heading_deg: (state as any).heading_deg,
        battery_pct: (state as any).battery_pct,
        signal_ok: (state as any).signal_ok,
        signal_loss_prob: (state as any).signal_loss_prob,
        ts: state.ts,
      } as any);
    } catch (err: any) {
      console.warn("⚠️ persist drone_state failed", { error: err?.message });
    }
    broadcast({
      ...state,
      ...(typeof computed === "number" ? { speed_m_s: computed } : {}),
    });
  } catch (err: any) {
    console.warn("⚠️ drone_state rejected", {
      error: err?.message,
      id: ctx?.id,
    });
  }
}

function enrichFrameMeta(meta: FrameMetaPayload): BroadcastFrameMeta {
  const objects = meta.objects.map((obj) => {
    const objTs = obj.timestamp ?? meta.timestamp;
    const speed = trackAndComputeSpeed(obj.drone_id, obj.lat, obj.lon, objTs);
    const enriched: BroadcastFrameObject = {
      ...obj,
      timestamp: objTs,
    };
    if (typeof speed === "number") enriched.speed_m_s = speed;
    return enriched;
  });

  return { ...meta, objects };
}

function broadcastFrameMeta(meta: BroadcastFrameMeta) {
  const message = JSON.stringify(meta);
  for (const client of clients) {
    if (client.role !== "front") continue;
    safeSend(client, message);
  }
}

function broadcastFrameMetaBinary(meta: BroadcastFrameMeta, buffer: Buffer) {
  for (const client of clients) {
    if (client.role !== "front") continue;
    if (!canSend(client)) continue;
    try {
      client.socket.send(buffer, { binary: true });
    } catch (err) {
      console.warn("⚠️ WS send failed", { id: client.id, error: (err as any)?.message });
      handleDisconnect(client);
    }
  }
}

function safeSend(ctx: ClientContext, payload: string) {
  if (!canSend(ctx)) return;
  try {
    ctx.socket.send(payload);
  } catch (err) {
    console.warn("⚠️ WS send failed", { id: ctx.id, error: (err as any)?.message });
    handleDisconnect(ctx);
  }
}

function canSend(ctx: ClientContext) {
  if (ctx.socket.readyState !== WS_READY_STATE_OPEN) {
    return false;
  }

  if (ctx.socket.bufferedAmount > FRONT_BACKPRESSURE_THRESHOLD) {
    if (!ctx.hasBackpressure) {
      ctx.hasBackpressure = true;
      console.warn("⚠️ Skipping WS client due to backpressure", { id: ctx.id });
    }
    return false;
  }

  if (
    ctx.hasBackpressure &&
    ctx.socket.bufferedAmount < FRONT_BACKPRESSURE_THRESHOLD / 2
  ) {
    ctx.hasBackpressure = false;
  }

  return true;
}

function normalizeRole(role?: string | null): Role {
  if (role === "pi") return "pi";
  if (role === "front") return "front";
  return "unknown";
}

function toBuffer(data: RawData): Buffer {
  if (typeof data === "string") return Buffer.from(data);
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  return Buffer.concat(data);
}
