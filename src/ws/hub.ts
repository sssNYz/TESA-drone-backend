// src/ws/hub.ts
type WS = { send: (data: string) => void; readyState: number; on: (e: string, cb: (...a:any[])=>void) => void; };
const clients = new Set<WS>();

export function registerClient(ws: WS) {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
}

export function broadcast(payload: unknown) {
  const msg = JSON.stringify(payload);
  for (const ws of clients) {
    if ((ws as any).readyState === 1) {
      try { ws.send(msg); } catch { /* ignore */ }
    }
  }
}